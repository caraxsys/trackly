'use client';

import { LoaderCircle, Power, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { ApiError } from '@/services/api-error';
import {
  activateHabit,
  deactivateHabit,
  deleteHabit,
} from '@/services/habit-mutation-service';

export function HabitLifecycleActions({
  habitId,
  isActive,
}: {
  habitId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<'state' | 'delete'>();
  const [message, setMessage] = useState<string>();
  const [confirmation, setConfirmation] = useState<'state' | 'delete'>();
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (confirmation) confirmButtonRef.current?.focus();
  }, [confirmation]);

  async function changeState() {
    const verb = isActive ? 'deactivate' : 'activate';
    setConfirmation(undefined);
    setPending('state');
    setMessage(undefined);
    try {
      if (isActive) await deactivateHabit(habitId);
      else await activateHabit(habitId);
      setMessage(`Habit ${verb}d successfully.`);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        window.location.assign('/login');
        return;
      }
      setMessage(
        error instanceof ApiError && error.status === 409
          ? 'This habit changed state elsewhere. Refresh and try again.'
          : 'The habit state could not be changed. Please try again.',
      );
    } finally {
      setPending(undefined);
    }
  }

  async function remove() {
    setConfirmation(undefined);
    setPending('delete');
    setMessage(undefined);
    try {
      await deleteHabit(habitId);
      router.push('/habits?success=deleted');
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        window.location.assign('/login');
        return;
      }
      if (error instanceof ApiError && error.status === 404) {
        router.replace('/habits');
        router.refresh();
        return;
      }
      setMessage('The habit could not be deleted. Please try again.');
      setPending(undefined);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          className="border-border hover:bg-muted focus-visible:ring-ring inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium focus-visible:ring-2 disabled:opacity-60"
          disabled={Boolean(pending)}
          onClick={() => setConfirmation('state')}
          type="button"
        >
          {pending === 'state' ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <Power aria-hidden="true" className="size-4" />
          )}
          {pending === 'state'
            ? 'Updating…'
            : isActive
              ? 'Deactivate'
              : 'Activate'}
        </button>
        <button
          className="border-destructive/40 text-destructive hover:bg-destructive/5 focus-visible:ring-ring inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium focus-visible:ring-2 disabled:opacity-60"
          disabled={Boolean(pending)}
          onClick={() => setConfirmation('delete')}
          type="button"
        >
          {pending === 'delete' ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <Trash2 aria-hidden="true" className="size-4" />
          )}
          {pending === 'delete' ? 'Deleting…' : 'Delete'}
        </button>
      </div>
      {confirmation && (
        <div
          aria-describedby="habit-confirmation-description"
          aria-labelledby="habit-confirmation-title"
          className="border-border bg-background space-y-4 rounded-lg border p-4 shadow-sm"
          role="alertdialog"
        >
          <div>
            <h2 className="font-semibold" id="habit-confirmation-title">
              {confirmation === 'delete'
                ? 'Delete this habit?'
                : `${isActive ? 'Deactivate' : 'Activate'} this habit?`}
            </h2>
            <p
              className="text-muted-foreground mt-1 text-sm"
              id="habit-confirmation-description"
            >
              {confirmation === 'delete'
                ? 'It will be removed from normal views. This cannot be undone.'
                : isActive
                  ? 'It will stop appearing in scheduled views.'
                  : 'It will return to scheduled views.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="border-border hover:bg-muted focus-visible:ring-ring rounded-lg border px-3 py-2 text-sm font-medium focus-visible:ring-2"
              onClick={() => setConfirmation(undefined)}
              type="button"
            >
              Keep habit
            </button>
            <button
              className={
                confirmation === 'delete'
                  ? 'bg-destructive text-destructive-foreground focus-visible:ring-ring rounded-lg px-3 py-2 text-sm font-semibold focus-visible:ring-2'
                  : 'bg-primary text-primary-foreground focus-visible:ring-ring rounded-lg px-3 py-2 text-sm font-semibold focus-visible:ring-2'
              }
              onClick={confirmation === 'delete' ? remove : changeState}
              ref={confirmButtonRef}
              type="button"
            >
              {confirmation === 'delete'
                ? 'Delete habit'
                : isActive
                  ? 'Deactivate habit'
                  : 'Activate habit'}
            </button>
          </div>
        </div>
      )}
      {message && (
        <p className="text-muted-foreground text-sm" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
