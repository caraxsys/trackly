import { z } from 'zod';
import { isValidTimezone } from '../../lib/date/timezone.js';

const timezoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .refine(isValidTimezone, 'timezone must be a supported IANA identifier');

export const preferenceUpdateSchema = z
  .object({
    timezone: timezoneSchema.optional(),
    weekStartsOn: z.enum(['monday', 'sunday']).optional(),
    dateFormat: z.enum(['dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd']).optional(),
    timeFormat: z.enum(['12h', '24h']).optional(),
    theme: z.enum(['system', 'light', 'dark']).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one preference must be provided.',
  });

export type PreferenceUpdate = z.infer<typeof preferenceUpdateSchema>;
