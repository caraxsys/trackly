'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { signOut } from '@/lib/auth-client';

export function LogoutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function logout() {
    setIsPending(true);
    await signOut();
    router.replace('/login');
    router.refresh();
  }

  return (
    <button
      aria-label="Sign out"
      className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring inline-flex size-9 items-center justify-center rounded-md outline-none focus-visible:ring-2 disabled:opacity-60"
      disabled={isPending}
      onClick={logout}
      type="button"
    >
      <LogOut aria-hidden="true" className="size-5" />
    </button>
  );
}
