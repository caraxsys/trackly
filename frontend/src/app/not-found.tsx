import Link from 'next/link';

import { ErrorState } from '@/components/feedback/error-state';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div>
        <ErrorState
          description="The page you are looking for does not exist or has moved."
          title="Page not found"
        />
        <div className="-mt-16 text-center">
          <Link
            className="text-primary focus-visible:ring-ring rounded-md text-sm font-medium outline-none hover:underline focus-visible:ring-2"
            href="/today"
          >
            Return to Today
          </Link>
        </div>
      </div>
    </main>
  );
}
