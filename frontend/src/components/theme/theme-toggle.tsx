'use client';

import { Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useState } from 'react';
import { useOptionalPersistedTheme } from '@/components/preferences/persisted-theme';
import { updatePreferences } from '@/services/preference-mutation-service';
import type { ThemePreference } from '@/types/preference';

const themes = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const persistedTheme = useOptionalPersistedTheme();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  async function selectTheme(selectedTheme: ThemePreference) {
    setError('');

    if (!persistedTheme) {
      setTheme(selectedTheme);
      return;
    }

    setIsSaving(true);
    try {
      const saved = await updatePreferences({ theme: selectedTheme });
      persistedTheme.applyPersistedTheme(saved.theme);
    } catch {
      setError('Trackly could not save the theme. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <label className="text-muted-foreground flex items-center gap-2 text-sm">
        <span className="sr-only">Color theme</span>
        <Monitor aria-hidden="true" className="size-4" />
        <select
          suppressHydrationWarning
          aria-label="Color theme"
          className="border-border bg-surface text-foreground focus-visible:ring-ring rounded-md border px-2 py-1.5 text-sm outline-none focus-visible:ring-2 disabled:opacity-60"
          disabled={isSaving}
          value={theme ?? 'system'}
          onChange={(event) => {
            void selectTheme(event.target.value as ThemePreference);
          }}
        >
          {themes.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <p aria-live="polite" className="sr-only" role="status">
        {error}
      </p>
    </div>
  );
}
