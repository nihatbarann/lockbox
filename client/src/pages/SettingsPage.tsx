import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  User, 
  Lock, 
  Palette, 
  Shield, 
  Clock, 
  Download, 
  Upload, 
  Trash2,
  Monitor,
  Eye,
  EyeOff,
  Save,
  AlertTriangle,
  Sun,
  Moon
} from 'lucide-react';
import { settingsAPI, syncAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { EncryptionService } from '../services/encryption';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('general');
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const tabs = [
    { id: 'general', label: 'General', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'import-export', label: 'Import/Export', icon: Download },
    { id: 'sessions', label: 'Sessions', icon: Monitor },
    { id: 'danger', label: 'Danger Zone', icon: AlertTriangle },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-dark-400 mt-1">Manage your account and preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors",
              activeTab === tab.id
                ? "bg-primary-500/20 text-primary-400 border border-primary-500/30"
                : "bg-dark-700/50 text-dark-300 hover:bg-dark-700 hover:text-white"
            )}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="card">
        {activeTab === 'general' && <GeneralSettings user={user} />}
        {activeTab === 'security' && <SecuritySettings />}
        {activeTab === 'import-export' && <ImportExportSettings />}
        {activeTab === 'sessions' && <SessionsSettings />}
        {activeTab === 'danger' && <DangerZone />}
      </div>
    </div>
  );
};

