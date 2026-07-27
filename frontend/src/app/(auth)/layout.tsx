import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import { Wordmark } from '@/components/brand/wordmark';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { getServerSession } from '@/lib/auth-session';

export default async function AuthenticationLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (await getServerSession()) {
    redirect('/today');
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Wordmark />
          <p className="text-muted-foreground mt-3">
            Build consistency. Track progress.
          </p>
        </div>
        <section className="border-border bg-surface rounded-xl border p-6 shadow-sm sm:p-8">
          {children}
        </section>
      </div>
    </main>
  );
}
