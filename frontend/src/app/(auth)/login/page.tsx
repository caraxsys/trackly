import type { Metadata } from 'next';
import Link from 'next/link';

import { LoginForm } from '@/components/auth/login-form';
import { safeInternalRedirect } from '@/lib/safe-redirect';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackURL?: string }>;
}) {
  const { callbackURL } = await searchParams;

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Sign in to continue to Trackly.
        </p>
      </div>
      <LoginForm callbackUrl={safeInternalRedirect(callbackURL)} />
      <p className="text-muted-foreground mt-6 text-center text-sm">
        New to Trackly?{' '}
        <Link
          className="text-primary font-medium hover:underline"
          href="/register"
        >
          Create an account
        </Link>
      </p>
    </>
  );
}
