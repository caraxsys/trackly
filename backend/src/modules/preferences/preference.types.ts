import { DEFAULT_TIMEZONE } from '../../lib/date/timezone.js';

export const preferenceDefaults = {
  timezone: DEFAULT_TIMEZONE,
  weekStartsOn: 'monday',
  dateFormat: 'yyyy-MM-dd',
  timeFormat: '24h',
  theme: 'system',
} as const;

export type WeekStartsOn = 'monday' | 'sunday';
export type DateFormat = 'dd/MM/yyyy' | 'MM/dd/yyyy' | 'yyyy-MM-dd';
export type TimeFormat = '12h' | '24h';
export type ThemePreference = 'system' | 'light' | 'dark';

export interface PreferenceResponse {
  timezone: string;
  weekStartsOn: WeekStartsOn;
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  theme: ThemePreference;
  createdAt: string | null;
  updatedAt: string | null;
}
