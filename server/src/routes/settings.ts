/**
 * Settings Routes
 * User preferences and account settings
 */

import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/init';
import { authMiddleware, AuthRequest } from '../middleware/auth';

export const settingsRouter = Router();

settingsRouter.use(authMiddleware);

// =============================================================================
// GET SETTINGS
// =============================================================================

settingsRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const user = db.prepare(
      'SELECT settings FROM users WHERE id = ?'
    ).get(req.user?.userId) as any;

    const settings = user?.settings ? JSON.parse(user.settings) : {
      theme: 'dark',
      autoLockTimeout: 5,
      clipboardTimeout: 30,
      showPasswordStrength: true,
      defaultPasswordLength: 16,
      defaultPasswordOptions: {
        uppercase: true,
        lowercase: true,
        numbers: true,
        symbols: true,
      },
      biometricEnabled: false,
      compactView: false,
    };

    res.json({ settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to retrieve settings' });
  }
});

// =============================================================================
// UPDATE SETTINGS
// =============================================================================

settingsRouter.put('/', async (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const settings = JSON.stringify(req.body);
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE users SET settings = ?, updated_at = ? WHERE id = ?
    `).run(settings, now, req.user?.userId);

    res.json({ message: 'Settings updated', settings: req.body });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// =============================================================================
// GET AUDIT LOG
// =============================================================================

settingsRouter.get('/audit-log', async (req: AuthRequest, res: Response) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const db = getDatabase();

    const logs = db.prepare(`
      SELECT id, action, entity_type, entity_id, ip_address, created_at
      FROM audit_log
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(req.user?.userId, Number(limit), Number(offset));

    const total = db.prepare(
      'SELECT COUNT(*) as count FROM audit_log WHERE user_id = ?'
    ).get(req.user?.userId) as any;

    res.json({ logs, total: total?.count || 0 });
  } catch (error) {
    console.error('Get audit log error:', error);
    res.status(500).json({ error: 'Failed to retrieve audit log' });
  }
});

// =============================================================================
// GET SESSIONS
// =============================================================================

settingsRouter.get('/sessions', async (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();

    const sessions = db.prepare(`
      SELECT id, device_info, ip_address, created_at, last_activity, expires_at
      FROM sessions
      WHERE user_id = ? AND expires_at > ?
      ORDER BY last_activity DESC
    `).all(req.user?.userId, new Date().toISOString());

    res.json({ sessions });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to retrieve sessions' });
  }
});

// =============================================================================
// REVOKE SESSION
// =============================================================================

settingsRouter.delete('/sessions/:id', async (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();

    const result = db.prepare(`
      DELETE FROM sessions WHERE id = ? AND user_id = ?
    `).run(req.params.id, req.user?.userId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ message: 'Session revoked' });
  } catch (error) {
    console.error('Revoke session error:', error);
    res.status(500).json({ error: 'Failed to revoke session' });
  }
});

// =============================================================================
// DELETE ACCOUNT
// =============================================================================

settingsRouter.delete('/account', async (req: AuthRequest, res: Response) => {
  try {
    const { confirmPassword } = req.body;
    const db = getDatabase();
    const userId = req.user?.userId;

    // Verify password before deletion
    const user = db.prepare(
      'SELECT salt, master_password_hash FROM users WHERE id = ?'
    ).get(userId) as any;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Import encryption service to verify password
    const { EncryptionService } = require('../services/encryption');
    const isValid = EncryptionService.verifyPassword(
      confirmPassword,
      user.salt,
      user.master_password_hash
    );

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Delete all user data (cascades due to foreign keys)
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// =============================================================================
// STATISTICS
// =============================================================================

settingsRouter.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.userId;

    const totalItems = db.prepare(`
      SELECT COUNT(*) as count FROM vault_items 
      WHERE user_id = ? AND deleted_at IS NULL
    `).get(userId) as any;

    const itemsByType = db.prepare(`
      SELECT type, COUNT(*) as count FROM vault_items 
      WHERE user_id = ? AND deleted_at IS NULL
      GROUP BY type
    `).all(userId);

    const itemsByCategory = db.prepare(`
      SELECT c.name, COUNT(vi.id) as count 
      FROM categories c
      LEFT JOIN vault_items vi ON c.id = vi.category_id AND vi.deleted_at IS NULL
      WHERE c.user_id = ?
      GROUP BY c.id
    `).all(userId);

    const recentActivity = db.prepare(`
      SELECT action, COUNT(*) as count FROM audit_log
      WHERE user_id = ? AND created_at > datetime('now', '-7 days')
      GROUP BY action
    `).all(userId);

    res.json({
      totalItems: totalItems?.count || 0,
      itemsByType,
      itemsByCategory,
      recentActivity,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to retrieve statistics' });
  }
});
