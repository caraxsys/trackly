import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { HabitFormPage } from '@/components/habits/habit-form-page';
import { getServerSession } from '@/lib/auth-session';
import {
  getServerHabit,
  getServerHabitCategories,
  HabitServerError,
} from '@/services/habit-server-service';

export const metadata: Metadata = { title: 'Edit habit' };
export const dynamic = 'force-dynamic';

export default async function EditHabitPage({
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

  let categories;
  try {
    categories = await getServerHabitCategories();
  } catch (error) {
    if (error instanceof HabitServerError && error.status === 401) {
      redirect('/login');
    }
    throw error;
  }

  return (
    <HabitFormPage
      categories={categories}
      habitId={habit.id}
      initialValues={{
        name: habit.name,
        description: habit.description ?? '',
        categoryId: habit.category?.id ?? '',
        frequencyType: habit.frequencyType,
        targetCount: habit.targetCount,
        startDate: habit.startDate,
        endDate: habit.endDate ?? '',
        weekdays: habit.schedule.weekdays,
        isActive: habit.isActive,
      }}
      mode="edit"
    />
  );
}
