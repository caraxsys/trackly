import { resolveTimezone } from '../../lib/date/timezone.js';
import type { FullPreferenceRepository } from './preference.repository.js';
import type { PreferenceUpdate } from './preference.schema.js';
import {
  preferenceDefaults,
  type DateFormat,
  type PreferenceResponse,
  type ThemePreference,
  type TimeFormat,
} from './preference.types.js';

const dateFormats = ['dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd'] as const;
const timeFormats = ['12h', '24h'] as const;
const themes = ['system', 'light', 'dark'] as const;

function oneOf<T extends string>(
  value: string | null | undefined,
  values: readonly T[],
  fallback: T,
) {
  return value && values.includes(value as T) ? (value as T) : fallback;
}

function toResponse(
  value: Awaited<ReturnType<FullPreferenceRepository['findByUserId']>>,
): PreferenceResponse {
  return {
    timezone: resolveTimezone(value?.timezone),
    weekStartsOn: value?.weekStartsOn === 7 ? 'sunday' : 'monday',
    dateFormat: oneOf<DateFormat>(
      value?.dateFormat,
      dateFormats,
      preferenceDefaults.dateFormat,
    ),
    timeFormat: oneOf<TimeFormat>(
      value?.timeFormat,
      timeFormats,
      preferenceDefaults.timeFormat,
    ),
    theme: oneOf<ThemePreference>(
      value?.theme,
      themes,
      preferenceDefaults.theme,
    ),
    createdAt: value?.createdAt.toISOString() ?? null,
    updatedAt: value?.updatedAt.toISOString() ?? null,
  };
}

export function createPreferenceService(repository: FullPreferenceRepository) {
  return {
    async get(userId: string) {
      return toResponse(await repository.findByUserId(userId));
    },

    async update(userId: string, input: PreferenceUpdate) {
      const saved = await repository.upsert(userId, {
        ...(input.timezone ? { timezone: input.timezone } : {}),
        ...(input.weekStartsOn
          ? { weekStartsOn: input.weekStartsOn === 'monday' ? 1 : 7 }
          : {}),
        ...(input.dateFormat ? { dateFormat: input.dateFormat } : {}),
        ...(input.timeFormat ? { timeFormat: input.timeFormat } : {}),
        ...(input.theme ? { theme: input.theme } : {}),
      });
      if (!saved) throw new Error('Preference upsert did not return a row.');
      return toResponse(saved);
    },
  };
}

export type PreferenceService = ReturnType<typeof createPreferenceService>;
