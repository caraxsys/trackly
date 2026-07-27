import { z } from 'zod';

import { parseCalendarDate } from '../../lib/date/calendar-date.js';

const optionalDate = z
  .string()
  .refine((value) => parseCalendarDate(value) !== null, {
    message: 'date must be a valid calendar date in YYYY-MM-DD format.',
  })
  .optional();

const positiveInteger = z.coerce.number().int().positive();

export const habitCollectionQuerySchema = z.object({
  view: z.enum(['today', 'all', 'inactive']).default('today'),
  date: optionalDate,
  search: z
    .string()
    .transform((value) => value.trim())
    .default(''),
  sort: z
    .enum(['position', 'name', 'createdAt', 'updatedAt'])
    .default('position'),
  order: z.enum(['asc', 'desc']).default('asc'),
  page: positiveInteger.default(1),
  limit: positiveInteger.max(100).default(20),
});

export const habitParamsSchema = z.object({
  id: z.uuid(),
});

export type HabitCollectionRequestQuery = z.infer<
  typeof habitCollectionQuerySchema
>;
export type HabitParams = z.infer<typeof habitParamsSchema>;
