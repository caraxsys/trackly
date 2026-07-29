import { z } from 'zod';

export const reminderFormSchema = z.object({
  timeOfDay: z
    .string()
    .regex(
      /^(?:[01]\d|2[0-3]):[0-5]\d$/,
      'Enter a valid time in HH:mm format.',
    ),
  isEnabled: z.boolean(),
});

export type ReminderFormValues = z.infer<typeof reminderFormSchema>;
