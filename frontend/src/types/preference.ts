export type WeekStartsOn = 'monday' | 'sunday';
export type DateFormat = 'dd/MM/yyyy' | 'MM/dd/yyyy' | 'yyyy-MM-dd';
export type TimeFormat = '12h' | '24h';
export type ThemePreference = 'system' | 'light' | 'dark';

export interface UserPreferences {
  timezone: string;
  weekStartsOn: WeekStartsOn;
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  theme: ThemePreference;
  createdAt: string | null;
  updatedAt: string | null;
}

export type PreferenceUpdate = Partial<
  Pick<
    UserPreferences,
    'timezone' | 'weekStartsOn' | 'dateFormat' | 'timeFormat' | 'theme'
  >
>;
