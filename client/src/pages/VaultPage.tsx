import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Search, 
  Key, 
  FileText, 
  CreditCard, 
  User,
  Star,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  Edit,
  ExternalLink,
  RefreshCw,
  Filter,
  X
} from 'lucide-react';
import { vaultAPI } from '../services/api';
import { EncryptionService } from '../services/encryption';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import AddItemModal from '../components/AddItemModal';

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

const VaultPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['vault-items', selectedType, showFavorites],
    queryFn: async () => {
      const params: any = {};
      if (selectedType) params.type = selectedType;
      if (showFavorites) params.favorites = true;
      const response = await vaultAPI.getItems(params);
      return response.data.items;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => vaultAPI.deleteItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vault-items'] });
      toast.success('Item deleted');
    },
    onError: () => {
      toast.error('Failed to delete item');
    },
  });

  const typeFilters = [
    { type: 'password', icon: Key, label: 'Passwords', color: 'text-primary-400' },
    { type: 'note', icon: FileText, label: 'Notes', color: 'text-green-400' },
    { type: 'card', icon: CreditCard, label: 'Cards', color: 'text-amber-400' },
    { type: 'identity', icon: User, label: 'Identity', color: 'text-pink-400' },
  ];

  const decryptTitle = (encrypted: string): string => {
    try {
      return EncryptionService.decrypt(encrypted);
    } catch {
      return '[Encrypted]';
    }
  };

  const decryptData = (encrypted: string): any => {
    try {
      const decrypted = EncryptionService.decrypt(encrypted);
      return JSON.parse(decrypted);
    } catch {
      return null;
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
      
      // Auto-clear after 30 seconds
      setTimeout(() => {
        navigator.clipboard.writeText('');
      }, 30000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredItems = data?.filter((item: VaultItem) => {
    if (!searchQuery) return true;
    const title = decryptTitle(item.title_encrypted).toLowerCase();
    return title.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Vault</h1>
          <p className="text-dark-400 mt-1">Your secure password storage</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Item
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search vault..."
            className="input pl-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Type filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          {typeFilters.map((filter) => (
            <button
              key={filter.type}
              onClick={() => setSelectedType(selectedType === filter.type ? null : filter.type)}
              className={clsx(
                "flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition-colors",
                selectedType === filter.type
                  ? "bg-primary-500/20 text-primary-400 border border-primary-500/30"
                  : "bg-dark-700/50 text-dark-300 hover:bg-dark-700 hover:text-white"
              )}
            >
              <filter.icon className={clsx("w-4 h-4", filter.color)} />
              <span className="text-sm">{filter.label}</span>
            </button>
          ))}
          
          {/* Favorites filter */}
          <button
            onClick={() => setShowFavorites(!showFavorites)}
            className={clsx(
              "flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition-colors",
              showFavorites
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : "bg-dark-700/50 text-dark-300 hover:bg-dark-700 hover:text-white"
            )}
          >
            <Star className="w-4 h-4" />
            <span className="text-sm">Favorites</span>
          </button>
        </div>
      </div>

      {/* Items Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-6 bg-dark-700 rounded w-3/4 mb-4" />
              <div className="h-4 bg-dark-700 rounded w-1/2 mb-2" />
              <div className="h-4 bg-dark-700 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filteredItems?.length === 0 ? (
        <div className="text-center py-16">
          <Key className="w-16 h-16 text-dark-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No items found</h3>
          <p className="text-dark-400 mb-6">
            {searchQuery ? 'Try a different search term' : 'Add your first password to get started'}
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Item
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems?.map((item: VaultItem) => {
            const title = decryptTitle(item.title_encrypted);
            const data = decryptData(item.data_encrypted);
            const isPasswordVisible = visiblePasswords.has(item.id);

            return (
              <div
                key={item.id}
                className="card card-hover group relative"
              >
                {/* Favorite badge */}
                {item.is_favorite === 1 && (
                  <Star className="absolute top-4 right-4 w-5 h-5 text-amber-400 fill-amber-400" />
                )}

                {/* Type icon & Title */}
                <div className="flex items-start gap-3 mb-4">
                  <div className={clsx(
                    "p-2 rounded-lg",
                    item.type === 'password' && "bg-primary-500/20",
                    item.type === 'note' && "bg-green-500/20",
                    item.type === 'card' && "bg-amber-500/20",
                    item.type === 'identity' && "bg-pink-500/20",
                  )}>
                    {item.type === 'password' && <Key className="w-5 h-5 text-primary-400" />}
                    {item.type === 'note' && <FileText className="w-5 h-5 text-green-400" />}
                    {item.type === 'card' && <CreditCard className="w-5 h-5 text-amber-400" />}
                    {item.type === 'identity' && <User className="w-5 h-5 text-pink-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{title}</h3>
                    {item.category_name && (
                      <span 
                        className="text-xs px-2 py-0.5 rounded-full mt-1 inline-block"
                        style={{ 
                          backgroundColor: `${item.category_color}20`,
                          color: item.category_color 
                        }}
                      >
                        {item.category_name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Content based on type */}
                {item.type === 'password' && data && (
                  <div className="space-y-2">
                    {data.username && (
                      <div className="flex items-center justify-between">
                        <span className="text-dark-400 text-sm">Username</span>
                        <div className="flex items-center gap-2">
                          <span className="text-dark-200 text-sm truncate max-w-[150px]">
                            {data.username}
                          </span>
                          <button
                            onClick={() => copyToClipboard(data.username, 'Username')}
                            className="p-1 text-dark-400 hover:text-white transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                    {data.password && (
                      <div className="flex items-center justify-between">
                        <span className="text-dark-400 text-sm">Password</span>
                        <div className="flex items-center gap-2">
                          <span className="text-dark-200 text-sm font-mono">
                            {isPasswordVisible ? data.password : '••••••••'}
                          </span>
                          <button
                            onClick={() => togglePasswordVisibility(item.id)}
                            className="p-1 text-dark-400 hover:text-white transition-colors"
                          >
                            {isPasswordVisible ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => copyToClipboard(data.password, 'Password')}
                            className="p-1 text-dark-400 hover:text-white transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* URL */}
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary-400 text-sm mt-3 hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {new URL(item.url).hostname}
                  </a>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-dark-700/50 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setSelectedItem(item)}
                    className="p-2 text-dark-400 hover:text-white transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this item?')) {
                        deleteMutation.mutate(item.id);
                      }
                    }}
                    className="p-2 text-dark-400 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <AddItemModal onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
};

export default VaultPage;
