import React, { useState, useEffect } from 'react';
import {
  Copy,
  RefreshCw,
  Lock,
  User,
  Key,
  Hash,
  Lock as LockIcon,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import CryptoJS from 'crypto-js';

const ToolsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'password' | 'username' | 'productkey' | 'md5' | 'sha1' | 'aes'>('password');
  const [results, setResults] = useState<{ [key: string]: any }>({});

  // Password Generator Settings
  const [passwordLength, setPasswordLength] = useState(16);
  const [passwordSettings, setPasswordSettings] = useState({
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
  });

  // Username Generator Settings
  const [usernameLength, setUsernameLength] = useState(10);
  const [usernameSettings, setUsernameSettings] = useState({
    uppercase: true,
    lowercase: true,
    numbers: true,
  });

  // Password Generator
  const generatePassword = (length: number = passwordLength, settings = passwordSettings) => {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let chars = '';
    if (settings.lowercase) chars += lowercase;
    if (settings.uppercase) chars += uppercase;
    if (settings.numbers) chars += numbers;
    if (settings.symbols) chars += symbols;

    if (chars.length === 0) {
      toast.error('Select at least one character type');
      return '';
    }

    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // Username Generator - Realistic usernames
  const generateUsername = (length: number = usernameLength, settings = usernameSettings) => {
    const adjectives = ['swift', 'rapid', 'silent', 'noble', 'brave', 'smart', 'quick', 'dark', 'cyber', 'digital', 'epic', 'ultra', 'mega', 'nexus', 'apex', 'sonic', 'volt', 'nova', 'titan', 'zen'];
    const nouns = ['fox', 'wolf', 'hawk', 'dragon', 'phoenix', 'tiger', 'ninja', 'shadow', 'knight', 'viper', 'ace', 'sage', 'storm', 'forge', 'blaze', 'prime', 'core', 'flux', 'spark', 'blade'];

    let username = '';

    // Randomly decide structure: adjective+noun or adjective+noun+number
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];

    username = adj + noun; // e.g., "swiftfox"

    // Add random number if needed to reach desired length
    if (username.length < length && settings.numbers) {
      const numDigits = Math.min(3, length - username.length);
      for (let i = 0; i < numDigits; i++) {
        username += Math.floor(Math.random() * 10);
      }
    }

    // Capitalize first letter if uppercase enabled
    if (settings.uppercase) {
      username = username.charAt(0).toUpperCase() + username.slice(1);
    }

    // If still shorter than desired, add more characters
    while (username.length < length) {
      const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
      username += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return username.substring(0, length);
  };

  // Product Key / License Key Generator
  const generateProductKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = '';
    for (let i = 0; i < 25; i++) {
      if (i > 0 && i % 5 === 0) key += '-';
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  };

  // Passphrase Generator
  const generatePassphrase = (wordCount: number = 8) => {
    const wordList = [
      'apple', 'banana', 'cherry', 'dragon', 'eagle', 'forest', 'guitar', 'horizon',
      'island', 'jungle', 'knight', 'lightning', 'mountain', 'nebula', 'ocean', 'phoenix',
      'quantum', 'river', 'shadow', 'thunder', 'umbrella', 'valley', 'whisper', 'xenial',
      'yellow', 'zealous', 'anchor', 'beacon', 'castle', 'diamond', 'element', 'flower',
    ];

    let passphrase = '';
    for (let i = 0; i < wordCount; i++) {
      const word = wordList[Math.floor(Math.random() * wordList.length)];
      passphrase += (i === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word);
      if (i < wordCount - 1) passphrase += '-';
    }
    return passphrase;
  };

  // MD5 Hash
  const generateMD5 = (text: string) => {
    if (!text) {
      toast.error('Please enter text to hash');
      return;
    }
    const hash = CryptoJS.MD5(text).toString();
    setResults(prev => ({ ...prev, md5: hash }));
    toast.success('MD5 hash generated');
  };

  // SHA1 Hash
  const generateSHA1 = (text: string) => {
    if (!text) {
      toast.error('Please enter text to hash');
      return;
    }
    const hash = CryptoJS.SHA1(text).toString();
    setResults(prev => ({ ...prev, sha1: hash }));
    toast.success('SHA1 hash generated');
  };

  // AES Encryption
  const encryptAES = (text: string, key: string) => {
    if (!text || !key) {
      toast.error('Please enter both text and key');
      return;
    }
    try {
      const encrypted = CryptoJS.AES.encrypt(text, key).toString();
      setResults(prev => ({ ...prev, aes: encrypted }));
      toast.success('Text encrypted with AES');
    } catch (error) {
      toast.error('Encryption failed');
    }
  };

  // AES Decryption
  const decryptAES = (encrypted: string, key: string) => {
    if (!encrypted || !key) {
      toast.error('Please enter both encrypted text and key');
      return;
    }
    try {
      const decrypted = CryptoJS.AES.decrypt(encrypted, key).toString(CryptoJS.enc.Utf8);
      if (!decrypted) {
        toast.error('Decryption failed - wrong key or invalid data');
        return;
      }
      setResults(prev => ({ ...prev, aesDecrypted: decrypted }));
      toast.success('Text decrypted successfully');
    } catch (error) {
      toast.error('Decryption failed');
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch {
      toast.error('Failed to copy');
    }
  };

  // Initialize with generated values
  useEffect(() => {
    const pwd = generatePassword(16, passwordSettings);
    const username = generateUsername(10, usernameSettings);
    const phrase = generatePassphrase(8);
    if (pwd && username && phrase) {
      setResults({
        password: pwd,
        username: username,
        passphrase: phrase,
        passphraseWords: 8,
      });
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col py-8">
      <div className="max-w-3xl mx-auto w-full space-y-8 animate-fade-in">
        {/* Header */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 to-cyber-blue/10 rounded-2xl blur-xl" />
          <div className="relative px-4 py-4">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-6 h-6 text-primary-400" />
              <h1 className="text-2xl font-bold text-white">Security Tools</h1>
            </div>
            <p className="text-dark-400 text-sm">Powerful generators and encryption utilities</p>
          </div>
        </div>

        {/* Tabs - Modern Design */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { id: 'password', label: 'Password', icon: Lock },
            { id: 'username', label: 'Username', icon: User },
            { id: 'productkey', label: 'Product Key', icon: Key },
            { id: 'md5', label: 'MD5', icon: Hash },
            { id: 'sha1', label: 'SHA1', icon: Hash },
            { id: 'aes', label: 'AES', icon: LockIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`group relative p-3 rounded-xl transition-all duration-300 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-br from-primary-500/20 to-primary-400/10 border border-primary-500/30 shadow-lg shadow-primary-500/10'
                  : 'bg-dark-700/50 border border-dark-700/50 hover:bg-dark-700 hover:border-dark-600'
              }`}
            >
              <tab.icon className={`w-6 h-6 mx-auto mb-2 transition-colors ${activeTab === tab.id ? 'text-primary-400' : 'text-dark-300 group-hover:text-white'}`} />
              <span className={`text-xs font-medium block transition-colors ${activeTab === tab.id ? 'text-primary-400' : 'text-dark-300 group-hover:text-white'}`}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="card border border-dark-700/30 bg-dark-800/50 backdrop-blur-sm">
          {/* Password Generator */}
          {activeTab === 'password' && (
            <div className="space-y-6 p-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                  <Lock className="w-6 h-6 text-primary-400" />
                  Password Generator
                </h2>
                <p className="text-dark-300 text-sm">Create strong, customizable passwords</p>
              </div>

              {/* Result */}
              {results.password && (
                <div className="p-5 bg-gradient-to-r from-primary-500/10 to-dark-700/50 rounded-xl border border-primary-500/20 space-y-3">
                  <p className="text-sm font-medium text-dark-400">Generated Password:</p>
                  <div className="flex items-center gap-3 bg-dark-900/50 p-4 rounded-lg border border-primary-500/10">
                    <code className="flex-1 text-primary-400 font-mono text-sm break-all select-all font-bold">{results.password}</code>
                    <button
                      onClick={() => copyToClipboard(results.password, 'Password')}
                      className="p-2 text-dark-400 hover:text-primary-400 transition-colors flex-shrink-0"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Length Slider */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-dark-300">Password Length</label>
                  <span className="text-2xl font-bold text-primary-400">{passwordLength}</span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="64"
                  value={passwordLength}
                  onChange={(e) => {
                    const newLength = parseInt(e.target.value);
                    setPasswordLength(newLength);
                    const pwd = generatePassword(newLength, passwordSettings);
                    if (pwd) setResults(prev => ({ ...prev, password: pwd }));
                  }}
                  className="w-full h-3 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
                />
                <div className="flex justify-between text-xs text-dark-400">
                  <span>8</span>
                  <span>64</span>
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={() => {
                  const pwd = generatePassword(passwordLength, passwordSettings);
                  if (pwd) setResults(prev => ({ ...prev, password: pwd }));
                }}
                className="w-full btn bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Generate New Password
              </button>

              {/* Character Type Toggles */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-dark-300">Character Types:</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'uppercase', label: 'Uppercase (A-Z)' },
                    { key: 'lowercase', label: 'Lowercase (a-z)' },
                    { key: 'numbers', label: 'Numbers (0-9)' },
                    { key: 'symbols', label: 'Symbols (!@#$%)' },
                  ].map((type) => (
                    <label
                      key={type.key}
                      className="flex items-center gap-3 p-3 bg-dark-700/30 rounded-lg hover:bg-dark-700/50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={passwordSettings[type.key as keyof typeof passwordSettings]}
                        onChange={(e) => {
                          const newSettings = {
                            ...passwordSettings,
                            [type.key]: e.target.checked,
                          };
                          setPasswordSettings(newSettings);
                          const pwd = generatePassword(passwordLength, newSettings);
                          if (pwd) setResults(prev => ({ ...prev, password: pwd }));
                        }}
                        className="w-4 h-4 rounded accent-primary-500"
                      />
                      <span className="text-sm text-dark-300">{type.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Username Generator */}
          {activeTab === 'username' && (
            <div className="space-y-6 p-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                  <User className="w-6 h-6 text-purple-400" />
                  Username Generator
                </h2>
                <p className="text-dark-300 text-sm">Create unique and custom usernames</p>
              </div>

              {/* Result */}
              {results.username && (
                <div className="p-5 bg-gradient-to-r from-purple-500/10 to-dark-700/50 rounded-xl border border-purple-500/20 space-y-3">
                  <p className="text-sm font-medium text-dark-400">Generated Username:</p>
                  <div className="flex items-center gap-3 bg-dark-900/50 p-4 rounded-lg border border-purple-500/10">
                    <code className="flex-1 text-purple-400 font-mono text-sm break-all select-all font-bold">{results.username}</code>
                    <button
                      onClick={() => copyToClipboard(results.username, 'Username')}
                      className="p-2 text-dark-400 hover:text-purple-400 transition-colors flex-shrink-0"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Length Slider */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-dark-300">Username Length</label>
                  <span className="text-2xl font-bold text-purple-400">{usernameLength}</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="32"
                  value={usernameLength}
                  onChange={(e) => {
                    const newLength = parseInt(e.target.value);
                    setUsernameLength(newLength);
                    const username = generateUsername(newLength, usernameSettings);
                    if (username) setResults(prev => ({ ...prev, username }));
                  }}
                  className="w-full h-3 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <div className="flex justify-between text-xs text-dark-400">
                  <span>5</span>
                  <span>32</span>
                </div>
              </div>

              {/* Character Type Toggles */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-dark-300">Username Style:</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'uppercase', label: 'Uppercase' },
                    { key: 'lowercase', label: 'Lowercase' },
                    { key: 'numbers', label: 'Numbers' },
                  ].map((type) => (
                    <label
                      key={type.key}
                      className="flex items-center gap-3 p-3 bg-dark-700/30 rounded-lg hover:bg-dark-700/50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={usernameSettings[type.key as keyof typeof usernameSettings]}
                        onChange={(e) => {
                          const newSettings = {
                            ...usernameSettings,
                            [type.key]: e.target.checked,
                          };
                          setUsernameSettings(newSettings);
                          const username = generateUsername(usernameLength, newSettings);
                          if (username) setResults(prev => ({ ...prev, username }));
                        }}
                        className="w-4 h-4 rounded accent-purple-500"
                      />
                      <span className="text-sm text-dark-300">{type.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={() => {
                  const username = generateUsername(usernameLength, usernameSettings);
                  if (username) setResults(prev => ({ ...prev, username }));
                }}
                className="w-full btn bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Generate New Username
              </button>
            </div>
          )}

          {/* Product Key Generator */}
          {activeTab === 'productkey' && (
            <div className="space-y-6 p-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                  <Key className="w-6 h-6 text-amber-400" />
                  Product Key & Passphrase Generator
                </h2>
                <p className="text-dark-300 text-sm">Generate license keys and secure passphrases</p>
              </div>

              {/* Product Key */}
              <div className="space-y-3 p-4 bg-dark-700/30 rounded-xl border border-dark-700/50">
                <h3 className="font-medium text-white">Product Key (XXXXX-XXXXX-XXXXX...)</h3>
                <button
                  onClick={() => {
                    const key = generateProductKey();
                    setResults(prev => ({ ...prev, productkey: key }));
                  }}
                  className="w-full btn bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Generate Product Key
                </button>
                {results.productkey && (
                  <div className="flex items-center gap-2 bg-dark-900/50 p-3 rounded-lg">
                    <code className="flex-1 text-amber-400 font-mono text-sm font-bold tracking-widest select-all">{results.productkey}</code>
                    <button
                      onClick={() => copyToClipboard(results.productkey, 'Product Key')}
                      className="p-2 text-dark-400 hover:text-amber-400 transition-colors"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Passphrase */}
              <div className="space-y-4 p-5 bg-dark-700/30 rounded-xl border border-dark-700/50">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Key className="w-5 h-5 text-amber-400" />
                  Passphrase Generator (Word-based)
                </h3>
                <p className="text-sm text-dark-300">Select number of words for your passphrase</p>

                <div className="space-y-3">
                  <input
                    type="range"
                    min="6"
                    max="20"
                    value={results.passphraseWords || 8}
                    onChange={(e) => {
                      const count = parseInt(e.target.value);
                      const phrase = generatePassphrase(count);
                      setResults(prev => ({ ...prev, passphrase: phrase, passphraseWords: count }));
                    }}
                    className="w-full h-3 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-dark-400">6 words</span>
                    <span className="text-lg font-bold text-amber-400">{results.passphraseWords || 8} words</span>
                    <span className="text-xs text-dark-400">20 words</span>
                  </div>
                </div>

                {results.passphrase && (
                  <div className="mt-3 flex items-center gap-2 bg-dark-900/50 p-4 rounded-lg border border-amber-500/10">
                    <code className="flex-1 text-amber-400 font-mono text-sm break-all select-all font-semibold">{results.passphrase}</code>
                    <button
                      onClick={() => copyToClipboard(results.passphrase, 'Passphrase')}
                      className="p-2 text-dark-400 hover:text-amber-400 transition-colors flex-shrink-0"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MD5 Generator */}
          {activeTab === 'md5' && (
            <div className="space-y-6 p-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                  <Hash className="w-6 h-6 text-cyan-400" />
                  MD5 Hash Generator
                </h2>
                <p className="text-dark-300 text-sm">Convert text to MD5 hash</p>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  id="md5-input"
                  placeholder="Enter text to hash"
                  className="input"
                />
                <button
                  onClick={() => {
                    const input = (document.getElementById('md5-input') as HTMLInputElement).value;
                    generateMD5(input);
                  }}
                  className="w-full btn bg-cyan-600 hover:bg-cyan-700 text-white flex items-center justify-center gap-2 py-3"
                >
                  <Hash className="w-5 h-5" />
                  Generate MD5
                </button>
              </div>

              {results.md5 && (
                <div className="p-4 bg-gradient-to-r from-cyan-500/10 to-dark-700/50 rounded-xl border border-cyan-500/20 space-y-2">
                  <p className="text-sm text-dark-400">MD5 Hash:</p>
                  <div className="flex items-center gap-2 bg-dark-900/50 p-3 rounded-lg">
                    <code className="flex-1 text-cyan-400 font-mono text-xs break-all select-all">{results.md5}</code>
                    <button
                      onClick={() => copyToClipboard(results.md5, 'MD5')}
                      className="p-2 text-dark-400 hover:text-cyan-400 transition-colors"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SHA1 Generator */}
          {activeTab === 'sha1' && (
            <div className="space-y-6 p-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                  <Hash className="w-6 h-6 text-green-400" />
                  SHA1 Hash Generator
                </h2>
                <p className="text-dark-300 text-sm">Convert text to SHA1 hash</p>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  id="sha1-input"
                  placeholder="Enter text to hash"
                  className="input"
                />
                <button
                  onClick={() => {
                    const input = (document.getElementById('sha1-input') as HTMLInputElement).value;
                    generateSHA1(input);
                  }}
                  className="w-full btn bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2 py-3"
                >
                  <Hash className="w-5 h-5" />
                  Generate SHA1
                </button>
              </div>

              {results.sha1 && (
                <div className="p-4 bg-gradient-to-r from-green-500/10 to-dark-700/50 rounded-xl border border-green-500/20 space-y-2">
                  <p className="text-sm text-dark-400">SHA1 Hash:</p>
                  <div className="flex items-center gap-2 bg-dark-900/50 p-3 rounded-lg">
                    <code className="flex-1 text-green-400 font-mono text-xs break-all select-all">{results.sha1}</code>
                    <button
                      onClick={() => copyToClipboard(results.sha1, 'SHA1')}
                      className="p-2 text-dark-400 hover:text-green-400 transition-colors"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AES Encryption/Decryption */}
          {activeTab === 'aes' && (
            <div className="space-y-6 p-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                  <LockIcon className="w-6 h-6 text-red-400" />
                  AES-256 Encryption
                </h2>
                <p className="text-dark-300 text-sm">Encrypt and decrypt text securely</p>
              </div>

              {/* Encryption Section */}
              <div className="border border-dark-700/50 rounded-xl p-4 space-y-3 bg-dark-700/20">
                <h3 className="font-medium text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-red-400" />
                  Encrypt Text
                </h3>
                <div className="space-y-2">
                  <input
                    type="text"
                    id="aes-text"
                    placeholder="Text to encrypt"
                    className="input"
                  />
                  <input
                    type="password"
                    id="aes-key-enc"
                    placeholder="Encryption key/password"
                    className="input"
                  />
                </div>
                <button
                  onClick={() => {
                    const text = (document.getElementById('aes-text') as HTMLInputElement).value;
                    const key = (document.getElementById('aes-key-enc') as HTMLInputElement).value;
                    encryptAES(text, key);
                  }}
                  className="w-full btn bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  Encrypt
                </button>
              </div>

              {results.aes && (
                <div className="p-4 bg-gradient-to-r from-red-500/10 to-dark-700/50 rounded-xl border border-red-500/20 space-y-2">
                  <p className="text-sm text-dark-400">Encrypted Text:</p>
                  <div className="flex items-center gap-2 bg-dark-900/50 p-3 rounded-lg">
                    <code className="flex-1 text-red-400 font-mono text-xs break-all max-h-16 overflow-auto select-all">{results.aes}</code>
                    <button
                      onClick={() => copyToClipboard(results.aes, 'Encrypted text')}
                      className="p-2 text-dark-400 hover:text-red-400 transition-colors flex-shrink-0"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Decryption Section */}
              <div className="border border-dark-700/50 rounded-xl p-4 space-y-3 bg-dark-700/20 mt-6">
                <h3 className="font-medium text-white flex items-center gap-2">
                  <LockIcon className="w-4 h-4 text-green-400" />
                  Decrypt Text
                </h3>
                <div className="space-y-2">
                  <textarea
                    id="aes-encrypted"
                    placeholder="Encrypted text (paste here)"
                    className="input min-h-20"
                  />
                  <input
                    type="password"
                    id="aes-key-dec"
                    placeholder="Decryption key/password"
                    className="input"
                  />
                </div>
                <button
                  onClick={() => {
                    const encrypted = (document.getElementById('aes-encrypted') as HTMLTextAreaElement).value;
                    const key = (document.getElementById('aes-key-dec') as HTMLInputElement).value;
                    decryptAES(encrypted, key);
                  }}
                  className="w-full btn bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2"
                >
                  <LockIcon className="w-4 h-4" />
                  Decrypt
                </button>
              </div>

              {results.aesDecrypted && (
                <div className="p-4 bg-gradient-to-r from-green-500/10 to-dark-700/50 rounded-xl border border-green-500/20 space-y-2">
                  <p className="text-sm text-dark-400">Decrypted Text:</p>
                  <div className="flex items-center gap-2 bg-dark-900/50 p-3 rounded-lg">
                    <code className="flex-1 text-green-400 font-mono text-sm break-all select-all">{results.aesDecrypted}</code>
                    <button
                      onClick={() => copyToClipboard(results.aesDecrypted, 'Decrypted text')}
                      className="p-2 text-dark-400 hover:text-green-400 transition-colors"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ToolsPage;
