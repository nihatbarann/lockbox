/**
 * Database Initialization
 * SQLite with sql.js (pure JavaScript - no native dependencies)
 */

import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';

let db: SqlJsDatabase;
let dbPath: string;

// Helper to create better-sqlite3 compatible interface
interface StatementResult {
  changes: number;
  lastInsertRowid: number | bigint;
}

interface PreparedStatement {
  run: (...params: any[]) => StatementResult;
  get: (...params: any[]) => any;
  all: (...params: any[]) => any[];
  finalize: () => void;
}

interface DatabaseWrapper {
  prepare: (sql: string) => PreparedStatement;
  exec: (sql: string) => void;
  close: () => void;
  pragma: (pragma: string) => void;
}

let dbWrapper: DatabaseWrapper;

export function getDatabase(): DatabaseWrapper {
  if (!dbWrapper) {
    throw new Error('Database not initialized');
  }
  return dbWrapper;
}

// Save database to file
function saveDatabase(): void {
  if (db && dbPath) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

export async function initializeDatabase(): Promise<void> {
  dbPath = process.env.DB_PATH || './data/lockbox.db';
  const dbDir = path.dirname(dbPath);
  
  // Ensure data directory exists
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  // Initialize sql.js
  const SQL = await initSqlJs();
  
  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }
  
  // Create wrapper with better-sqlite3 compatible interface
  dbWrapper = {
    prepare: (sql: string): PreparedStatement => {
      return {
        run: (...params: any[]): StatementResult => {
          db.run(sql, params);
          const result = db.exec("SELECT changes() as changes, last_insert_rowid() as lastId");
          saveDatabase();
          return {
            changes: result[0]?.values[0]?.[0] as number || 0,
            lastInsertRowid: result[0]?.values[0]?.[1] as number || 0
          };
        },
        get: (...params: any[]): any => {
          const stmt = db.prepare(sql);
          stmt.bind(params);
          if (stmt.step()) {
            const columns = stmt.getColumnNames();
            const values = stmt.get();
            const row: any = {};
            columns.forEach((col, i) => {
              row[col] = values[i];
            });
            stmt.free();
            return row;
          }
          stmt.free();
          return undefined;
        },
        all: (...params: any[]): any[] => {
          const stmt = db.prepare(sql);
          stmt.bind(params);
          const rows: any[] = [];
          const columns = stmt.getColumnNames();
          while (stmt.step()) {
            const values = stmt.get();
            const row: any = {};
            columns.forEach((col, i) => {
              row[col] = values[i];
            });
            rows.push(row);
          }
          stmt.free();
          return rows;
        },
        finalize: () => {}
      };
    },
    exec: (sql: string): void => {
      db.run(sql);
      saveDatabase();
    },
    close: (): void => {
      saveDatabase();
      db.close();
    },
    pragma: (pragma: string): void => {
      // sql.js doesn't support all pragmas, but we can try
      try {
        db.run(`PRAGMA ${pragma}`);
      } catch (e) {
        // Ignore pragma errors
      }
    }
  };
  
  // Enable foreign keys
  dbWrapper.pragma('foreign_keys = ON');
  
  // Create tables
  createTables();
}

function createTables(): void {
  // Users table
  dbWrapper.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      master_password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      encryption_key_encrypted TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_login TEXT,
      failed_attempts INTEGER DEFAULT 0,
      locked_until TEXT,
      two_factor_enabled INTEGER DEFAULT 0,
      two_factor_secret TEXT,
      settings TEXT DEFAULT '{}'
    )
  `);
  
  // Categories table
  dbWrapper.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      icon TEXT DEFAULT 'folder',
      color TEXT DEFAULT '#6366f1',
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, name)
    )
  `);
  
  // Vault items table (encrypted)
  dbWrapper.exec(`
    CREATE TABLE IF NOT EXISTS vault_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      category_id TEXT,
      type TEXT NOT NULL DEFAULT 'password',
      title_encrypted TEXT NOT NULL,
      data_encrypted TEXT NOT NULL,
      notes_encrypted TEXT,
      url TEXT,
      favicon TEXT,
      is_favorite INTEGER DEFAULT 0,
      last_used TEXT,
      password_updated_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    )
  `);
  
  // Password history table
  dbWrapper.exec(`
    CREATE TABLE IF NOT EXISTS password_history (
      id TEXT PRIMARY KEY,
      vault_item_id TEXT NOT NULL,
      password_encrypted TEXT NOT NULL,
      changed_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vault_item_id) REFERENCES vault_items(id) ON DELETE CASCADE
    )
  `);
  
  // Sync log table
  dbWrapper.exec(`
    CREATE TABLE IF NOT EXISTS sync_log (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      data_encrypted TEXT,
      synced_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  
  // Sessions table
  dbWrapper.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      device_info TEXT,
      ip_address TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_activity TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  
  // Audit log table
  dbWrapper.exec(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      ip_address TEXT,
      user_agent TEXT,
      details TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);
  
  // Create indexes
  dbWrapper.exec(`
    CREATE INDEX IF NOT EXISTS idx_vault_items_user ON vault_items(user_id)
  `);
  dbWrapper.exec(`
    CREATE INDEX IF NOT EXISTS idx_vault_items_category ON vault_items(category_id)
  `);
  dbWrapper.exec(`
    CREATE INDEX IF NOT EXISTS idx_vault_items_deleted ON vault_items(deleted_at)
  `);
  dbWrapper.exec(`
    CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id)
  `);
  dbWrapper.exec(`
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)
  `);
  dbWrapper.exec(`
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash)
  `);
  dbWrapper.exec(`
    CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id)
  `);
  dbWrapper.exec(`
    CREATE INDEX IF NOT EXISTS idx_sync_log_user ON sync_log(user_id)
  `);
  
  console.log('Database tables created successfully');
}

export function closeDatabase(): void {
  if (dbWrapper) {
    dbWrapper.close();
  }
}
