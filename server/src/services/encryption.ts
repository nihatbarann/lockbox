/**
 * Encryption Service
 * AES-256 encryption with PBKDF2 key derivation
 */

import CryptoJS from 'crypto-js';
import { v4 as uuidv4 } from 'uuid';

// Balancing security with performance
const PBKDF2_ITERATIONS_HIGH = 600000; // For password hashing (stored)
const PBKDF2_ITERATIONS_FAST = 100000; // For key derivation during auth (temporary)
const KEY_SIZE = 256 / 32; // 256 bits
const SALT_SIZE = 32;

export class EncryptionService {
  /**
   * Generate a random salt
   */
  static generateSalt(): string {
    return CryptoJS.lib.WordArray.random(SALT_SIZE).toString();
  }

  /**
   * Generate a random encryption key
   */
  static generateEncryptionKey(): string {
    return CryptoJS.lib.WordArray.random(32).toString();
  }

  /**
   * Derive a key from password using PBKDF2 (fast version for authentication)
   */
  static deriveKey(password: string, salt: string): string {
    const key = CryptoJS.PBKDF2(password, salt, {
      keySize: KEY_SIZE,
      iterations: PBKDF2_ITERATIONS_FAST,
      hasher: CryptoJS.algo.SHA256,
    });
    return key.toString();
  }

  /**
   * Derive a key from password using PBKDF2 (high security version for password hashing)
   */
  static deriveKeySecure(password: string, salt: string): string {
    const key = CryptoJS.PBKDF2(password, salt, {
      keySize: KEY_SIZE,
      iterations: PBKDF2_ITERATIONS_HIGH,
      hasher: CryptoJS.algo.SHA256,
    });
    return key.toString();
  }

  /**
   * Hash the master password for storage
   */
  static hashPassword(password: string, salt: string): string {
    // Use fast derivation for consistency with verification
    const derivedKey = this.deriveKey(password, salt);
    return CryptoJS.SHA256(derivedKey + salt).toString();
  }

  /**
   * Verify password against stored hash
   */
  static verifyPassword(password: string, salt: string, storedHash: string): boolean {
    // Use fast derivation for verification (key derivation only)
    const derivedKey = this.deriveKey(password, salt);
    const computedHash = CryptoJS.SHA256(derivedKey + salt).toString();
    return computedHash === storedHash;
  }

  /**
   * Encrypt data with AES-256
   */
  static encrypt(plaintext: string, key: string): string {
    const iv = CryptoJS.lib.WordArray.random(16);
    const encrypted = CryptoJS.AES.encrypt(plaintext, CryptoJS.enc.Hex.parse(key), {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    
    // Combine IV and ciphertext
    const combined = iv.toString() + ':' + encrypted.toString();
    return combined;
  }

  /**
   * Decrypt data with AES-256
   */
  static decrypt(ciphertext: string, key: string): string {
    try {
      const parts = ciphertext.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid ciphertext format');
      }
      
      const iv = CryptoJS.enc.Hex.parse(parts[0]);
      const encrypted = parts[1];
      
      const decrypted = CryptoJS.AES.decrypt(encrypted, CryptoJS.enc.Hex.parse(key), {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });
      
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      throw new Error('Decryption failed');
    }
  }

  /**
   * Generate a secure password
   */
  static generatePassword(options: {
    length?: number;
    uppercase?: boolean;
    lowercase?: boolean;
    numbers?: boolean;
    symbols?: boolean;
  } = {}): string {
    const {
      length = 16,
      uppercase = true,
      lowercase = true,
      numbers = true,
      symbols = true,
    } = options;

    let charset = '';
    if (uppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (lowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (numbers) charset += '0123456789';
    if (symbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (charset.length === 0) {
      charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    }

    let password = '';
    const randomBytes = CryptoJS.lib.WordArray.random(length);
    const randomArray = randomBytes.toString().match(/.{2}/g) || [];
    
    for (let i = 0; i < length; i++) {
      const randomValue = parseInt(randomArray[i % randomArray.length], 16);
      password += charset[randomValue % charset.length];
    }

    return password;
  }

  /**
   * Calculate password strength (0-100)
   */
  static calculatePasswordStrength(password: string): {
    score: number;
    feedback: string[];
  } {
    let score = 0;
    const feedback: string[] = [];

    if (!password) {
      return { score: 0, feedback: ['Password is empty'] };
    }

    // Length scoring
    if (password.length >= 8) score += 10;
    if (password.length >= 12) score += 15;
    if (password.length >= 16) score += 15;
    if (password.length >= 20) score += 10;

    // Character variety
    if (/[a-z]/.test(password)) score += 10;
    if (/[A-Z]/.test(password)) score += 10;
    if (/[0-9]/.test(password)) score += 10;
    if (/[^a-zA-Z0-9]/.test(password)) score += 15;

    // Penalties
    if (/(.)\1{2,}/.test(password)) {
      score -= 10;
      feedback.push('Avoid repeated characters');
    }
    if (/^[a-zA-Z]+$/.test(password)) {
      score -= 5;
      feedback.push('Add numbers or symbols');
    }
    if (/^[0-9]+$/.test(password)) {
      score -= 15;
      feedback.push('Add letters and symbols');
    }

    // Feedback
    if (password.length < 8) feedback.push('Use at least 8 characters');
    if (!/[A-Z]/.test(password)) feedback.push('Add uppercase letters');
    if (!/[a-z]/.test(password)) feedback.push('Add lowercase letters');
    if (!/[0-9]/.test(password)) feedback.push('Add numbers');
    if (!/[^a-zA-Z0-9]/.test(password)) feedback.push('Add special characters');

    return {
      score: Math.max(0, Math.min(100, score)),
      feedback,
    };
  }
}
