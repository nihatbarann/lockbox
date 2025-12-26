/**
 * Encryption Service (Client-side)
 * Handles all encryption/decryption in the browser
 */

import CryptoJS from 'crypto-js';

export class EncryptionService {
  private static key: string | null = null;

  static setKey(key: string): void {
    this.key = key;
  }

  static getKey(): string | null {
    return this.key;
  }

  static clearKey(): void {
    this.key = null;
  }

  static encrypt(plaintext: string): string {
    if (!this.key) {
      throw new Error('Encryption key not set');
    }

    const iv = CryptoJS.lib.WordArray.random(16);
    const encrypted = CryptoJS.AES.encrypt(plaintext, CryptoJS.enc.Hex.parse(this.key), {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    return iv.toString() + ':' + encrypted.toString();
  }

  static decrypt(ciphertext: string): string {
    if (!this.key) {
      throw new Error('Encryption key not set');
    }

    try {
      const parts = ciphertext.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid ciphertext format');
      }

      const iv = CryptoJS.enc.Hex.parse(parts[0]);
      const encrypted = parts[1];

      const decrypted = CryptoJS.AES.decrypt(encrypted, CryptoJS.enc.Hex.parse(this.key), {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });

      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Decryption failed:', error);
      return '[Decryption Failed]';
    }
  }

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
}
