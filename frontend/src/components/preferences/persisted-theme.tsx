'use client';

import { useTheme } from 'next-themes';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { ThemePreference } from '@/types/preference';

interface PersistedThemeContextValue {
  applyPersistedTheme: (theme: ThemePreference) => void;
}

const PersistedThemeContext = createContext<PersistedThemeContextValue | null>(
  null,
);

export function PersistedTheme({
  children,
  theme,
}: {
  children: ReactNode;
  theme: ThemePreference;
}) {
  const { setTheme } = useTheme();
  const [activeTheme, setActiveTheme] = useState(theme);

  useEffect(() => setTheme(activeTheme), [activeTheme, setTheme]);

  const applyPersistedTheme = useCallback(
    (savedTheme: ThemePreference) => setActiveTheme(savedTheme),
    [],
  );
  const value = useMemo(() => ({ applyPersistedTheme }), [applyPersistedTheme]);

  return (
    <PersistedThemeContext.Provider value={value}>
      {children}
    </PersistedThemeContext.Provider>
  );
}

export function usePersistedTheme() {
  const context = useContext(PersistedThemeContext);
  if (!context) {
    throw new Error(
      'usePersistedTheme must be used inside the authenticated application layout.',
    );
  }
  return context;
}

export function useOptionalPersistedTheme() {
  return useContext(PersistedThemeContext);
}
