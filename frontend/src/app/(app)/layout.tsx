import type { ReactNode } from 'react';

import { AppShell } from '@/components/layout/app-shell';
import { PersistedTheme } from '@/components/preferences/persisted-theme';
import { getServerSession } from '@/lib/auth-session';
import { getServerPreferences } from '@/services/preference-server-service';
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

  const preferences = await getServerPreferences();

  return (
    <PersistedTheme theme={preferences.theme}>
      <AppShell user={session.user}>{children}</AppShell>
    </PersistedTheme>
  );
}
