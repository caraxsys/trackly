import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { PreferenceForm } from '@/components/preferences/preference-form';
import { NotificationSettings } from '@/components/preferences/notification-settings';
import { getServerSession } from '@/lib/auth-session';
import {
  getServerPreferences,
  PreferenceServerError,
} from '@/services/preference-server-service';

export const metadata: Metadata = { title: 'Preferences' };
export const dynamic = 'force-dynamic';

export default async function PreferencesPage() {
  if (!(await getServerSession())) redirect('/login');
  let preferences;
  try {
    preferences = await getServerPreferences();
  } catch (error) {
    if (error instanceof PreferenceServerError && error.status === 401)
      redirect('/login');
    throw error;
  }
  return (
    <div className="space-y-6">
      <PageHeader
        title="Preferences"
        description="Choose how Trackly presents dates, times, weeks, and themes."
      />
      <PreferenceForm initialPreferences={preferences} />
      <NotificationSettings />
    </div>
  );
}
