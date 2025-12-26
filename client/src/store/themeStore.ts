/**
 * Theme Store
 * Manages theme state with Zustand
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'dark' | 'light' | 'system';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  getEffectiveTheme: () => 'dark' | 'light';
}

// Apply theme to document
const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  
  let effectiveTheme: 'dark' | 'light';
  
  if (theme === 'system') {
    effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } else {
    effectiveTheme = theme;
  }
  
  root.classList.remove('dark', 'light');
  root.classList.add(effectiveTheme);
  
  // Update meta theme-color
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', effectiveTheme === 'dark' ? '#0f172a' : '#ffffff');
  }
  
  return effectiveTheme;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      
      setTheme: (theme: Theme) => {
        applyTheme(theme);
        set({ theme });
      },
      
      getEffectiveTheme: () => {
        const { theme } = get();
        if (theme === 'system') {
          return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return theme;
      },
    }),
    {
      name: 'lockbox-theme',
      onRehydrateStorage: () => (state) => {
        // Apply theme when store is rehydrated
        if (state) {
          applyTheme(state.theme);
        }
      },
    }
  )
);

// Listen for system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const { theme, setTheme } = useThemeStore.getState();
    if (theme === 'system') {
      applyTheme('system');
    }
  });
}

// Initialize theme on load
if (typeof window !== 'undefined') {
  const savedTheme = localStorage.getItem('lockbox-theme');
  if (savedTheme) {
    try {
      const parsed = JSON.parse(savedTheme);
      applyTheme(parsed.state?.theme || 'dark');
    } catch {
      applyTheme('dark');
    }
  } else {
    applyTheme('dark');
  }
}
