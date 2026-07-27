import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

import { HabitForm } from '@/components/habits/habit-form';
import type { HabitCategory, HabitFormValues } from '@/types/habit';

export function HabitFormPage({
  mode,
  categories,
  initialValues,
  habitId,
}: {
  mode: 'create' | 'edit';
  categories: HabitCategory[];
  initialValues: HabitFormValues;
  habitId?: string;
}) {
  const title = mode === 'create' ? 'New habit' : 'Edit habit';

  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <nav aria-label="Breadcrumb">
        <ol className="text-muted-foreground flex flex-wrap items-center gap-1 text-sm">
          <li>
            <Link
              className="hover:text-foreground focus-visible:ring-ring rounded-sm focus-visible:ring-2"
              href="/habits"
            >
              Habits
            </Link>
          </li>
          {mode === 'edit' && (
            <>
              <li aria-hidden="true">
                <ChevronRight className="size-4" />
              </li>
              <li>
                <Link
                  className="hover:text-foreground focus-visible:ring-ring rounded-sm focus-visible:ring-2"
                  href={`/habits/${habitId}`}
                >
                  Details
                </Link>
              </li>
            </>
          )}
          <li aria-hidden="true">
            <ChevronRight className="size-4" />
          </li>
          <li aria-current="page" className="text-foreground font-medium">
            {title}
          </li>
        </ol>
      </nav>
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-2 leading-7">
          {mode === 'create'
            ? 'Define a routine and choose when it should appear.'
            : 'Update this routine’s details and schedule.'}
        </p>
      </header>
      <HabitForm
        categories={categories}
        habitId={habitId}
        initialValues={initialValues}
        mode={mode}
      />
    </div>
  );
}
