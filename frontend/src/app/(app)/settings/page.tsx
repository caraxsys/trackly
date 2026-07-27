import type { Metadata } from 'next';

import { PlaceholderPage } from '@/components/layout/placeholder-page';

export const metadata: Metadata = { title: 'Settings' };

export default function SettingsPage() {
  return (
    <PlaceholderPage
      description="Personal preferences will live here in a future milestone."
      title="Settings"
    />
  );
}
