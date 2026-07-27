'use client';

import { ErrorState } from '@/components/feedback/error-state';

export default function AnalyticsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      description="Trackly could not load this analytics summary. Try again shortly."
      onRetry={reset}
      title="Analytics is temporarily unavailable"
    />
  );
}
