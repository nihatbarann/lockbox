import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  X, 
  Key, 
  FileText, 
  CreditCard, 
  User,
  Eye,
  EyeOff,
  RefreshCw,
  Copy,
  Star,
  Building,
  Calendar,
  Lock,
  Hash
} from 'lucide-react';
import { vaultAPI } from '../services/api';
import { EncryptionService } from '../services/encryption';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import zxcvbn from 'zxcvbn';

interface VaultItem {
  id: string;
  type: string;
  title_encrypted: string;
  data_encrypted: string;
  notes_encrypted?: string;
  url?: string;
  is_favorite: number;
  category_name?: string;
  category_color?: string;
  updated_at: string;
}

interface AddItemModalProps {
  onClose: () => void;
  editingItem?: VaultItem | null;
}

const AddItemModal: React.FC<AddItemModalProps> = ({ onClose, editingItem }) => {
  const [type, setType] = useState<'password' | 'note' | 'card' | 'identity'>('password');
  const [title, setTitle] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Credit Card fields
  const [cardHolderName, setCardHolderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardBrand, setCardBrand] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardPin, setCardPin] = useState('');
  const [bankName, setBankName] = useState('');
  const [showCvv, setShowCvv] = useState(false);
  const [showPin, setShowPin] = useState(false);

  // Password generator options
  const [pwLength, setPwLength] = useState(16);
  const [pwUppercase, setPwUppercase] = useState(true);
  const [pwLowercase, setPwLowercase] = useState(true);
  const [pwNumbers, setPwNumbers] = useState(true);
  const [pwSymbols, setPwSymbols] = useState(true);

  const queryClient = useQueryClient();
  const { encryptionKey } = useAuthStore();

  // Load editing item data
  useEffect(() => {
    if (editingItem) {
      setType(editingItem.type as 'password' | 'note' | 'card' | 'identity');
      setIsFavorite(editingItem.is_favorite === 1);
      
      // Decrypt title
      try {
        const decryptedTitle = EncryptionService.decrypt(editingItem.title_encrypted);
        setTitle(decryptedTitle);
      } catch {
        setTitle('[Cannot decrypt]');
      }

      // Decrypt data
      try {
        const decryptedData = EncryptionService.decrypt(editingItem.data_encrypted);
        const data = JSON.parse(decryptedData);
        
        if (editingItem.type === 'password') {
          setUsername(data.username || '');
          setPassword(data.password || '');
        } else if (editingItem.type === 'note') {
          setNotes(data.content || '');
        } else if (editingItem.type === 'card') {
          setCardHolderName(data.cardHolderName || '');
          setCardNumber(data.cardNumber || '');
          setCardBrand(data.cardBrand || '');
          setExpiryMonth(data.expiryMonth || '');
          setExpiryYear(data.expiryYear || '');
          setCvv(data.cvv || '');
          setCardPin(data.cardPin || '');
          setBankName(data.bankName || '');
        }
      } catch {
        // Decryption failed
      }

      if (editingItem.url) {
        setUrl(editingItem.url);
      }

      // Decrypt notes if present
      if (editingItem.notes_encrypted) {
        try {
          const decryptedNotes = EncryptionService.decrypt(editingItem.notes_encrypted);
          setNotes(decryptedNotes);
        } catch {
          // Decryption failed
        }
      }
    }
  }, [editingItem]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingItem) {
        const response = await vaultAPI.updateItem(editingItem.id, data);
        return response.data;
      } else {
        const response = await vaultAPI.createItem(data);
        return response.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vault-items'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast.success(editingItem ? 'Item updated successfully' : 'Item created successfully');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || (editingItem ? 'Failed to update item' : 'Failed to create item'));
    },
  });

  const generatePassword = () => {
    const newPassword = EncryptionService.generatePassword({
      length: pwLength,
      uppercase: pwUppercase,
      lowercase: pwLowercase,
      numbers: pwNumbers,
      symbols: pwSymbols,
    });
    setPassword(newPassword);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    if (!EncryptionService.getKey()) {
      toast.error('Encryption key not available. Please login again.');
      return;
    }

    // Build data object based on type
    let dataObject: any = {};
    
    if (type === 'password') {
      dataObject = { username, password };
    } else if (type === 'note') {
      dataObject = { content: notes };
    } else if (type === 'card') {
      dataObject = { 
        cardHolderName,
        cardNumber,
        cardBrand,
        expiryMonth,
        expiryYear,
        cvv,
        cardPin,
        bankName
      };
    } else if (type === 'identity') {
      dataObject = { notes };
    }

    // Encrypt data
    const titleEncrypted = EncryptionService.encrypt(title);
    const dataEncrypted = EncryptionService.encrypt(JSON.stringify(dataObject));
    const notesEncrypted = notes ? EncryptionService.encrypt(notes) : undefined;

    createMutation.mutate({
      type,
      titleEncrypted,
      dataEncrypted,
      notesEncrypted,
      url: url || undefined,
      isFavorite,
    });
  };

  const passwordStrength = zxcvbn(password);
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-cyber-blue'];

  const typeOptions = [
    { type: 'password', icon: Key, label: 'Password' },
    { type: 'note', icon: FileText, label: 'Secure Note' },
    { type: 'card', icon: CreditCard, label: 'Card' },
    { type: 'identity', icon: User, label: 'Identity' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-dark-800 rounded-2xl border border-dark-700 shadow-xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-dark-700">
          <h2 className="text-xl font-semibold text-white">
            {editingItem ? 'Edit Item' : 'Add New Item'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-dark-400 hover:text-white transition-colors rounded-lg hover:bg-dark-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Type selector */}
          <div className="grid grid-cols-4 gap-2">
            {typeOptions.map((option) => (
              <button
                key={option.type}
                type="button"
                onClick={() => setType(option.type as any)}
                disabled={!!editingItem}
                className={clsx(
                  "flex flex-col items-center gap-2 p-3 rounded-lg border transition-colors",
                  editingItem && "opacity-50 cursor-not-allowed",
                  type === option.type
                    ? "bg-primary-500/20 border-primary-500/50 text-primary-400"
                    : "bg-dark-700/50 border-dark-600 text-dark-300 hover:border-dark-500"
                )}
              >
                <option.icon className="w-5 h-5" />
                <span className="text-xs">{option.label}</span>
              </button>
            ))}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
              placeholder="e.g., Gmail Account"
              required
            />
          </div>

          {/* Password-specific fields */}
          {type === 'password' && (
            <>
              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Username / Email
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input"
                  placeholder="username@example.com"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input pr-24 font-mono"
                    placeholder="Enter or generate password"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-2 text-dark-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={generatePassword}
                      className="p-2 text-dark-400 hover:text-primary-400 transition-colors"
                      title="Generate password"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(password);
                        toast.success('Copied to clipboard');
                      }}
                      className="p-2 text-dark-400 hover:text-white transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Password strength */}
                {password && (
                  <div className="mt-2">
                    <div className="flex gap-1">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={clsx(
                            "h-1 flex-1 rounded-full transition-colors",
                            i <= passwordStrength.score
                              ? strengthColors[passwordStrength.score]
                              : "bg-dark-600"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Password generator options */}
                <div className="mt-3 p-3 bg-dark-700/50 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-dark-300">Length: {pwLength}</span>
                    <input
                      type="range"
                      min="8"
                      max="64"
                      value={pwLength}
                      onChange={(e) => setPwLength(Number(e.target.value))}
                      className="w-32"
                    />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { label: 'A-Z', value: pwUppercase, setter: setPwUppercase },
                      { label: 'a-z', value: pwLowercase, setter: setPwLowercase },
                      { label: '0-9', value: pwNumbers, setter: setPwNumbers },
                      { label: '!@#', value: pwSymbols, setter: setPwSymbols },
                    ].map((opt) => (
                      <label key={opt.label} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={opt.value}
                          onChange={(e) => opt.setter(e.target.checked)}
                          className="rounded border-dark-500 text-primary-500 focus:ring-primary-500"
                        />
                        <span className="text-sm text-dark-300">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* URL */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Website URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="input"
                  placeholder="https://example.com"
                />
              </div>
            </>
          )}

          {/* Credit Card fields */}
          {type === 'card' && (
            <>
              {/* Bank Name */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Bank Name
                </label>
                <div className="relative">
                  <Building className="input-icon-left w-5 h-5" />
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="input input-with-icon-left"
                    placeholder="e.g., Chase, Wells Fargo"
                  />
                </div>
              </div>

              {/* Card Holder Name */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Cardholder Name
                </label>
                <div className="relative">
                  <User className="input-icon-left w-5 h-5" />
                  <input
                    type="text"
                    value={cardHolderName}
                    onChange={(e) => setCardHolderName(e.target.value)}
                    className="input input-with-icon-left"
                    placeholder="Name on card"
                  />
                </div>
              </div>

              {/* Card Number */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Card Number
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <CreditCard className="w-5 h-5 text-dark-400" />
                  </div>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => {
                      // Format card number with spaces
                      const value = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
                      const formatted = value.replace(/(.{4})/g, '$1 ').trim();
                      setCardNumber(formatted.slice(0, 19)); // Max 16 digits + 3 spaces
                    }}
                    className="input pl-11 font-mono tracking-wider"
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                  />
                </div>
              </div>

              {/* Card Brand */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Card Brand
                </label>
                <select
                  value={cardBrand}
                  onChange={(e) => setCardBrand(e.target.value)}
                  className="input"
                >
                  <option value="">Select brand</option>
                  <option value="visa">Visa</option>
                  <option value="mastercard">Mastercard</option>
                  <option value="amex">American Express</option>
                  <option value="discover">Discover</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Expiry Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Expiry Month
                  </label>
                  <div className="relative">
                    <Calendar className="input-icon-left w-5 h-5" />
                    <select
                      value={expiryMonth}
                      onChange={(e) => setExpiryMonth(e.target.value)}
                      className="input input-with-icon-left"
                    >
                      <option value="">MM</option>
                      {Array.from({ length: 12 }, (_, i) => {
                        const month = String(i + 1).padStart(2, '0');
                        return <option key={month} value={month}>{month}</option>;
                      })}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Expiry Year
                  </label>
                  <select
                    value={expiryYear}
                    onChange={(e) => setExpiryYear(e.target.value)}
                    className="input"
                  >
                    <option value="">YYYY</option>
                    {Array.from({ length: 15 }, (_, i) => {
                      const year = String(new Date().getFullYear() + i);
                      return <option key={year} value={year}>{year}</option>;
                    })}
                  </select>
                </div>
              </div>

              {/* CVV and PIN */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    CVV / CVC
                  </label>
                  <div className="relative">
                    <Lock className="input-icon-left w-5 h-5" />
                    <input
                      type={showCvv ? 'text' : 'password'}
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="input input-with-icon-both font-mono"
                      placeholder="•••"
                      maxLength={4}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCvv(!showCvv)}
                      className="input-icon-right hover:text-white transition-colors cursor-pointer"
                    >
                      {showCvv ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    PIN (optional)
                  </label>
                  <div className="relative">
                    <Hash className="input-icon-left w-5 h-5" />
                    <input
                      type={showPin ? 'text' : 'password'}
                      value={cardPin}
                      onChange={(e) => setCardPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="input input-with-icon-both"
                      placeholder="000000"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="input-icon-right hover:text-white transition-colors cursor-pointer"
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Secure Note specific - larger text area */}
          {type === 'note' && (
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Secure Note Content *
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input min-h-[200px] resize-y font-mono"
                placeholder="Enter your secure note content here..."
                required
              />
              <p className="text-xs text-dark-500 mt-2">
                Your note will be encrypted with AES-256 encryption.
              </p>
            </div>
          )}

          {/* Notes for non-note types */}
          {type !== 'note' && (
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input min-h-[80px] resize-y"
                placeholder="Additional notes..."
              />
            </div>
          )}

          {/* Favorite toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isFavorite}
              onChange={(e) => setIsFavorite(e.target.checked)}
              className="sr-only"
            />
            <div className={clsx(
              "p-2 rounded-lg transition-colors",
              isFavorite ? "bg-amber-500/20" : "bg-dark-700"
            )}>
              <Star className={clsx(
                "w-5 h-5 transition-colors",
                isFavorite ? "text-amber-400 fill-amber-400" : "text-dark-400"
              )} />
            </div>
            <span className="text-dark-300">Add to favorites</span>
          </label>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-dark-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 btn btn-primary"
            >
              {createMutation.isPending ? (editingItem ? 'Updating...' : 'Saving...') : (editingItem ? 'Update Item' : 'Save Item')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddItemModal;
