'use client';

import { Check, LoaderCircle, Minus, Plus, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ApiError } from '@/services/api-error';
import { setHabitCheckIn } from '@/services/habit-check-in-service';

interface HabitCheckInControlProps {
  date: string;
  habitId: string;
  habitName: string;
  initialCompletedCount: number;
  initialIsCompleted: boolean;
  isActive: boolean;
  isScheduled: boolean;
  targetCount: number;
}

const actionClass =
  'border-border hover:bg-muted focus-visible:ring-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50';

export function HabitCheckInControl({
  date,
  habitId,
  habitName,
  initialCompletedCount,
  initialIsCompleted,
  isActive,
  isScheduled,
  targetCount,
}: HabitCheckInControlProps) {
  const router = useRouter();
  const [progress, setProgress] = useState({
    completedCount: initialCompletedCount,
    isCompleted: initialIsCompleted,
  });
  const [isPending, setIsPending] = useState(false);
  const [feedback, setFeedback] = useState<{
    kind: 'error' | 'success';
    message: string;
  }>();
  const [isUnavailable, setIsUnavailable] = useState(false);
  const canCheckIn = isActive && isScheduled && !isUnavailable;

  async function submit(completedCount: number) {
    if (isPending || !canCheckIn) return;
    const clampedCount = Math.max(0, Math.min(targetCount, completedCount));
    setIsPending(true);
    setFeedback(undefined);

    try {
      const result = await setHabitCheckIn(habitId, {
        date,
        completedCount: clampedCount,
      });
      setProgress({
        completedCount: result.completedCount,
        isCompleted: result.isCompleted,
      });
      setFeedback({
        kind: 'success',
        message: result.isCompleted
          ? 'Habit completed.'
          : result.completedCount === 0
            ? 'Habit progress reset.'
            : 'Habit progress updated.',
      });
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        window.location.assign('/login');
        return;
      }
      if (error instanceof ApiError && error.status === 404) {
        setIsUnavailable(true);
        setFeedback({
          kind: 'error',
          message: 'This habit is no longer available.',
        });
        return;
      }
      setFeedback({
        kind: 'error',
        message:
          error instanceof ApiError && error.status === 409
            ? 'This habit is archived or not scheduled for this date.'
            : 'Progress could not be updated. Please try again.',
      });
    } finally {
      setIsPending(false);
    }
  }

  if (!canCheckIn) {
    const reason = !isActive
      ? 'This habit is archived.'
      : !isScheduled
        ? 'This habit is not scheduled for this date.'
        : 'This habit is no longer available.';

    return (
      <div className="space-y-2">
        <p className="text-sm font-medium tabular-nums">
          {progress.completedCount} / {targetCount} completed
        </p>
        {!isUnavailable && (
          <p className="text-muted-foreground text-sm">{reason}</p>
        )}
        {feedback?.kind === 'error' && (
          <p className="text-destructive text-sm" role="alert">
            {feedback.message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium tabular-nums" aria-live="polite">
        {progress.completedCount} / {targetCount} completed
        {progress.isCompleted ? ' — target complete' : ''}
      </p>

      {targetCount === 1 ? (
        <button
          aria-label={
            progress.isCompleted
              ? `Reset ${habitName} completion`
              : `Mark ${habitName} complete`
          }
          className={`${actionClass} ${
            progress.isCompleted
              ? 'text-muted-foreground'
              : 'bg-primary text-primary-foreground hover:bg-primary-hover'
          }`}
          disabled={isPending}
          onClick={() => submit(progress.isCompleted ? 0 : 1)}
          type="button"
        >
          {isPending ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : progress.isCompleted ? (
            <RotateCcw aria-hidden="true" className="size-4" />
          ) : (
            <Check aria-hidden="true" className="size-4" />
          )}
          {progress.isCompleted ? 'Reset completion' : 'Mark complete'}
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button
            aria-label={`Decrease ${habitName} progress`}
            className={actionClass}
            disabled={isPending || progress.completedCount === 0}
            onClick={() => submit(progress.completedCount - 1)}
            type="button"
          >
            <Minus aria-hidden="true" className="size-4" />
            Decrease
          </button>
          <button
            aria-label={`Increase ${habitName} progress`}
            className={actionClass}
            disabled={isPending || progress.completedCount === targetCount}
            onClick={() => submit(progress.completedCount + 1)}
            type="button"
          >
            <Plus aria-hidden="true" className="size-4" />
            Increase
          </button>
        </div>
      )}

      {isPending && (
        <p className="text-muted-foreground text-sm" role="status">
          Saving progress…
        </p>
      )}
      {!isPending && feedback && (
        <p
          className={
            feedback.kind === 'error'
              ? 'text-destructive text-sm'
              : 'text-muted-foreground text-sm'
          }
          role={feedback.kind === 'error' ? 'alert' : 'status'}
        >
          {feedback.message}
        </p>
      )}
    </div>
  );
}
