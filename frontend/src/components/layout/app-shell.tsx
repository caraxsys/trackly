import type { ReactNode } from 'react';

import { TopBar } from '@/components/layout/top-bar';
import { MobileNavigation } from '@/components/navigation/mobile-navigation';
import { Sidebar } from '@/components/navigation/sidebar';

interface AppShellProps {
  children: ReactNode;
  user: {
    email: string;
    image?: string | null;
    name: string;
  };
}

export function AppShell({ children, user }: AppShellProps) {
  return (
    <div className="bg-background min-h-screen">
      <Sidebar />
      <div className="lg:pl-64">
        <TopBar user={user} />
        <main className="mx-auto w-full max-w-6xl px-4 py-8 pb-28 sm:px-6 lg:px-8 lg:pb-10">
          {children}
        </main>
      </div>
      <MobileNavigation />
    </div>
  );
}
