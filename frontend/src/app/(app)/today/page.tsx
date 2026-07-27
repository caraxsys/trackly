import type { Metadata } from 'next';

import { PlaceholderPage } from '@/components/layout/placeholder-page';

export const metadata: Metadata = {
  title: 'Today',
  description: 'A calm starting point for your day.',
};

export default function TodayPage() {
  return (
    <PlaceholderPage
      description="A focused home for what matters today."
      title="Today"
    />
  );
}
