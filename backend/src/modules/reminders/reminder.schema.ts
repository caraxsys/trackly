import { z } from 'zod';

export const reminderParamsSchema = z
  .object({
    habitId: z.uuid(),
    reminderId: z.uuid().optional(),
  })
  .strict();

const timeOfDaySchema = z
  .string()
  .regex(
    /^(?:[01]\d|2[0-3]):[0-5]\d$/,
    'timeOfDay must use strict 24-hour HH:mm format.',
  );

export const reminderCreateBodySchema = z
  .object({
    timeOfDay: timeOfDaySchema,
    isEnabled: z.boolean().default(true),
  })
  .strict();

export const reminderUpdateBodySchema = z
  .object({
    timeOfDay: timeOfDaySchema.optional(),
    isEnabled: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one reminder field must be provided.',
  });

export type ReminderParams = z.infer<typeof reminderParamsSchema>;
export type ReminderCreateBody = z.infer<typeof reminderCreateBodySchema>;
export type ReminderUpdateBody = z.infer<typeof reminderUpdateBodySchema>;
