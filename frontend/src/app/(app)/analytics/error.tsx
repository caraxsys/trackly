'use client';

import { ErrorState } from '@/components/feedback/error-state';

export default function AnalyticsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="border-border bg-surface rounded-xl border">
      <ErrorState
        description="Trackly could not load this analytics summary. Your habit data is safe—try loading the dashboard again."
        onRetry={reset}
        title="Analytics is temporarily unavailable"
      />
    </div>
  );
}
