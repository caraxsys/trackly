'use client';

import { Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { updatePreferences } from '@/services/preference-mutation-service';
import type { ThemePreference } from '@/types/preference';

const themes = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <label className="text-muted-foreground flex items-center gap-2 text-sm">
      <span className="sr-only">Color theme</span>
      <Monitor aria-hidden="true" className="size-4" />
      <select
        suppressHydrationWarning
        aria-label="Color theme"
        className="border-border bg-surface text-foreground focus-visible:ring-ring rounded-md border px-2 py-1.5 text-sm outline-none focus-visible:ring-2"
        value={theme ?? 'system'}
        onChange={(event) => {
          const theme = event.target.value as ThemePreference;
          setTheme(theme);
          void updatePreferences({ theme }).catch(() => undefined);
        }}
      >
        {themes.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
