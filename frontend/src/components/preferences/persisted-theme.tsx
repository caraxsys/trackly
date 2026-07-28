'use client';

import { useTheme } from 'next-themes';
import { useEffect } from 'react';
import type { ThemePreference } from '@/types/preference';

export function PersistedTheme({ theme }: { theme: ThemePreference }) {
  const { setTheme } = useTheme();
  useEffect(() => setTheme(theme), [setTheme, theme]);
  return null;
}
