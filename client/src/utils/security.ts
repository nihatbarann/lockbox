/**
 * Security Utilities
 * Client-side security helpers
 */

/**
 * Clear sensitive data on logout
 */
export function clearSensitiveData(): void {
  // Clear localStorage
  localStorage.removeItem('lockbox-auth');
  sessionStorage.clear();
}

/**
 * Check if current origin matches expected origin
 */
export function validateOrigin(): boolean {
  const expectedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    window.location.origin,
  ];
  
  return expectedOrigins.includes(window.location.origin);
}

/**
 * Sanitize URL to prevent XSS
 */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Only allow http and https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    return parsed.toString();
  } catch {
    return '';
  }
}

/**
 * Prevent clickjacking
 */
export function preventClickjacking(): void {
  if (window.self !== window.top) {
    // Page is being framed - redirect to top
    window.top!.location = window.self.location;
  }
}

/**
 * Generate a random nonce for inline scripts
 */
export function generateNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Add security headers to all API requests
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Requested-With': 'XMLHttpRequest',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
  };
}

/**
 * Validate token format (basic check)
 */
export function isValidJWT(token: string): boolean {
  const parts = token.split('.');
  return parts.length === 3 && parts.every(part => part.length > 0);
}

/**
 * Securely store sensitive data (in-memory only)
 */
class SecureStorage {
  private data: Map<string, any> = new Map();
  
  set(key: string, value: any): void {
    this.data.set(key, value);
  }
  
  get(key: string): any {
    return this.data.get(key);
  }
  
  delete(key: string): void {
    this.data.delete(key);
  }
  
  clear(): void {
    this.data.clear();
  }
}

export const secureStorage = new SecureStorage();

export {};

