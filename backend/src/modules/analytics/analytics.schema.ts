import { z } from 'zod';

import { parseCalendarDate } from '../../lib/date/calendar-date.js';

export const analyticsSummaryQuerySchema = z.object({
  period: z.enum(['day', 'week', 'month']),
  date: z
    .string()
    .refine((value) => parseCalendarDate(value) !== null, {
      message: 'date must be a valid calendar date in YYYY-MM-DD format.',
    })
    .optional(),
});

export type AnalyticsSummaryQuery = z.infer<typeof analyticsSummaryQuerySchema>;
