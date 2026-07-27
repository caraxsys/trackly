'use client';

import Link from 'next/link';

import { ErrorState } from '@/components/feedback/error-state';

export default function HabitsError({ reset }: { reset: () => void }) {
  return (
    <div>
      <ErrorState
        description="Trackly could not load your habits. Check the connection and try again."
        onRetry={reset}
        title="Habits are temporarily unavailable"
      />
      <p className="text-muted-foreground -mt-8 text-center text-sm">
        Or{' '}
        <Link className="text-primary hover:underline" href="/habits">
          return to habits
        </Link>
        .
      </p>
    </div>
  );
}
