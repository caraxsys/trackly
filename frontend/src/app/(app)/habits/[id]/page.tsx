import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { HabitDetail } from '@/components/habits/habit-detail';
import { getServerSession } from '@/lib/auth-session';
import {
  getServerHabit,
  getServerHabitStreak,
  HabitServerError,
} from '@/services/habit-server-service';

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

  try {
    [habit, streak] = await Promise.all([
      getServerHabit(id),
      getServerHabitStreak(id),
    ]);
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

  const successValue = (await searchParams).success;
  const success =
    successValue === 'created' || successValue === 'updated'
      ? successValue
      : undefined;

  return (
    <HabitDetail
      habit={habit}
      streak={streak}
      success={success}
      timezone={habit.timezone}
    />
  );
}
