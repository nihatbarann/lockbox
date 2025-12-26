/**
 * Auth Store
 * Manages authentication state with Zustand
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

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
          const { user, token } = response.data;
          
          // After registration, need to login to get encryption key
          set({
            user,
            token,
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
        encryptionKey: state.encryptionKey,
      }),
    }
  )
);
