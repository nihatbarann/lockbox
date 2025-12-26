/**
 * Vault Routes
 * CRUD operations for vault items (passwords, notes, cards, etc.)
 */

import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { getDatabase } from '../database/init';
import { authMiddleware, AuthRequest } from '../middleware/auth';

export const vaultRouter = Router();

// Apply auth middleware to all vault routes
vaultRouter.use(authMiddleware);

// Validation schemas
const createItemSchema = z.object({
  type: z.enum(['password', 'note', 'card', 'identity']).default('password'),
  categoryId: z.string().uuid().optional(),
  titleEncrypted: z.string().min(1),
  dataEncrypted: z.string().min(1),
  notesEncrypted: z.string().optional(),
  url: z.string().url().optional().or(z.literal('')),
  isFavorite: z.boolean().default(false),
});

const updateItemSchema = createItemSchema.partial();

// =============================================================================
// GET ALL ITEMS
// =============================================================================

vaultRouter.get('/items', async (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const { categoryId, type, search, favorites } = req.query;

    let query = `
      SELECT vi.*, c.name as category_name, c.icon as category_icon, c.color as category_color
      FROM vault_items vi
      LEFT JOIN categories c ON vi.category_id = c.id
      WHERE vi.user_id = ? AND vi.deleted_at IS NULL
    `;
    const params: any[] = [req.user?.userId];

    if (categoryId) {
      query += ' AND vi.category_id = ?';
      params.push(categoryId);
    }

    if (type) {
      query += ' AND vi.type = ?';
      params.push(type);
    }

    if (favorites === 'true') {
      query += ' AND vi.is_favorite = 1';
    }

    query += ' ORDER BY vi.is_favorite DESC, vi.updated_at DESC';

    const items = db.prepare(query).all(...params);

    res.json({ items });
  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json({ error: 'Failed to retrieve items' });
  }
});

// =============================================================================
// GET SINGLE ITEM
// =============================================================================

vaultRouter.get('/items/:id', async (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const item = db.prepare(`
      SELECT vi.*, c.name as category_name, c.icon as category_icon, c.color as category_color
      FROM vault_items vi
      LEFT JOIN categories c ON vi.category_id = c.id
      WHERE vi.id = ? AND vi.user_id = ? AND vi.deleted_at IS NULL
    `).get(req.params.id, req.user?.userId);

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Update last used
    db.prepare('UPDATE vault_items SET last_used = ? WHERE id = ?')
      .run(new Date().toISOString(), req.params.id);

    res.json({ item });
  } catch (error) {
    console.error('Get item error:', error);
    res.status(500).json({ error: 'Failed to retrieve item' });
  }
});

// =============================================================================
// CREATE ITEM
// =============================================================================

vaultRouter.post('/items', async (req: AuthRequest, res: Response) => {
  try {
    const validation = createItemSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validation.error.errors 
      });
    }

    const { type, categoryId, titleEncrypted, dataEncrypted, notesEncrypted, url, isFavorite } = validation.data;
    const db = getDatabase();
    const itemId = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO vault_items (
        id, user_id, category_id, type, title_encrypted, data_encrypted, 
        notes_encrypted, url, is_favorite, password_updated_at, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      itemId, req.user?.userId, categoryId || null, type, titleEncrypted,
      dataEncrypted, notesEncrypted || null, url || null, isFavorite ? 1 : 0, now, now, now
    );

    // Add to sync log
    db.prepare(`
      INSERT INTO sync_log (id, user_id, action, entity_type, entity_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), req.user?.userId, 'CREATE', 'vault_item', itemId, now);

    const item = db.prepare('SELECT * FROM vault_items WHERE id = ?').get(itemId);

    res.status(201).json({ message: 'Item created', item });
  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// =============================================================================
// UPDATE ITEM
// =============================================================================

vaultRouter.put('/items/:id', async (req: AuthRequest, res: Response) => {
  try {
    const validation = updateItemSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validation.error.errors 
      });
    }

    const db = getDatabase();
    const existingItem = db.prepare(
      'SELECT * FROM vault_items WHERE id = ? AND user_id = ? AND deleted_at IS NULL'
    ).get(req.params.id, req.user?.userId) as any;

    if (!existingItem) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const updates = validation.data;
    const now = new Date().toISOString();

    // Check if password data changed (for password history)
    if (updates.dataEncrypted && updates.dataEncrypted !== existingItem.data_encrypted) {
      db.prepare(`
        INSERT INTO password_history (id, vault_item_id, password_encrypted, changed_at)
        VALUES (?, ?, ?, ?)
      `).run(uuidv4(), req.params.id, existingItem.data_encrypted, now);
    }

    // Build update query dynamically
    const fields: string[] = ['updated_at = ?'];
    const values: any[] = [now];

    if (updates.titleEncrypted !== undefined) {
      fields.push('title_encrypted = ?');
      values.push(updates.titleEncrypted);
    }
    if (updates.dataEncrypted !== undefined) {
      fields.push('data_encrypted = ?');
      fields.push('password_updated_at = ?');
      values.push(updates.dataEncrypted, now);
    }
    if (updates.notesEncrypted !== undefined) {
      fields.push('notes_encrypted = ?');
      values.push(updates.notesEncrypted);
    }
    if (updates.categoryId !== undefined) {
      fields.push('category_id = ?');
      values.push(updates.categoryId);
    }
    if (updates.url !== undefined) {
      fields.push('url = ?');
      values.push(updates.url);
    }
    if (updates.isFavorite !== undefined) {
      fields.push('is_favorite = ?');
      values.push(updates.isFavorite ? 1 : 0);
    }

    values.push(req.params.id, req.user?.userId);

    db.prepare(`
      UPDATE vault_items SET ${fields.join(', ')} 
      WHERE id = ? AND user_id = ?
    `).run(...values);

    // Add to sync log
    db.prepare(`
      INSERT INTO sync_log (id, user_id, action, entity_type, entity_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), req.user?.userId, 'UPDATE', 'vault_item', req.params.id, now);

    const item = db.prepare('SELECT * FROM vault_items WHERE id = ?').get(req.params.id);

    res.json({ message: 'Item updated', item });
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// =============================================================================
// DELETE ITEM (Soft Delete)
// =============================================================================

