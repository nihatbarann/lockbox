import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { EncryptionService } from '../services/encryption';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isLoading) return;
    
    clearError();

    if (!email || !password) {
      toast.error('Lütfen tüm alanları doldurunuz');
      return;
    }

    try {
      await login(email, password);
      // Set encryption key in client-side encryption service
      const { encryptionKey } = useAuthStore.getState();
      if (encryptionKey) {
        EncryptionService.setKey(encryptionKey);
      }
      toast.success('Hoş geldiniz!');
      navigate('/vault');
    } catch (err: any) {
      toast.error(err.message || 'Giriş başarısız');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-dark-900 via-dark-800 to-primary-950">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyber-blue/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-cyber-blue mb-4 shadow-lg shadow-primary-500/30">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">Lockbox</h1>
          <p className="text-dark-400 mt-2">Secure Password Manager</p>
        </div>

        {/* Login Card */}
        <div className="card">
          <h2 className="text-xl font-semibold text-white mb-6">Welcome back</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="input-icon-left w-5 h-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input input-with-icon-left"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Master Password
              </label>
              <div className="relative">
                <Lock className="input-icon-left w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input input-with-icon-both"
                  placeholder="Enter your master password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="input-icon-right hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn btn-primary py-3 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Bağlanıyor...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  Kasayı Aç
                </>
              )}
            </button>
          </form>

          {/* Register link */}
          <div className="mt-6 text-center text-dark-400">
            Hesabınız yok mu?{' '}
            <Link to="/register" className="text-primary-400 hover:text-primary-300 transition-colors">
              Bir tane oluşturun
            </Link>
          </div>
        </div>

        {/* Security badge */}
        <div className="mt-6 text-center text-dark-500 text-sm flex items-center justify-center gap-2">
          <Shield className="w-4 h-4" />
          <span>AES-256 Şifrelenmiş • Sıfır Bilgi</span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
