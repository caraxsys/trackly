'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { usePersistedTheme } from '@/components/preferences/persisted-theme';
import { preferenceFormSchema } from '@/features/preferences/preference-form-schema';
import { preferencePreview } from '@/lib/preference-format';
import { updatePreferences } from '@/services/preference-mutation-service';
import type { UserPreferences } from '@/types/preference';

type Values = z.infer<typeof preferenceFormSchema>;
const controlClass =
  'border-border bg-background focus-visible:ring-ring mt-1 w-full rounded-lg border px-3 py-2 outline-none focus-visible:ring-2';

function supportedTimezones(current: string) {
  const runtime =
    typeof Intl.supportedValuesOf === 'function'
      ? Intl.supportedValuesOf('timeZone')
      : ['UTC', 'America/New_York', 'Asia/Jakarta', 'Europe/London'];
  return [...new Set([current, 'UTC', ...runtime])].sort();
}

export function PreferenceForm({
  initialPreferences,
}: {
  initialPreferences: UserPreferences;
}) {
  const { applyPersistedTheme } = usePersistedTheme();
  const [message, setMessage] = useState('');
  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(preferenceFormSchema),
    defaultValues: initialPreferences,
  });
  const values = useWatch({ control });
  const timezones = useMemo(
    () => supportedTimezones(initialPreferences.timezone),
    [initialPreferences.timezone],
  );
  const preview = preferencePreview({
    ...initialPreferences,
    ...values,
  } as UserPreferences);

  const submit = handleSubmit(async (input) => {
    setMessage('');
    try {
      const saved = await updatePreferences(input);
      reset(saved);
      applyPersistedTheme(saved.theme);
      setMessage('Preferences saved.');
    } catch {
      setError('root', {
        message: 'Trackly could not save your preferences. Please try again.',
      });
    }
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]">
      <form
        className="border-border bg-surface space-y-5 rounded-xl border p-6"
        onSubmit={submit}
      >
        {errors.root ? (
          <p className="text-destructive text-sm" role="alert">
            {errors.root.message}
          </p>
        ) : null}
        <label className="block text-sm font-medium">
          Timezone
          <select
            aria-label="Timezone"
            className={controlClass}
            {...register('timezone')}
          >
            {timezones.map((timezone) => (
              <option key={timezone} value={timezone}>
                {timezone.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
          <span className="text-muted-foreground mt-1 block text-xs">
            Used to resolve your logical calendar day.
          </span>
          {errors.timezone ? (
            <span className="text-destructive text-sm" role="alert">
              {errors.timezone.message}
            </span>
          ) : null}
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <PreferenceSelect
            label="Week starts on"
            options={[
              ['monday', 'Monday'],
              ['sunday', 'Sunday'],
            ]}
            registration={register('weekStartsOn')}
          />
          <PreferenceSelect
            label="Date format"
            options={[
              ['dd/MM/yyyy', 'DD/MM/YYYY'],
              ['MM/dd/yyyy', 'MM/DD/YYYY'],
              ['yyyy-MM-dd', 'YYYY-MM-DD'],
            ]}
            registration={register('dateFormat')}
          />
          <PreferenceSelect
            label="Time format"
            options={[
              ['12h', '12-hour'],
              ['24h', '24-hour'],
            ]}
            registration={register('timeFormat')}
          />
          <PreferenceSelect
            label="Theme"
            options={[
              ['system', 'System'],
              ['light', 'Light'],
              ['dark', 'Dark'],
            ]}
            registration={register('theme')}
          />
        </div>

        <button
          className="bg-primary text-primary-foreground focus-visible:ring-ring rounded-lg px-4 py-2 font-medium outline-none focus-visible:ring-2 disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? 'Saving…' : 'Save preferences'}
        </button>
        <p aria-live="polite" className="text-sm" role="status">
          {message}
        </p>
      </form>

      <aside
        aria-labelledby="preference-preview-heading"
        className="border-border bg-surface h-fit rounded-xl border p-5"
      >
        <h2 id="preference-preview-heading" className="font-semibold">
          Preview
        </h2>
        <dl className="mt-4 grid gap-3 text-sm">
          <PreviewValue label="Sample date" value={preview.date} />
          <PreviewValue label="Sample time" value={preview.time} />
          <PreviewValue label="Week starts" value={preview.week} />
          <PreviewValue label="Theme" value={preview.theme} />
        </dl>
        <p className="text-muted-foreground mt-4 text-xs leading-5">
          Analytics remains Monday-first in this milestone.
        </p>
      </aside>
    </div>
  );
}

function PreferenceSelect({
  label,
  options,
  registration,
}: {
  label: string;
  options: ReadonlyArray<readonly [string, string]>;
  registration: ReturnType<ReturnType<typeof useForm<Values>>['register']>;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <select className={controlClass} {...registration}>
        {options.map(([value, optionLabel]) => (
          <option key={value} value={value}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function PreviewValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
