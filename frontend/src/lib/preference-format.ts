import type {
  DateFormat,
  TimeFormat,
  UserPreferences,
} from '@/types/preference';

const previewDate = { day: '14', month: '07', year: '2026' };

export function formatPreferenceDate(format: DateFormat) {
  if (format === 'dd/MM/yyyy')
    return `${previewDate.day}/${previewDate.month}/${previewDate.year}`;
  if (format === 'MM/dd/yyyy')
    return `${previewDate.month}/${previewDate.day}/${previewDate.year}`;
  return `${previewDate.year}-${previewDate.month}-${previewDate.day}`;
}

export function formatPreferenceTime(format: TimeFormat) {
  return format === '12h' ? '1:45 PM' : '13:45';
}

export function preferencePreview(preferences: UserPreferences) {
  return {
    date: formatPreferenceDate(preferences.dateFormat),
    time: formatPreferenceTime(preferences.timeFormat),
    week: preferences.weekStartsOn === 'monday' ? 'Monday' : 'Sunday',
    theme:
      preferences.theme.charAt(0).toUpperCase() + preferences.theme.slice(1),
  };
}
