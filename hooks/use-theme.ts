/**
 * useTheme Hook
 * Custom hook for managing theme state and toggle
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Theme } from '@/lib/theme';
import { getTheme, setTheme } from '@/lib/theme';

export const useTheme = () => {
  const [theme, setThemeState] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  // Initialize theme on mount
  useEffect(() => {
    const initialTheme = getTheme();
    setThemeState(initialTheme);
    setMounted(true);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      setTheme(next);
      return next;
    });
  }, []);

  return {
    theme,
    mounted,
    toggleTheme,
    isDark: theme === 'dark',
  };
};
