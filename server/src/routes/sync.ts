/**
 * Sync Routes
 * Import/Export and remote synchronization
 */

import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/init';
import { authMiddleware, AuthRequest } from '../middleware/auth';

export const syncRouter = Router();

syncRouter.use(authMiddleware);

// =============================================================================
// EXPORT DATA
// =============================================================================

syncRouter.get('/export', async (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.userId;

    // Get all user data (encrypted)
    const categories = db.prepare(
      'SELECT * FROM categories WHERE user_id = ?'
    ).all(userId);

    const items = db.prepare(
      'SELECT * FROM vault_items WHERE user_id = ? AND deleted_at IS NULL'
    ).all(userId);

    const exportData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      categories,
      items,
    };

    // Audit log
    db.prepare(`
      INSERT INTO audit_log (id, user_id, action, ip_address, user_agent, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(), userId, 'EXPORT', req.ip, req.headers['user-agent'],
      JSON.stringify({ itemCount: items.length, categoryCount: categories.length })
    );

    res.json(exportData);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
});

// =============================================================================
// IMPORT DATA
// =============================================================================

syncRouter.post('/import', async (req: AuthRequest, res: Response) => {
  try {
    const { categories, items, mergeStrategy = 'skip' } = req.body;
    const db = getDatabase();
    const userId = req.user?.userId;
    const now = new Date().toISOString();

    let importedCategories = 0;
    let importedItems = 0;
    let skippedItems = 0;

    // Import categories
    if (categories && Array.isArray(categories)) {
      const insertCategory = db.prepare(`
        INSERT OR IGNORE INTO categories (id, user_id, name, icon, color, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const cat of categories) {
        const result = insertCategory.run(
          uuidv4(), userId, cat.name, cat.icon || 'folder', 
          cat.color || '#6366f1', cat.sort_order || 0, now, now
        );
        if (result.changes > 0) importedCategories++;
      }
    }

    // Import items
    if (items && Array.isArray(items)) {
      const insertItem = db.prepare(`
        INSERT INTO vault_items (
          id, user_id, category_id, type, title_encrypted, data_encrypted,
          notes_encrypted, url, is_favorite, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const item of items) {
        try {
          insertItem.run(
            uuidv4(), userId, item.category_id || null, item.type || 'password',
            item.title_encrypted, item.data_encrypted, item.notes_encrypted || null,
            item.url || null, item.is_favorite ? 1 : 0, now, now
          );
          importedItems++;
        } catch (err) {
          skippedItems++;
        }
      }
    }

    // Audit log
    db.prepare(`
      INSERT INTO audit_log (id, user_id, action, ip_address, user_agent, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(), userId, 'IMPORT', req.ip, req.headers['user-agent'],
      JSON.stringify({ importedCategories, importedItems, skippedItems })
    );

    res.json({
      message: 'Import completed',
      imported: { categories: importedCategories, items: importedItems },
      skipped: skippedItems,
    });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: 'Import failed' });
  }
});

// =============================================================================
// SYNC STATUS
// =============================================================================

syncRouter.get('/status', async (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.userId;

    const lastSync = db.prepare(`
      SELECT MAX(created_at) as last_sync FROM sync_log WHERE user_id = ?
    `).get(userId) as any;

    const pendingChanges = db.prepare(`
      SELECT COUNT(*) as count FROM sync_log 
      WHERE user_id = ? AND synced_at IS NULL
    `).get(userId) as any;

    const itemCount = db.prepare(`
      SELECT COUNT(*) as count FROM vault_items 
      WHERE user_id = ? AND deleted_at IS NULL
    `).get(userId) as any;

    res.json({
      lastSync: lastSync?.last_sync,
      pendingChanges: pendingChanges?.count || 0,
      totalItems: itemCount?.count || 0,
    });
  } catch (error) {
    console.error('Sync status error:', error);
    res.status(500).json({ error: 'Failed to get sync status' });
  }
});

// =============================================================================
// GET CHANGES (for sync)
// =============================================================================

syncRouter.get('/changes', async (req: AuthRequest, res: Response) => {
  try {
    const { since } = req.query;
    const db = getDatabase();
    const userId = req.user?.userId;

    let query = `
      SELECT * FROM sync_log WHERE user_id = ?
    `;
    const params: any[] = [userId];

    if (since) {
      query += ' AND created_at > ?';
      params.push(since);
    }

    query += ' ORDER BY created_at ASC LIMIT 100';

    const changes = db.prepare(query).all(...params);

    res.json({ changes });
  } catch (error) {
    console.error('Get changes error:', error);
    res.status(500).json({ error: 'Failed to get changes' });
  }
});
