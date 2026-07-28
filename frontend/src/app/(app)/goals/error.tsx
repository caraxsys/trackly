'use client';
import { ErrorState } from '@/components/feedback/error-state';
export default function GoalsError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <ErrorState
      title="Goals are temporarily unavailable"
      description="Trackly could not load your Goals. Try again shortly."
      onRetry={reset}
    />
  );
}
