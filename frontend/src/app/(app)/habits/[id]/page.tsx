import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { HabitDetail } from '@/components/habits/habit-detail';
import { getServerSession } from '@/lib/auth-session';
import {
  getServerHabit,
  getServerHabitStreak,
  HabitServerError,
} from '@/services/habit-server-service';
import {
  getServerPreferences,
  PreferenceServerError,
} from '@/services/preference-server-service';
import {
  getServerReminders,
  ReminderServerError,
} from '@/services/reminder-server-service';

export const metadata: Metadata = { title: 'Habit details' };
export const dynamic = 'force-dynamic';

export default async function HabitDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string }>;
}) {
  const session = await getServerSession();
  if (!session) redirect('/login');

  const { id } = await params;
  let habit;
  let streak;
  let reminders;
  let preferences;

  try {
    [habit, streak, reminders, preferences] = await Promise.all([
      getServerHabit(id),
      getServerHabitStreak(id),
      getServerReminders(id),
      getServerPreferences(),
    ]);
  } catch (error) {
    if (
      (error instanceof HabitServerError ||
        error instanceof ReminderServerError ||
        error instanceof PreferenceServerError) &&
      error.status === 401
    ) {
      redirect('/login');
    }
    if (
      (error instanceof HabitServerError ||
        error instanceof ReminderServerError) &&
      (error.status === 400 || error.status === 404)
    ) {
      notFound();
    }
    throw error;
  }

  const successValue = (await searchParams).success;
  const success =
    successValue === 'created' || successValue === 'updated'
      ? successValue
      : undefined;

  return (
    <HabitDetail
      habit={habit}
      reminders={reminders}
      streak={streak}
      success={success}
      timeFormat={preferences.timeFormat}
      timezone={habit.timezone}
    />
  );
}
