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

const calendarDate = z
  .string()
  .refine(
    (value) => parseCalendarDate(value) !== null,
    'Must be a valid calendar date in YYYY-MM-DD format.',
  );
const weekdays = z
  .array(z.number().int().min(1).max(7))
  .superRefine((values, context) => {
    if (new Set(values).size !== values.length) {
      context.addIssue({
        code: 'custom',
        message: 'weekdays must not contain duplicates.',
      });
    }
  })
  .transform((values) => [...values].sort((left, right) => left - right));

function validateHabitDates(
  value: {
    endDate?: string | null | undefined;
    startDate?: string | undefined;
  },
  context: z.RefinementCtx,
) {
  if (value.startDate && value.endDate && value.endDate < value.startDate) {
    context.addIssue({
      code: 'custom',
      path: ['endDate'],
      message: 'endDate must be on or after startDate.',
    });
  }
}

const mutableHabitFields = {
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(10_000).nullable(),
  categoryId: z.uuid().nullable(),
  frequencyType: z.enum(['daily', 'weekly', 'custom']),
  targetCount: z.number().int().min(1),
  startDate: calendarDate,
  endDate: calendarDate.nullable(),
  weekdays,
  isActive: z.boolean(),
};

export const createHabitBodySchema = z
  .object({
    name: mutableHabitFields.name,
    description: mutableHabitFields.description.optional(),
    categoryId: mutableHabitFields.categoryId.optional(),
    frequencyType: mutableHabitFields.frequencyType,
    targetCount: mutableHabitFields.targetCount.default(1),
    startDate: mutableHabitFields.startDate,
    endDate: mutableHabitFields.endDate.optional(),
    weekdays: mutableHabitFields.weekdays.default([]),
    isActive: mutableHabitFields.isActive.default(true),
  })
  .superRefine((value, context) => {
    validateHabitDates(value, context);
    if (value.frequencyType !== 'daily' && value.weekdays.length === 0) {
      context.addIssue({
        code: 'custom',
        path: ['weekdays'],
        message: 'At least one weekday is required.',
      });
    }
  });

export const updateHabitBodySchema = z
  .object({
    name: mutableHabitFields.name.optional(),
    description: mutableHabitFields.description.optional(),
    categoryId: mutableHabitFields.categoryId.optional(),
    frequencyType: mutableHabitFields.frequencyType.optional(),
    targetCount: mutableHabitFields.targetCount.optional(),
    startDate: mutableHabitFields.startDate.optional(),
    endDate: mutableHabitFields.endDate.optional(),
    weekdays: mutableHabitFields.weekdays.optional(),
    isActive: mutableHabitFields.isActive.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided.',
  })
  .superRefine(validateHabitDates);

export const habitCheckInBodySchema = z.object({
  date: calendarDate.optional(),
  completedCount: z.number().int().min(0),
});

export type HabitCollectionRequestQuery = z.infer<
  typeof habitCollectionQuerySchema
>;
export type HabitParams = z.infer<typeof habitParamsSchema>;
export type CreateHabitBody = z.infer<typeof createHabitBodySchema>;
export type UpdateHabitBody = z.infer<typeof updateHabitBodySchema>;
export type HabitCheckInBody = z.infer<typeof habitCheckInBodySchema>;
