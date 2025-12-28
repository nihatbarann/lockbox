/**
 * Auth Store
 * Manages authentication state with Zustand
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';
import { EncryptionService } from '../services/encryption';

interface User {
  id: string;
  email: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  encryptionKey: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, masterPassword: string) => Promise<void>;
  register: (email: string, masterPassword: string, confirmPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      encryptionKey: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, masterPassword: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/auth/login', { email, masterPassword });
          const { user, token, encryptionKey } = response.data;
          
          // Set encryption key in the service and sessionStorage
          if (encryptionKey) {
            EncryptionService.setKey(encryptionKey);
            sessionStorage.setItem('lockbox-encryption-key', encryptionKey);
          }
          
          set({
            user,
            token,
            encryptionKey,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          const message = error.response?.data?.error || 'Login failed';
          set({ error: message, isLoading: false });
          throw new Error(message);
        }
      },

      register: async (email: string, masterPassword: string, confirmPassword: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/auth/register', {
            email,
            masterPassword,
            confirmPassword,
          });
          const { user, token, encryptionKey } = response.data;
          
          // Set encryption key in the service and sessionStorage
          if (encryptionKey) {
            EncryptionService.setKey(encryptionKey);
            sessionStorage.setItem('lockbox-encryption-key', encryptionKey);
          }
          
          set({
            user,
            token,
            encryptionKey,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          const message = error.response?.data?.error || 'Registration failed';
          set({ error: message, isLoading: false });
          throw new Error(message);
        }
      },

      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch (error) {
          // Ignore logout errors
        } finally {
          // Clear encryption key and sessionStorage
          EncryptionService.clearKey();
          sessionStorage.removeItem('lockbox-encryption-key');
          
          set({
            user: null,
            token: null,
            encryptionKey: null,
            isAuthenticated: false,
          });
        }
      },

      checkAuth: async () => {
        const { token } = get();
        if (!token) {
          set({ isAuthenticated: false });
          return;
        }

        try {
          const response = await api.get('/auth/verify');
          set({ user: response.data.user, isAuthenticated: true });
        } catch (error) {
          set({
            user: null,
            token: null,
            encryptionKey: null,
            isAuthenticated: false,
          });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'lockbox-auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        // SECURITY: Never persist encryption key - keep in memory only
        // This prevents XSS attacks from extracting the key from localStorage
      }),
    }
  )
);
