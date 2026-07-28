import { z } from 'zod';
export const goalFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required.').max(200),
    habitId: z.string().uuid('Choose a Habit.'),
    targetCount: z.number().int().min(1, 'Target must be at least 1.'),
    startDate: z.iso.date(),
    endDate: z.iso.date(),
    status: z.enum(['active', 'completed', 'cancelled']),
  })
  .refine(({ startDate, endDate }) => endDate >= startDate, {
    path: ['endDate'],
    message: 'End date must be on or after start date.',
  });
