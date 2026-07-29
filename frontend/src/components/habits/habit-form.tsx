'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, LoaderCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { habitFormSchema } from '@/features/habits/habit-form-schema';
import { ApiError } from '@/services/api-error';
import { createHabit, updateHabit } from '@/services/habit-mutation-service';
import type {
  HabitCategory,
  HabitFormValues,
  HabitMutationPayload,
} from '@/types/habit';

const weekdays = [
  ['Mon', 1],
  ['Tue', 2],
  ['Wed', 3],
  ['Thu', 4],
  ['Fri', 5],
  ['Sat', 6],
  ['Sun', 7],
] as const;

const inputClass =
  'border-border bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60';

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="text-destructive mt-1 text-sm" role="alert">
      {message}
    </p>
  ) : null;
}

function mutationPayload(values: HabitFormValues): HabitMutationPayload {
  return {
    name: values.name.trim(),
    description: values.description.trim() || null,
    categoryId: values.categoryId || null,
    frequencyType: values.frequencyType,
    targetCount: values.targetCount,
    startDate: values.startDate,
    endDate: values.endDate || null,
    weekdays:
      values.frequencyType === 'daily'
        ? []
        : [...new Set(values.weekdays)].sort((a, b) => a - b),
  };
}

export function HabitForm({
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
  const router = useRouter();
  const [formError, setFormError] = useState<string>();
  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<HabitFormValues>({
    resolver: zodResolver(habitFormSchema),
    defaultValues: initialValues,
  });
  const frequency = useWatch({ control, name: 'frequencyType' });
  const selectedWeekdays = useWatch({ control, name: 'weekdays' });

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!isDirty || isSubmitting) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty, isSubmitting]);

  const submit = handleSubmit(async (values) => {
    setFormError(undefined);
    try {
      const result =
        mode === 'create'
          ? await createHabit(mutationPayload(values))
          : await updateHabit(habitId ?? '', mutationPayload(values));
      router.push(
        `/habits/${result.id}?success=${mode === 'create' ? 'created' : 'updated'}`,
      );
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        window.location.assign('/login');
        return;
      }
      if (
        error instanceof ApiError &&
        error.status === 404 &&
        mode === 'edit'
      ) {
        router.replace('/habits');
        return;
      }
      if (error instanceof ApiError && Array.isArray(error.details)) {
        for (const detail of error.details) {
          if (
            typeof detail === 'object' &&
            detail !== null &&
            'path' in detail &&
            'message' in detail
          ) {
            const path = String(detail.path) as keyof HabitFormValues;
            if (path in initialValues) {
              setError(path, { message: String(detail.message) });
            }
          }
        }
      }
      setFormError(
        error instanceof ApiError && error.status === 400
          ? 'Review the highlighted fields and try again.'
          : 'We could not save this habit. Please try again.',
      );
    }
  });

  function cancel() {
    if (
      isDirty &&
      !window.confirm('Discard your unsaved changes? Your edits will be lost.')
    ) {
      return;
    }
    router.push(mode === 'edit' ? `/habits/${habitId}` : '/habits');
  }

  return (
    <form className="space-y-8" noValidate onSubmit={submit}>
      {formError && (
        <div
          className="border-destructive/40 bg-destructive/5 text-destructive flex gap-3 rounded-lg border p-4 text-sm"
          role="alert"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>{formError}</p>
        </div>
      )}

      <fieldset
        className="border-border bg-surface space-y-6 rounded-xl border p-5 sm:p-6"
        disabled={isSubmitting}
      >
        <legend className="px-1 text-lg font-semibold">Habit details</legend>
        <div>
          <label className="text-sm font-medium" htmlFor="name">
            Name <span aria-hidden="true">*</span>
          </label>
          <input
            {...register('name')}
            aria-describedby={errors.name ? 'name-error' : undefined}
            aria-invalid={Boolean(errors.name)}
            autoFocus
            className={`${inputClass} mt-2`}
            id="name"
          />
          <FieldError id="name-error" message={errors.name?.message} />
        </div>

        <div>
          <label className="text-sm font-medium" htmlFor="description">
            Description
          </label>
          <textarea
            {...register('description')}
            className={`${inputClass} mt-2 min-h-24 resize-y`}
            id="description"
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium" htmlFor="categoryId">
              Category
            </label>
            <select
              {...register('categoryId')}
              className={`${inputClass} mt-2`}
              id="categoryId"
            >
              <option value="">No category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {categories.length === 0 && (
              <p className="text-muted-foreground mt-1 text-sm">
                You do not have any available categories.
              </p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="targetCount">
              Daily target <span aria-hidden="true">*</span>
            </label>
            <input
              {...register('targetCount', { valueAsNumber: true })}
              aria-describedby={
                errors.targetCount ? 'target-count-error' : 'target-count-help'
              }
              aria-invalid={Boolean(errors.targetCount)}
              className={`${inputClass} mt-2`}
              id="targetCount"
              min={1}
              type="number"
            />
            <p
              id="target-count-help"
              className="text-muted-foreground mt-1 text-sm"
            >
              Number of completions required each scheduled day.
            </p>
            <FieldError
              id="target-count-error"
              message={errors.targetCount?.message}
            />
          </div>
        </div>
      </fieldset>

      <fieldset
        className="border-border bg-surface space-y-6 rounded-xl border p-5 sm:p-6"
        disabled={isSubmitting}
      >
        <legend className="px-1 text-lg font-semibold">Schedule</legend>
        <div>
          <label className="text-sm font-medium" htmlFor="frequencyType">
            Frequency <span aria-hidden="true">*</span>
          </label>
          <select
            {...register('frequencyType')}
            className={`${inputClass} mt-2`}
            id="frequencyType"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {frequency !== 'daily' && (
          <fieldset>
            <legend className="text-sm font-medium">
              Weekdays <span aria-hidden="true">*</span>
            </legend>
            <p className="text-muted-foreground mt-1 text-sm">
              Select every day this habit should appear.
            </p>
            <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7">
              {weekdays.map(([label, value]) => (
                <label
                  className="border-border has-checked:border-primary has-checked:bg-primary-soft focus-within:ring-ring flex cursor-pointer items-center justify-center rounded-lg border px-2 py-2.5 text-sm font-medium focus-within:ring-2"
                  key={value}
                >
                  <input
                    checked={selectedWeekdays.includes(value)}
                    className="sr-only"
                    onChange={(event) => {
                      const next = event.target.checked
                        ? [...selectedWeekdays, value]
                        : selectedWeekdays.filter((day) => day !== value);
                      setValue(
                        'weekdays',
                        [...new Set(next)].sort((a, b) => a - b),
                        { shouldDirty: true, shouldValidate: true },
                      );
                    }}
                    type="checkbox"
                  />
                  {label}
                </label>
              ))}
            </div>
            <FieldError
              id="weekdays-error"
              message={errors.weekdays?.message}
            />
          </fieldset>
        )}

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium" htmlFor="startDate">
              Start date <span aria-hidden="true">*</span>
            </label>
            <input
              {...register('startDate')}
              aria-invalid={Boolean(errors.startDate)}
              className={`${inputClass} mt-2`}
              id="startDate"
              type="date"
            />
            <FieldError
              id="start-date-error"
              message={errors.startDate?.message}
            />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="endDate">
              End date
            </label>
            <input
              {...register('endDate')}
              aria-invalid={Boolean(errors.endDate)}
              className={`${inputClass} mt-2`}
              id="endDate"
              type="date"
            />
            <FieldError id="end-date-error" message={errors.endDate?.message} />
          </div>
        </div>

      </fieldset>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          className="border-border hover:bg-muted focus-visible:ring-ring rounded-lg border px-5 py-2.5 text-sm font-medium focus-visible:ring-2 disabled:opacity-60"
          disabled={isSubmitting}
          onClick={cancel}
          type="button"
        >
          Cancel
        </button>
        <button
          className="bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:ring-ring inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold focus-visible:ring-2 disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting && (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          )}
          {isSubmitting
            ? 'Saving…'
            : mode === 'create'
              ? 'Create habit'
              : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
