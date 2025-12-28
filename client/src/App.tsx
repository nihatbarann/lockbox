import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import { EncryptionService } from './services/encryption';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import VaultPage from './pages/VaultPage';
import SettingsPage from './pages/SettingsPage';
import ToolsPage from './pages/ToolsPage';
import Layout from './components/Layout';

// Protected Route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, token } = useAuthStore();
  
  if (!isAuthenticated || !token) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Public Route wrapper (redirects to dashboard if logged in)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  
  if (isAuthenticated) {
    return <Navigate to="/vault" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  const { checkAuth, encryptionKey, user } = useAuthStore();
  const { theme } = useThemeStore();
  
  useEffect(() => {
    // Restore encryption key from sessionStorage if it exists
    const savedKey = sessionStorage.getItem('lockbox-encryption-key');
    if (savedKey && !encryptionKey) {
      // If we have a saved key but it's not in memory, restore it
      useAuthStore.setState({ encryptionKey: savedKey });
      EncryptionService.setKey(savedKey);
    }
    
    // Check auth once on app mount
    checkAuth();
  }, []);

  // Set encryption key whenever it changes
  useEffect(() => {
    if (encryptionKey) {
      EncryptionService.setKey(encryptionKey);
    }
  }, [encryptionKey]);

  // Theme is applied automatically by themeStore

  return (
    <div className="min-h-screen bg-dark-900 dark:bg-dark-900 light:bg-gray-50 transition-colors duration-200">
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        } />
        <Route path="/register" element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        } />
        
        {/* Protected Routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/vault" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="vault" element={<VaultPage />} />
          <Route path="tools" element={<ToolsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        
        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
