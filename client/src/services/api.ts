/**
 * API Service
 * Axios instance with interceptors
 */

import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 15000, // 15 second timeout for auth requests (reduced from 30s)
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      error.message = 'Request timeout - please try again';
    }
    if (error.response?.status === 401) {
      // Token expired or invalid - only logout if not already on login/register page
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
        const { logout } = useAuthStore.getState();
        logout();
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// API functions
export const authAPI = {
  login: (email: string, masterPassword: string) =>
    api.post('/auth/login', { email, masterPassword }),
  
  register: (email: string, masterPassword: string, confirmPassword: string) =>
    api.post('/auth/register', { email, masterPassword, confirmPassword }),
  
  logout: () => api.post('/auth/logout'),
  
  verify: () => api.get('/auth/verify'),
  
  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword, confirmPassword }),
};

export const vaultAPI = {
  getItems: (params?: { categoryId?: string; type?: string; favorites?: boolean }) =>
    api.get('/vault/items', { params }),
  
  getItem: (id: string) => api.get(`/vault/items/${id}`),
  
  createItem: (data: any) => api.post('/vault/items', data),
  
  updateItem: (id: string, data: any) => api.put(`/vault/items/${id}`, data),
  
  deleteItem: (id: string) => api.delete(`/vault/items/${id}`),
  
  getCategories: () => api.get('/vault/categories'),
  
  createCategory: (data: { name: string; icon?: string; color?: string }) =>
    api.post('/vault/categories', data),
  
  getHistory: (itemId: string) => api.get(`/vault/items/${itemId}/history`),
  
  generatePassword: (options?: any) => api.post('/vault/generate-password', options),
};

export const syncAPI = {
  export: () => api.get('/sync/export'),
  
  import: (data: any) => api.post('/sync/import', data),
  
  getStatus: () => api.get('/sync/status'),
};

export const settingsAPI = {
  get: () => api.get('/settings'),
  
  update: (settings: any) => api.put('/settings', settings),
  
  getAuditLog: (limit?: number, offset?: number) =>
    api.get('/settings/audit-log', { params: { limit, offset } }),
  
  getSessions: () => api.get('/settings/sessions'),
  
  revokeSession: (id: string) => api.delete(`/settings/sessions/${id}`),
  
  deleteAccount: (confirmPassword: string) =>
    api.delete('/settings/account', { data: { confirmPassword } }),
  
  getStats: () => api.get('/settings/stats'),
};
