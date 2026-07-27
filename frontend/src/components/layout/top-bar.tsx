import { Settings } from 'lucide-react';
import Link from 'next/link';

import { Wordmark } from '@/components/brand/wordmark';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { LogoutButton } from '@/components/auth/logout-button';

export function TopBar({ user }: { user: { email: string; name: string } }) {
  return (
    <header className="border-border bg-background/90 sticky top-0 z-10 border-b backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Wordmark compact className="lg:hidden" />
        <p className="text-muted-foreground hidden text-sm lg:block">
          Build consistency. Track progress.
        </p>
        <div className="flex items-center gap-2">
          <div className="hidden min-w-0 text-right sm:block">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="text-muted-foreground truncate text-xs">
              {user.email}
            </p>
          </div>
          <ThemeToggle />
          <LogoutButton />
          <Link
            aria-label="Open settings"
            className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring inline-flex size-9 items-center justify-center rounded-md outline-none focus-visible:ring-2 lg:hidden"
            href="/settings"
          >
            <Settings aria-hidden="true" className="size-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
