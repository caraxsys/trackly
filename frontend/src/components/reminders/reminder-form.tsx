'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { LoaderCircle } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';

import {
  reminderFormSchema,
  type ReminderFormValues,
} from '@/features/reminders/reminder-form-schema';

export function ReminderForm({
  initialValues,
  mode,
  onCancel,
  onSave,
}: {
  initialValues: ReminderFormValues;
  mode: 'add' | 'edit';
  onCancel: () => void;
  onSave: (values: ReminderFormValues) => Promise<void>;
}) {
  const timeRef = useRef<HTMLInputElement | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ReminderFormValues>({
    resolver: zodResolver(reminderFormSchema),
    defaultValues: initialValues,
  });
  const { ref: registeredTimeRef, ...timeRegistration } = register('timeOfDay');

  useEffect(() => {
    timeRef.current?.focus();
  }, []);

  const submit = handleSubmit(async (values) => {
    try {
      await onSave(values);
    } catch (error) {
      setError('root', {
        message:
          error instanceof Error
            ? error.message
            : 'The reminder could not be saved. Please try again.',
      });
    }
  });

  return (
    <form
      aria-label={`${mode === 'add' ? 'Add' : 'Edit'} reminder`}
      className="border-border bg-background mt-4 space-y-4 rounded-lg border p-4"
      onSubmit={submit}
    >
      {errors.root ? (
        <p className="text-destructive text-sm" role="alert">
          {errors.root.message}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <label className="text-sm font-medium">
          Time
          <input
            className="border-border bg-background focus-visible:ring-ring mt-1 block w-full rounded-lg border px-3 py-2 outline-none focus-visible:ring-2"
            disabled={isSubmitting}
            type="time"
            {...timeRegistration}
            ref={(element) => {
              registeredTimeRef(element);
              timeRef.current = element;
            }}
          />
          {errors.timeOfDay ? (
            <span className="text-destructive mt-1 block" role="alert">
              {errors.timeOfDay.message}
            </span>
          ) : null}
        </label>
        <label className="inline-flex min-h-10 items-center gap-2 text-sm font-medium">
          <input
            className="accent-primary focus-visible:ring-ring size-4 focus-visible:ring-2"
            disabled={isSubmitting}
            type="checkbox"
            {...register('isEnabled')}
          />
          Enabled
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          className="border-border hover:bg-muted focus-visible:ring-ring rounded-lg border px-3 py-2 text-sm font-medium focus-visible:ring-2"
          disabled={isSubmitting}
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
        <button
          className="bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:ring-ring inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold focus-visible:ring-2 disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : null}
          {isSubmitting
            ? 'Saving…'
            : mode === 'add'
              ? 'Add reminder'
              : 'Save reminder'}
        </button>
      </div>
      {isSubmitting ? (
        <span className="sr-only" role="status">
          Saving reminder
        </span>
      ) : null}
    </form>
  );
}
