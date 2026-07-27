import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { HabitDetail } from '@/components/habits/habit-detail';
import { getServerSession } from '@/lib/auth-session';
import {
  getServerHabit,
  HabitServerError,
} from '@/services/habit-server-service';

export const metadata: Metadata = { title: 'Habit details' };
export const dynamic = 'force-dynamic';

export default async function HabitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession();
  if (!session) redirect('/login');

  const { id } = await params;
  let habit;

  try {
    habit = await getServerHabit(id);
  } catch (error) {
    if (error instanceof HabitServerError && error.status === 401) {
      redirect('/login');
    }
    if (
      error instanceof HabitServerError &&
      (error.status === 400 || error.status === 404)
    ) {
      notFound();
    }
    throw error;
  }

  return <HabitDetail habit={habit} timezone={habit.timezone} />;
}
