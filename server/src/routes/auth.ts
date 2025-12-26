/**
 * Authentication Routes
 * Register, Login, Logout, Session Management
 */

import { Router, Request, Response } from 'express';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { getDatabase } from '../database/init';
import { EncryptionService } from '../services/encryption';
import { authMiddleware, AuthRequest } from '../middleware/auth';

export const authRouter = Router();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  masterPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(data => data.masterPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  masterPassword: z.string().min(1, 'Password is required'),
});

// =============================================================================
// REGISTER
// =============================================================================

authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validation.error.errors 
      });
    }

    const { email, masterPassword } = validation.data;
    const db = getDatabase();

    // Check if user exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Generate cryptographic materials
    const userId = uuidv4();
    const salt = EncryptionService.generateSalt();
    const masterPasswordHash = EncryptionService.hashPassword(masterPassword, salt);
    const encryptionKey = EncryptionService.generateEncryptionKey();
    
    // Encrypt the encryption key with derived key from master password
    const derivedKey = EncryptionService.deriveKey(masterPassword, salt);
    const encryptionKeyEncrypted = EncryptionService.encrypt(encryptionKey, derivedKey);

    // Create user
    db.prepare(`
      INSERT INTO users (id, email, master_password_hash, salt, encryption_key_encrypted)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, email, masterPasswordHash, salt, encryptionKeyEncrypted);

    // Create default categories
    const defaultCategories = [
      { name: 'Passwords', icon: 'key', color: '#6366f1' },
      { name: 'Secure Notes', icon: 'file-text', color: '#10b981' },
      { name: 'Credit Cards', icon: 'credit-card', color: '#f59e0b' },
      { name: 'Identity', icon: 'user', color: '#ec4899' },
    ];

    const insertCategory = db.prepare(`
      INSERT INTO categories (id, user_id, name, icon, color, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    defaultCategories.forEach((cat, index) => {
      insertCategory.run(uuidv4(), userId, cat.name, cat.icon, cat.color, index);
    });

    // Generate JWT token
    const jwtSecret: Secret = process.env.JWT_SECRET || 'fallback-secret';
    const signOptions: SignOptions = { expiresIn: '24h' };
    const token = jwt.sign(
      { userId, email },
      jwtSecret,
      signOptions
    );

    // Create session
    const sessionId = uuidv4();
    const tokenHash = EncryptionService.hashPassword(token, salt);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO sessions (id, user_id, token_hash, device_info, ip_address, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(sessionId, userId, tokenHash, req.headers['user-agent'], req.ip, expiresAt);

    // Audit log
    db.prepare(`
      INSERT INTO audit_log (id, user_id, action, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), userId, 'REGISTER', req.ip, req.headers['user-agent']);

    res.status(201).json({
      message: 'Registration successful',
      user: { id: userId, email },
      token,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// =============================================================================
// LOGIN
// =============================================================================

authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validation.error.errors 
      });
    }

    const { email, masterPassword } = validation.data;
    const db = getDatabase();

    // Find user
    const user = db.prepare(`
      SELECT id, email, master_password_hash, salt, encryption_key_encrypted, 
             failed_attempts, locked_until
      FROM users WHERE email = ?
    `).get(email) as any;

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const unlockTime = new Date(user.locked_until);
      return res.status(423).json({ 
        error: 'Account temporarily locked',
        unlockAt: unlockTime.toISOString()
      });
    }

    // Verify password
    const isValid = EncryptionService.verifyPassword(
      masterPassword, 
      user.salt, 
      user.master_password_hash
    );

    if (!isValid) {
      // Increment failed attempts
      const newFailedAttempts = (user.failed_attempts || 0) + 1;
      let lockedUntil = null;

      // Lock account after 5 failed attempts
      if (newFailedAttempts >= 5) {
        lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes
      }

      db.prepare(`
        UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?
      `).run(newFailedAttempts, lockedUntil, user.id);

      // Audit log
      db.prepare(`
        INSERT INTO audit_log (id, user_id, action, ip_address, user_agent, details)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), user.id, 'LOGIN_FAILED', req.ip, req.headers['user-agent'], 
             JSON.stringify({ attempts: newFailedAttempts }));

      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Reset failed attempts on successful login
    db.prepare(`
      UPDATE users SET failed_attempts = 0, locked_until = NULL, last_login = ? WHERE id = ?
    `).run(new Date().toISOString(), user.id);

    // Generate JWT token
    const jwtSecret: Secret = process.env.JWT_SECRET || 'fallback-secret';
    const signOptions: SignOptions = { expiresIn: '24h' };
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      jwtSecret,
      signOptions
    );

    // Create session
    const sessionId = uuidv4();
    const tokenHash = EncryptionService.hashPassword(token, user.salt);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO sessions (id, user_id, token_hash, device_info, ip_address, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(sessionId, user.id, tokenHash, req.headers['user-agent'], req.ip, expiresAt);

    // Audit log
    db.prepare(`
      INSERT INTO audit_log (id, user_id, action, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), user.id, 'LOGIN_SUCCESS', req.ip, req.headers['user-agent']);

    // Decrypt encryption key
    const derivedKey = EncryptionService.deriveKey(masterPassword, user.salt);
    const encryptionKey = EncryptionService.decrypt(user.encryption_key_encrypted, derivedKey);

    res.json({
      message: 'Login successful',
      user: { id: user.id, email: user.email },
      token,
      encryptionKey, // Client will use this for local encryption/decryption
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// =============================================================================
// LOGOUT
// =============================================================================

authRouter.post('/logout', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.userId;

    // Delete current session
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);

    // Audit log
    db.prepare(`
      INSERT INTO audit_log (id, user_id, action, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), userId, 'LOGOUT', req.ip, req.headers['user-agent']);

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// =============================================================================
// VERIFY SESSION
// =============================================================================

authRouter.get('/verify', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const user = db.prepare('SELECT id, email FROM users WHERE id = ?').get(req.user?.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({ valid: true, user });
  } catch (error) {
    res.status(401).json({ error: 'Invalid session' });
  }
});

// =============================================================================
// CHANGE MASTER PASSWORD
// =============================================================================

authRouter.post('/change-password', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'New passwords do not match' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const db = getDatabase();
    const user = db.prepare(`
      SELECT id, salt, master_password_hash, encryption_key_encrypted
      FROM users WHERE id = ?
    `).get(req.user?.userId) as any;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValid = EncryptionService.verifyPassword(
      currentPassword, 
      user.salt, 
      user.master_password_hash
    );

    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Decrypt existing encryption key
    const oldDerivedKey = EncryptionService.deriveKey(currentPassword, user.salt);
    const encryptionKey = EncryptionService.decrypt(user.encryption_key_encrypted, oldDerivedKey);

    // Generate new salt and hash
    const newSalt = EncryptionService.generateSalt();
    const newPasswordHash = EncryptionService.hashPassword(newPassword, newSalt);
    
    // Re-encrypt encryption key with new password
    const newDerivedKey = EncryptionService.deriveKey(newPassword, newSalt);
    const newEncryptionKeyEncrypted = EncryptionService.encrypt(encryptionKey, newDerivedKey);

    // Update user
    db.prepare(`
      UPDATE users 
      SET master_password_hash = ?, salt = ?, encryption_key_encrypted = ?, updated_at = ?
      WHERE id = ?
    `).run(newPasswordHash, newSalt, newEncryptionKeyEncrypted, new Date().toISOString(), user.id);

    // Delete all sessions
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);

    // Audit log
    db.prepare(`
      INSERT INTO audit_log (id, user_id, action, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), user.id, 'PASSWORD_CHANGED', req.ip, req.headers['user-agent']);

    res.json({ message: 'Password changed successfully. Please login again.' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});
