import { z } from 'zod';

export const preferenceFormSchema = z.object({
  timezone: z.string().trim().min(1, 'Choose a timezone.').max(64),
  weekStartsOn: z.enum(['monday', 'sunday']),
  dateFormat: z.enum(['dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd']),
  timeFormat: z.enum(['12h', '24h']),
  theme: z.enum(['system', 'light', 'dark']),
});
