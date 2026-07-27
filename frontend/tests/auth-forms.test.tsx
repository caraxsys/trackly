import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LoginForm } from '@/components/auth/login-form';
import { LogoutButton } from '@/components/auth/logout-button';
import { RegisterForm } from '@/components/auth/register-form';

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}));

vi.mock('@/lib/auth-client', () => ({
  signIn: { email: mocks.signIn },
  signOut: mocks.signOut,
  signUp: { email: mocks.signUp },
}));

describe('authentication forms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates the login form before calling Better Auth', async () => {
    render(<LoginForm />);
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByText('Enter a valid email address.'),
    ).toBeVisible();
    expect(
      screen.getByText('Password must be at least 8 characters.'),
    ).toBeVisible();
    expect(mocks.signIn).not.toHaveBeenCalled();
  });

  it('redirects to a safe internal destination after login', async () => {
    mocks.signIn.mockResolvedValue({ data: {}, error: null });
    render(<LoginForm callbackUrl="/tasks" />);

    await userEvent.type(screen.getByLabelText('Email'), 'ADA@EXAMPLE.COM ');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/tasks'));
    expect(mocks.signIn).toHaveBeenCalledWith({
      email: 'ada@example.com',
      password: 'password123',
    });
    expect(window.localStorage).toHaveLength(0);
    expect(window.sessionStorage).toHaveLength(0);
  });

  it('rejects mismatched registration passwords', async () => {
    render(<RegisterForm />);

    await userEvent.type(screen.getByLabelText('Name'), 'Ada Lovelace');
    await userEvent.type(screen.getByLabelText('Email'), 'ada@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.type(
      screen.getByLabelText('Confirm password'),
      'different123',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Create account' }),
    );

    expect(await screen.findByText('Passwords do not match.')).toBeVisible();
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  it('renders safe authentication errors', async () => {
    mocks.signIn.mockResolvedValue({
      data: null,
      error: {
        code: 'INVALID_EMAIL_OR_PASSWORD',
        message: 'Internal provider detail',
      },
    });
    render(<LoginForm />);

    await userEvent.type(screen.getByLabelText('Email'), 'ada@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByText('The email or password is incorrect.'),
    ).toBeVisible();
    expect(
      screen.queryByText('Internal provider detail'),
    ).not.toBeInTheDocument();
  });

  it('logs out and redirects to login', async () => {
    mocks.signOut.mockResolvedValue({ data: {}, error: null });
    render(<LogoutButton />);

    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/login'));
    expect(mocks.signOut).toHaveBeenCalledOnce();
  });
});
