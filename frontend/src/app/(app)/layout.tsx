import type { ReactNode } from 'react';

import { AppShell } from '@/components/layout/app-shell';
import { getServerSession } from '@/lib/auth-session';
import { redirect } from 'next/navigation';

interface ApplicationLayoutProps {
  children: ReactNode;
}

export default async function ApplicationLayout({
  children,
}: ApplicationLayoutProps) {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  return <AppShell user={session.user}>{children}</AppShell>;
}
