import type { Metadata } from 'next';

import { PlaceholderPage } from '@/components/layout/placeholder-page';

export const metadata: Metadata = { title: 'Insights' };

export default function InsightsPage() {
  return (
    <PlaceholderPage
      description="Understand progress without unnecessary noise."
      title="Insights"
    />
  );
}
