'use client';

import { Bell, Pencil, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { ReminderForm } from '@/components/reminders/reminder-form';
import type { ReminderFormValues } from '@/features/reminders/reminder-form-schema';
import { formatTimeOfDay } from '@/lib/preference-format';
import { ApiError } from '@/services/api-error';
import {
  createReminder,
  deleteReminder,
  updateReminder,
} from '@/services/reminder-mutation-service';
import type { TimeFormat } from '@/types/preference';
import type { Reminder } from '@/types/reminder';

function sorted(items: Reminder[]) {
  return [...items].sort(
    (left, right) =>
      left.timeOfDay.localeCompare(right.timeOfDay) ||
      left.id.localeCompare(right.id),
  );
}

function friendlyMutationError(error: unknown) {
  if (error instanceof ApiError && error.status === 409) {
    return new Error('A reminder already exists at that time.');
  }
  return new Error('The reminder could not be saved. Please try again.');
}

export function ReminderManager({
  habitId,
  initialItems,
  isHabitActive,
  timeFormat,
  timezone,
}: {
  habitId: string;
  initialItems: Reminder[];
  isHabitActive: boolean;
  timeFormat: TimeFormat;
  timezone: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState(() => sorted(initialItems));
  const [form, setForm] = useState<{ mode: 'add' | 'edit'; item?: Reminder }>();
  const [deleteTarget, setDeleteTarget] = useState<Reminder>();
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string>();
  const confirmDeleteRef = useRef<HTMLButtonElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLButtonElement | undefined>(undefined);

  useEffect(() => {
    if (deleteTarget) confirmDeleteRef.current?.focus();
  }, [deleteTarget]);

  async function save(values: ReminderFormValues) {
    setMessage(undefined);
    try {
      const saved =
        form?.mode === 'edit' && form.item
          ? await updateReminder(habitId, form.item.id, values)
          : await createReminder(habitId, values);
      setItems((current) =>
        sorted(
          form?.mode === 'edit'
            ? current.map((item) => (item.id === saved.id ? saved : item))
            : [...current, saved],
        ),
      );
      setForm(undefined);
      setMessage(
        `Reminder ${form?.mode === 'edit' ? 'updated' : 'added'} successfully.`,
      );
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        window.location.assign('/login');
        return;
      }
      throw friendlyMutationError(error);
    }
  }

  function closeForm() {
    setForm(undefined);
    queueMicrotask(() => returnFocusRef.current?.focus());
  }

  function closeDeleteConfirmation() {
    setDeleteTarget(undefined);
    queueMicrotask(() => returnFocusRef.current?.focus());
  }

  async function remove() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setMessage(undefined);
    try {
      await deleteReminder(habitId, deleteTarget.id);
      setItems((current) =>
        current.filter((item) => item.id !== deleteTarget.id),
      );
      setDeleteTarget(undefined);
      setMessage('Reminder deleted successfully.');
      router.refresh();
      queueMicrotask(() => addButtonRef.current?.focus());
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        window.location.assign('/login');
        return;
      }
      setMessage('The reminder could not be deleted. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section
      aria-labelledby="reminders-heading"
      className="border-border bg-surface rounded-xl border p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Bell aria-hidden="true" className="text-primary size-5" />
            <h2 className="text-lg font-semibold" id="reminders-heading">
              Reminders
            </h2>
          </div>
          <p className="text-muted-foreground mt-2 text-sm">
            Timezone: <span className="text-foreground">{timezone}</span>
          </p>
        </div>
        <button
          className="border-border hover:bg-muted focus-visible:ring-ring inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium focus-visible:ring-2"
          disabled={Boolean(form)}
          onClick={(event) => {
            returnFocusRef.current = event.currentTarget;
            setForm({ mode: 'add' });
          }}
          ref={addButtonRef}
          type="button"
        >
          <Plus aria-hidden="true" className="size-4" /> Add reminder
        </button>
      </div>
      <p className="text-muted-foreground mt-4 text-sm">
        Reminders follow this Habit&apos;s schedule and use your configured
        timezone.
      </p>
      <p className="text-muted-foreground mt-1 text-sm">
        Notification delivery is not available yet.
      </p>
      {!isHabitActive ? (
        <p className="border-border bg-muted mt-4 rounded-lg border p-3 text-sm">
          This Habit is archived. Its reminders are preserved but are currently
          inactive. You can still edit them.
        </p>
      ) : null}

      {form?.mode === 'add' ? (
        <ReminderForm
          initialValues={{ timeOfDay: '', isEnabled: true }}
          mode="add"
          onCancel={closeForm}
          onSave={save}
        />
      ) : null}

      {items.length === 0 ? (
        <div className="border-border mt-5 rounded-lg border border-dashed p-5 text-center">
          <p className="font-medium">No reminders yet.</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Add your first reminder.
          </p>
        </div>
      ) : (
        <ul className="mt-5 divide-y">
          {items.map((item) => (
            <li className="py-4 first:pt-0 last:pb-0" key={item.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">
                    {formatTimeOfDay(item.timeOfDay, timeFormat)}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {item.isEnabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    aria-label={`Edit ${formatTimeOfDay(item.timeOfDay, timeFormat)} reminder`}
                    className="border-border hover:bg-muted focus-visible:ring-ring inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium focus-visible:ring-2"
                    disabled={Boolean(form)}
                    onClick={(event) => {
                      returnFocusRef.current = event.currentTarget;
                      setForm({ mode: 'edit', item });
                    }}
                    type="button"
                  >
                    <Pencil aria-hidden="true" className="size-4" /> Edit
                  </button>
                  <button
                    aria-label={`Delete ${formatTimeOfDay(item.timeOfDay, timeFormat)} reminder`}
                    className="border-destructive/40 text-destructive hover:bg-destructive/5 focus-visible:ring-ring inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium focus-visible:ring-2"
                    disabled={deleting}
                    onClick={(event) => {
                      returnFocusRef.current = event.currentTarget;
                      setDeleteTarget(item);
                    }}
                    type="button"
                  >
                    <Trash2 aria-hidden="true" className="size-4" /> Delete
                  </button>
                </div>
              </div>
              {form?.mode === 'edit' && form.item?.id === item.id ? (
                <ReminderForm
                  initialValues={{
                    timeOfDay: item.timeOfDay,
                    isEnabled: item.isEnabled,
                  }}
                  mode="edit"
                  onCancel={closeForm}
                  onSave={save}
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {deleteTarget ? (
        <div
          aria-describedby="delete-reminder-description"
          aria-labelledby="delete-reminder-title"
          className="border-border bg-background mt-5 space-y-4 rounded-lg border p-4 shadow-sm"
          role="alertdialog"
        >
          <div>
            <h3 className="font-semibold" id="delete-reminder-title">
              Delete this reminder?
            </h3>
            <p
              className="text-muted-foreground mt-1 text-sm"
              id="delete-reminder-description"
            >
              Only this Reminder configuration is removed. The Habit and
              historical tracking remain unchanged.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="border-border hover:bg-muted focus-visible:ring-ring rounded-lg border px-3 py-2 text-sm font-medium focus-visible:ring-2"
              disabled={deleting}
              onClick={closeDeleteConfirmation}
              type="button"
            >
              Keep reminder
            </button>
            <button
              className="bg-destructive text-destructive-foreground focus-visible:ring-ring rounded-lg px-3 py-2 text-sm font-semibold focus-visible:ring-2 disabled:opacity-60"
              disabled={deleting}
              onClick={remove}
              ref={confirmDeleteRef}
              type="button"
            >
              {deleting ? 'Deleting…' : 'Delete reminder'}
            </button>
          </div>
        </div>
      ) : null}
      {message ? (
        <p className="text-muted-foreground mt-4 text-sm" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
