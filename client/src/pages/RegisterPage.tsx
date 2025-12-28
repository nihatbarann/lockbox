import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Mail, Lock, Eye, EyeOff, Loader2, Check, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { EncryptionService } from '../services/encryption';
import toast from 'react-hot-toast';
import zxcvbn from 'zxcvbn';

const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { register, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  // Memoize password strength calculation to avoid recalculating on every render
  const passwordStrength = useMemo(() => zxcvbn(password), [password]);
  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-cyber-blue'];

  const requirements = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Contains lowercase letter', met: /[a-z]/.test(password) },
    { label: 'Contains number', met: /[0-9]/.test(password) },
    { label: 'Contains special character', met: /[^a-zA-Z0-9]/.test(password) },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isLoading) return;
    
    clearError();

    if (!email || !password || !confirmPassword) {
      toast.error('Lütfen tüm alanları doldurunuz');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Şifreler eşleşmiyor');
      return;
    }

    if (password.length < 8) {
      toast.error('Şifre en az 8 karakter olmalıdır');
      return;
    }

    try {
      await register(email, password, confirmPassword);
      // Set encryption key in client-side encryption service
      const { encryptionKey } = useAuthStore.getState();
      if (encryptionKey) {
        EncryptionService.setKey(encryptionKey);
      }
      toast.success('Hesap başarıyla oluşturuldu!');
      navigate('/vault');
    } catch (err: any) {
      console.error('Register error:', err);
      toast.error(err.message || 'Kayıt başarısız');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-dark-900 via-dark-800 to-primary-950">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-cyber-purple/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-cyber-purple to-primary-500 mb-4 shadow-lg shadow-cyber-purple/30">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">Lockbox</h1>
          <p className="text-dark-400 mt-2">Güvenli kasanızı oluşturun</p>
        </div>

        {/* Register Card */}
        <div className="card">
          <h2 className="text-xl font-semibold text-white mb-6">Hesap Oluştur</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                E-Posta Adresi
              </label>
              <div className="relative">
                <Mail className="input-icon-left w-5 h-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input input-with-icon-left"
                  placeholder="siz@ornek.com"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Ana Şifre
              </label>
              <div className="relative">
                <Lock className="input-icon-left w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input input-with-icon-both"
                  placeholder="Güçlü bir ana şifre oluşturun"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="input-icon-right hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Password strength indicator */}
              {password && (
                <div className="mt-3 space-y-2">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          i <= passwordStrength.score
                            ? strengthColors[passwordStrength.score]
                            : 'bg-dark-600'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-sm ${strengthColors[passwordStrength.score].replace('bg-', 'text-')}`}>
                    {strengthLabels[passwordStrength.score]}
                  </p>
                </div>
              )}

              {/* Password requirements */}
              {password && (
                <div className="mt-3 space-y-1">
                  {requirements.map((req, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      {req.met ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <X className="w-4 h-4 text-dark-500" />
                      )}
                      <span className={req.met ? 'text-green-400' : 'text-dark-400'}>
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Şifreyi Onayla
              </label>
              <div className="relative">
                <Lock className="input-icon-left w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input input-with-icon-both"
                  placeholder="Ana şifrenizi onaylayın"
                  autoComplete="new-password"
                />
                {confirmPassword && (
                  <div className="input-icon-right">
                    {password === confirmPassword ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : (
                      <X className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Warning */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-sm">
              <strong>Önemli:</strong> Ana şifreniz kurtarılamaz. Lütfen bunu hatırlayın!
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
                  Kasa oluşturuluyor...
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  Güvenli Kasa Oluştur
                </>
              )}
            </button>
          </form>

          {/* Login link */}
          <div className="mt-6 text-center text-dark-400">
            Zaten hesabınız var mı?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300 transition-colors">
              Giriş yapın
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
