'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { goalFormSchema } from '@/features/goals/goal-form-schema';
import { createGoal, updateGoal } from '@/services/goal-mutation-service';
import type { GoalPayload } from '@/types/goal';

type Values = z.infer<typeof goalFormSchema>;
const input =
  'border-border bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-2 outline-none focus-visible:ring-2';

export function GoalForm({
  mode,
  goalId,
  habits,
  initialValues,
}: {
  mode: 'create' | 'edit';
  goalId?: string;
  habits: Array<{ id: string; name: string }>;
  initialValues: Values;
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: initialValues,
  });
  const submit = handleSubmit(async (values) => {
    try {
      const result =
        mode === 'create'
          ? await createGoal(values as GoalPayload)
          : await updateGoal(goalId ?? '', values as GoalPayload);
      router.push(`/goals/${result.id}`);
      router.refresh();
    } catch {
      setError('root', {
        message:
          'Trackly could not save this Goal. Review the fields and try again.',
      });
    }
  });
  return (
    <form
      className="border-border bg-surface max-w-2xl space-y-5 rounded-xl border p-6"
      onSubmit={submit}
    >
      {errors.root ? (
        <p role="alert" className="text-destructive text-sm">
          {errors.root.message}
        </p>
      ) : null}
      <label className="block text-sm font-medium">
        Name
        <input className={`${input} mt-1`} {...register('name')} />
        {errors.name ? (
          <span role="alert" className="text-destructive">
            {errors.name.message}
          </span>
        ) : null}
      </label>
      <label className="block text-sm font-medium">
        Habit
        <select className={`${input} mt-1`} {...register('habitId')}>
          <option value="">Choose a Habit</option>
          {habits.map((habit) => (
            <option key={habit.id} value={habit.id}>
              {habit.name}
            </option>
          ))}
        </select>
        {errors.habitId ? (
          <span role="alert" className="text-destructive">
            {errors.habitId.message}
          </span>
        ) : null}
      </label>
      <label className="block text-sm font-medium">
        Target count
        <input
          type="number"
          min="1"
          className={`${input} mt-1`}
          {...register('targetCount', { valueAsNumber: true })}
        />
        {errors.targetCount ? (
          <span role="alert" className="text-destructive">
            {errors.targetCount.message}
          </span>
        ) : null}
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Start date
          <input
            type="date"
            className={`${input} mt-1`}
            {...register('startDate')}
          />
        </label>
        <label className="block text-sm font-medium">
          End date
          <input
            type="date"
            className={`${input} mt-1`}
            {...register('endDate')}
          />
          {errors.endDate ? (
            <span role="alert" className="text-destructive">
              {errors.endDate.message}
            </span>
          ) : null}
        </label>
      </div>
      <label className="block text-sm font-medium">
        Status
        <select className={`${input} mt-1`} {...register('status')}>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </label>
      <button
        disabled={isSubmitting}
        className="bg-primary text-primary-foreground focus-visible:ring-ring rounded-lg px-4 py-2 font-medium outline-none focus-visible:ring-2 disabled:opacity-60"
      >
        {isSubmitting
          ? 'Saving…'
          : mode === 'create'
            ? 'Create Goal'
            : 'Save changes'}
      </button>
    </form>
  );
}
