import type { Metadata } from 'next';

import { PlaceholderPage } from '@/components/layout/placeholder-page';

export const metadata: Metadata = { title: 'Tasks' };

export default function TasksPage() {
  return (
    <PlaceholderPage
      description="Keep important work visible and manageable."
      title="Tasks"
    />
  );
}
