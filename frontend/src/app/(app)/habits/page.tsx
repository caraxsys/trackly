import type { Metadata } from 'next';

import { PlaceholderPage } from '@/components/layout/placeholder-page';

export const metadata: Metadata = { title: 'Habits' };

export default function HabitsPage() {
  return (
    <PlaceholderPage
      description="Build routines with clarity and consistency."
      title="Habits"
    />
  );
}