vaultRouter.delete('/items/:id', async (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();

    const result = db.prepare(`
      UPDATE vault_items SET deleted_at = ?, updated_at = ?
      WHERE id = ? AND user_id = ? AND deleted_at IS NULL
    `).run(now, now, req.params.id, req.user?.userId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Add to sync log
    db.prepare(`
      INSERT INTO sync_log (id, user_id, action, entity_type, entity_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), req.user?.userId, 'DELETE', 'vault_item', req.params.id, now);

    res.json({ message: 'Item deleted' });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// =============================================================================
// GET CATEGORIES
// =============================================================================

vaultRouter.get('/categories', async (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const categories = db.prepare(`
      SELECT c.*, COUNT(vi.id) as item_count
      FROM categories c
      LEFT JOIN vault_items vi ON c.id = vi.category_id AND vi.deleted_at IS NULL
      WHERE c.user_id = ?
      GROUP BY c.id
      ORDER BY c.sort_order ASC
    `).all(req.user?.userId);

    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to retrieve categories' });
  }
});

// =============================================================================
// CREATE CATEGORY
// =============================================================================

vaultRouter.post('/categories', async (req: AuthRequest, res: Response) => {
  try {
    const { name, icon, color } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const db = getDatabase();
    const categoryId = uuidv4();
    const now = new Date().toISOString();

    // Get max sort order
    const maxOrder = db.prepare(
      'SELECT MAX(sort_order) as max FROM categories WHERE user_id = ?'
    ).get(req.user?.userId) as any;

    db.prepare(`
      INSERT INTO categories (id, user_id, name, icon, color, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      categoryId, req.user?.userId, name.trim(), 
      icon || 'folder', color || '#6366f1', 
      (maxOrder?.max || 0) + 1, now, now
    );

    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(categoryId);

    res.status(201).json({ message: 'Category created', category });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// =============================================================================
// PASSWORD HISTORY
// =============================================================================

vaultRouter.get('/items/:id/history', async (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();

    // Verify item belongs to user
    const item = db.prepare(
      'SELECT id FROM vault_items WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user?.userId);

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const history = db.prepare(`
      SELECT id, password_encrypted, changed_at
      FROM password_history
      WHERE vault_item_id = ?
      ORDER BY changed_at DESC
      LIMIT 10
    `).all(req.params.id);

    res.json({ history });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Failed to retrieve password history' });
  }
});

// =============================================================================
// GENERATE PASSWORD
// =============================================================================

vaultRouter.post('/generate-password', async (req: AuthRequest, res: Response) => {
  try {
    const { length = 16, uppercase = true, lowercase = true, numbers = true, symbols = true } = req.body;

    let charset = '';
    if (uppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (lowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (numbers) charset += '0123456789';
    if (symbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (charset.length === 0) {
      charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    }

    let password = '';
    const crypto = require('crypto');
    const randomBytes = crypto.randomBytes(length);
    
    for (let i = 0; i < length; i++) {
      password += charset[randomBytes[i] % charset.length];
    }

    res.json({ password });
  } catch (error) {
    console.error('Generate password error:', error);
    res.status(500).json({ error: 'Failed to generate password' });
  }
});
