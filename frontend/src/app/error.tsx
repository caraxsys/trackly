'use client';

import { useEffect } from 'react';

import { ErrorState } from '@/components/feedback/error-state';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('A page render failed.', error);
  }, [error]);

  return (
    <ErrorState
      description="Trackly could not load this view. Your information has not been changed."
      onRetry={reset}
    />
  );
}
