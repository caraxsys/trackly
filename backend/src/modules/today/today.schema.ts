import { z } from 'zod';

import { parseCalendarDate } from '../../lib/date/calendar-date.js';

export const todayQuerySchema = z.object({
  date: z
    .string()
    .refine((value) => parseCalendarDate(value) !== null, {
      message: 'date must be a valid calendar date in YYYY-MM-DD format.',
    })
    .optional(),
});

export type TodayQuery = z.infer<typeof todayQuerySchema>;
