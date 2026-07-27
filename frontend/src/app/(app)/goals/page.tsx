import type { Metadata } from 'next';

import { PlaceholderPage } from '@/components/layout/placeholder-page';

export const metadata: Metadata = { title: 'Goals' };

export default function GoalsPage() {
  return (
    <PlaceholderPage
      description="Give meaningful progress a clear direction."
      title="Goals"
    />
  );
}
