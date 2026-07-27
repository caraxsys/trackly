import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { HabitFormPage } from '@/components/habits/habit-form-page';
import { getServerSession } from '@/lib/auth-session';
import {
  getServerHabitCategories,
  HabitServerError,
} from '@/services/habit-server-service';

export const metadata: Metadata = { title: 'New habit' };
export const dynamic = 'force-dynamic';

export default async function NewHabitPage() {
  const session = await getServerSession();
  if (!session) redirect('/login');

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
      initialValues={{
        name: '',
        description: '',
        categoryId: '',
        frequencyType: 'daily',
        targetCount: 1,
        startDate: new Date().toISOString().slice(0, 10),
        endDate: '',
        weekdays: [],
        isActive: true,
      }}
      mode="create"
    />
  );
}
