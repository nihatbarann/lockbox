/**
 * Lockbox Web Server
 * Enterprise Password Manager - Backend API
 * 
 * Security Features:
 * - AES-256 Encryption
 * - PBKDF2-SHA256 Key Derivation
 * - JWT Authentication
 * - Rate Limiting
 * - CORS Protection
 * - Helmet Security Headers
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

import { authRouter } from './routes/auth';
import { vaultRouter } from './routes/vault';
import { syncRouter } from './routes/sync';
import { settingsRouter } from './routes/settings';
import { initializeDatabase } from './database/init';

// Auto-create .env file if it doesn't exist
const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', '.env.example');
if (!fs.existsSync(envPath)) {
  const defaultEnv = `PORT=3001
NODE_ENV=development
JWT_SECRET=lockbox-dev-secret-key-${Date.now()}
JWT_EXPIRES_IN=24h
DB_PATH=./data/lockbox.db
RATE_LIMIT_MAX=100
`;
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
  } else {
    fs.writeFileSync(envPath, defaultEnv);
  }
  console.log('✅ .env file created automatically');
}

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ CRITICAL: Environment variable ${envVar} is required but not set`);
    process.exit(1);
  }
}


const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for rate limiting behind reverse proxies
app.set('trust proxy', 1);

// =============================================================================
// SECURITY MIDDLEWARE
// =============================================================================

// Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 63072000, // 2 years
    includeSubDomains: true,
    preload: true,
  },
  frameguard: {
    action: 'deny',
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});
app.use('/api/', limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 7, // 7 attempts
  message: { error: 'Too many login attempts, please try again after 15 minutes.' },
  validate: { xForwardedForHeader: false },
});
app.use('/api/auth/login', authLimiter);

// Rate limit for register endpoint
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 7, // 7 attempts
  message: { error: 'Too many registration attempts, please try again after 15 minutes.' },
  validate: { xForwardedForHeader: false },
});
app.use('/api/auth/register', registerLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// =============================================================================
// API ROUTES
// =============================================================================

app.use('/api/auth', authRouter);
app.use('/api/vault', vaultRouter);
app.use('/api/sync', syncRouter);
app.use('/api/settings', settingsRouter);

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// =============================================================================
// STATIC FILES (Production)
// =============================================================================

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/build')));
  
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../../client/build', 'index.html'));
  });
}

// =============================================================================
// ERROR HANDLING
// =============================================================================

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server Error:', err);
  
  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;
  
  res.status(500).json({ error: message });
});

// =============================================================================
// SERVER STARTUP
// =============================================================================

async function startServer() {
  try {
    // Initialize database
    await initializeDatabase();
    console.log('Database initialized successfully');
    
    // Start server
    app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🔐 LOCKBOX SERVER                                       ║
║   Enterprise Password Manager                             ║
║                                                           ║
║   Server running on: http://localhost:${PORT}              ║
║   Environment: ${process.env.NODE_ENV || 'development'}                            ║
║                                                           ║
║   Security: AES-256 | PBKDF2 | JWT | Rate Limited         ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
