import { LoadingState } from '@/components/feedback/loading-state';

export default function Loading() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <LoadingState label="Loading Trackly" />
    </main>
  );
}
