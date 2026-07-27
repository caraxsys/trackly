import type { Metadata } from 'next';
import Link from 'next/link';

import { RegisterForm } from '@/components/auth/register-form';

export const metadata: Metadata = { title: 'Create account' };

export default function RegisterPage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Create your account</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Start building a clearer, more consistent routine.
        </p>
      </div>
      <RegisterForm />
      <p className="text-muted-foreground mt-6 text-center text-sm">
        Already have an account?{' '}
        <Link
          className="text-primary font-medium hover:underline"
          href="/login"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