// General Settings Component
const GeneralSettings: React.FC<{ user: any }> = ({ user }) => {
  const { theme: currentTheme, setTheme: setGlobalTheme } = useThemeStore();
  
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await settingsAPI.get();
      return response.data.settings;
    },
  });

  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>(currentTheme);
  const [autoLockTimeout, setAutoLockTimeout] = useState(settings?.autoLockTimeout || 5);
  const [clipboardTimeout, setClipboardTimeout] = useState(settings?.clipboardTimeout || 30);

  // Sync theme state when store changes
  useEffect(() => {
    setTheme(currentTheme);
  }, [currentTheme]);

  // Apply theme immediately when changed
  const handleThemeChange = (newTheme: 'dark' | 'light' | 'system') => {
    setTheme(newTheme);
    setGlobalTheme(newTheme);
  };

  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (data: any) => settingsAPI.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Settings saved');
    },
    onError: () => {
      toast.error('Failed to save settings');
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      ...settings,
      theme,
      autoLockTimeout,
      clipboardTimeout,
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-white flex items-center gap-2">
        <User className="w-5 h-5 text-primary-400" />
        General Settings
      </h2>

      {/* Account Info */}
      <div className="p-4 bg-dark-700/50 rounded-lg">
        <p className="text-dark-400 text-sm">Email</p>
        <p className="text-white font-medium">{user?.email}</p>
      </div>

      {/* Theme */}
      <div>
        <label className="block text-sm font-medium text-dark-300 mb-2">
          Theme
        </label>
        <div className="flex gap-3">
          {([
            { value: 'dark', label: 'Dark', icon: Moon },
            { value: 'light', label: 'Light', icon: Sun },
            { value: 'system', label: 'System', icon: Monitor },
          ] as const).map((t) => (
            <button
              key={t.value}
              onClick={() => handleThemeChange(t.value)}
              className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
                theme === t.value
                  ? "bg-primary-500/20 text-primary-400 border border-primary-500/30"
                  : "bg-dark-700/50 text-dark-300 hover:bg-dark-700"
              )}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Auto-lock timeout */}
      <div>
        <label className="block text-sm font-medium text-dark-300 mb-2">
          Auto-lock timeout: {autoLockTimeout} minutes
        </label>
        <input
          type="range"
          min="1"
          max="60"
          value={autoLockTimeout}
          onChange={(e) => setAutoLockTimeout(Number(e.target.value))}
          className="w-full"
        />
      </div>

      {/* Clipboard timeout */}
      <div>
        <label className="block text-sm font-medium text-dark-300 mb-2">
          Clear clipboard after: {clipboardTimeout} seconds
        </label>
        <input
          type="range"
          min="10"
          max="120"
          value={clipboardTimeout}
          onChange={(e) => setClipboardTimeout(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <button
        onClick={handleSave}
        disabled={updateMutation.isPending}
        className="btn btn-primary flex items-center gap-2"
      >
        <Save className="w-4 h-4" />
        {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
};

// Security Settings Component
const SecuritySettings: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  const changePasswordMutation = useMutation({
    mutationFn: () => 
      fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useAuthStore.getState().token}`
        },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      }).then(res => {
        if (!res.ok) throw new Error('Failed');
        return res.json();
      }),
    onSuccess: () => {
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: () => {
      toast.error('Failed to change password');
    },
  });

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    
    changePasswordMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-white flex items-center gap-2">
        <Shield className="w-5 h-5 text-primary-400" />
        Security Settings
      </h2>

      <form onSubmit={handleChangePassword} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-dark-300 mb-2">
            Current Password
          </label>
          <div className="relative">
            <input
              type={showPasswords ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="input pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPasswords(!showPasswords)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white"
            >
              {showPasswords ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-dark-300 mb-2">
            New Password
          </label>
          <input
            type={showPasswords ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="input"
            required
            minLength={8}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-dark-300 mb-2">
            Confirm New Password
          </label>
          <input
            type={showPasswords ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input"
            required
          />
        </div>

        <button
          type="submit"
          disabled={changePasswordMutation.isPending}
          className="btn btn-primary"
        >
          {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
        </button>
      </form>
    </div>
  );
};

// Import/Export Settings Component
const ImportExportSettings: React.FC = () => {
  const { encryptionKey } = useAuthStore();
  
  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await syncAPI.export();
      const data = response.data;
      
      // Decrypt all items for export
      const decryptedItems = data.items.map((item: any) => {
        try {
          return {
            ...item,
            title_encrypted: EncryptionService.decrypt(item.title_encrypted),
            data_encrypted: EncryptionService.decrypt(item.data_encrypted),
            notes_encrypted: item.notes_encrypted ? EncryptionService.decrypt(item.notes_encrypted) : null,
          };
        } catch (err) {
          console.error('Failed to decrypt item:', err);
          return item;
        }
      });
      
      return {
        ...data,
        items: decryptedItems,
      };
    },
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lockbox-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export completed');
    },
    onError: () => {
      toast.error('Export failed');
    },
  });

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Encrypt all items for import using current user's key
      const encryptedItems = data.items.map((item: any) => {
        try {
          return {
            ...item,
            title_encrypted: EncryptionService.encrypt(item.title_encrypted),
            data_encrypted: EncryptionService.encrypt(item.data_encrypted),
            notes_encrypted: item.notes_encrypted ? EncryptionService.encrypt(item.notes_encrypted) : null,
          };
        } catch (err) {
          console.error('Failed to encrypt item:', err);
          return item;
        }
      });
      
      const response = await syncAPI.import({
        ...data,
        items: encryptedItems,
      });
      toast.success(`Imported ${response.data.imported.items} items`);
    } catch (error) {
      toast.error('Invalid import file');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-white flex items-center gap-2">
        <Download className="w-5 h-5 text-primary-400" />
        Import & Export
      </h2>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Export */}
        <div className="p-4 bg-dark-700/50 rounded-lg">
          <h3 className="font-medium text-white mb-2">Export Vault</h3>
          <p className="text-dark-400 text-sm mb-4">
            Download an encrypted backup of your vault data.
          </p>
          <button
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
            className="btn btn-secondary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {exportMutation.isPending ? 'Exporting...' : 'Export Vault'}
          </button>
        </div>

        {/* Import */}
        <div className="p-4 bg-dark-700/50 rounded-lg">
          <h3 className="font-medium text-white mb-2">Import Vault</h3>
          <p className="text-dark-400 text-sm mb-4">
            Import data from a Lockbox backup file.
          </p>
          <label className="btn btn-secondary flex items-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4" />
            Import Vault
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="sr-only"
            />
          </label>
        </div>
      </div>
    </div>
  );
};

// Sessions Settings Component
const SessionsSettings: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const response = await settingsAPI.getSessions();
      return response.data.sessions;
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => settingsAPI.revokeSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.success('Session revoked');
    },
    onError: () => {
      toast.error('Failed to revoke session');
    },
  });

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-white flex items-center gap-2">
        <Monitor className="w-5 h-5 text-primary-400" />
        Active Sessions
      </h2>

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-dark-700 rounded-lg" />
          ))}
        </div>
      ) : sessions?.length === 0 ? (
        <p className="text-dark-400">No active sessions</p>
      ) : (
        <div className="space-y-3">
          {sessions?.map((session: any) => (
            <div
              key={session.id}
              className="flex items-center justify-between p-4 bg-dark-700/50 rounded-lg"
            >
              <div>
                <p className="text-white font-medium">{session.device_info || 'Unknown device'}</p>
                <p className="text-dark-400 text-sm">
                  {session.ip_address} • Last active: {new Date(session.last_activity).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => revokeMutation.mutate(session.id)}
                className="btn btn-ghost text-red-400 hover:text-red-300"
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Danger Zone Component
const DangerZone: React.FC = () => {
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const { logout } = useAuthStore();

  const deleteMutation = useMutation({
    mutationFn: () => settingsAPI.deleteAccount(confirmPassword),
    onSuccess: () => {
      toast.success('Account deleted');
      logout();
    },
    onError: () => {
      toast.error('Failed to delete account. Check your password.');
    },
  });

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-red-400 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5" />
        Danger Zone
      </h2>

      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
        <h3 className="font-medium text-white mb-2">Delete Account</h3>
        <p className="text-dark-400 text-sm mb-4">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>

        {!showConfirm ? (
          <button
            onClick={() => setShowConfirm(true)}
            className="btn btn-danger"
          >
            Delete Account
          </button>
        ) : (
          <div className="space-y-3">
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Enter your password to confirm"
              className="input"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={!confirmPassword || deleteMutation.isPending}
                className="btn btn-danger flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {deleteMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
