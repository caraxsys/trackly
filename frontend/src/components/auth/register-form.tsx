'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { AuthField } from './auth-field';
import { getAuthErrorMessage } from '@/features/auth/auth-error';
import { registerSchema, type RegisterValues } from '@/features/auth/schemas';
import { signUp } from '@/lib/auth-client';

export function RegisterForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string>();
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  const submit = handleSubmit(async (values) => {
    setFormError(undefined);

    try {
      const result = await signUp.email({
        name: values.name,
        email: values.email,
        password: values.password,
      });

      if (result.error) {
        setFormError(getAuthErrorMessage(result.error));
        return;
      }

      router.replace('/today');
      router.refresh();
    } catch {
      setFormError(getAuthErrorMessage(null));
    }
  });

  return (
    <form className="space-y-5" noValidate onSubmit={submit}>
      <AuthField
        autoComplete="name"
        error={errors.name?.message}
        id="name"
        label="Name"
        {...register('name')}
      />
      <AuthField
        autoComplete="email"
        error={errors.email?.message}
        id="email"
        label="Email"
        type="email"
        {...register('email')}
      />
      <AuthField
        autoComplete="new-password"
        error={errors.password?.message}
        id="password"
        label="Password"
        type="password"
        {...register('password')}
      />
      <AuthField
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        id="confirm-password"
        label="Confirm password"
        type="password"
        {...register('confirmPassword')}
      />
      {formError ? (
        <p
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border p-3 text-sm"
          role="alert"
        >
          {formError}
        </p>
      ) : null}
      <button
        className="bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:ring-ring h-11 w-full rounded-md px-4 text-sm font-semibold outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  );
}
