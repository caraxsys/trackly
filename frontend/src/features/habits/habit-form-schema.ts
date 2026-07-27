import { z } from 'zod';

export const habitFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required.').max(160),
    description: z.string().max(10_000),
    categoryId: z.string(),
    frequencyType: z.enum(['daily', 'weekly', 'custom']),
    targetCount: z
      .number({ message: 'Target must be a number.' })
      .int()
      .min(1, 'Target must be at least 1.'),
    startDate: z.iso.date('Enter a valid start date.'),
    endDate: z.union([z.literal(''), z.iso.date('Enter a valid end date.')]),
    weekdays: z.array(z.number().int().min(1).max(7)),
    isActive: z.boolean(),
  })
  .superRefine((value, context) => {
    if (value.endDate && value.endDate < value.startDate) {
      context.addIssue({
        code: 'custom',
        path: ['endDate'],
        message: 'End date must be on or after start date.',
      });
    }
    if (value.frequencyType !== 'daily' && value.weekdays.length === 0) {
      context.addIssue({
        code: 'custom',
        path: ['weekdays'],
        message: 'Select at least one weekday.',
      });
    }
  });
