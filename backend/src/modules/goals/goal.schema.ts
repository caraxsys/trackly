import { z } from 'zod';

export const goalStatusSchema = z.enum(['active', 'completed', 'cancelled']);
const calendarDateSchema = z.iso.date();

export const goalSchema = z.object({
  id: z.uuid(),
  userId: z.string().min(1),
  habitId: z.uuid(),
  name: z.string().trim().min(1).max(200),
  targetCount: z.int().min(1),
  startDate: calendarDateSchema,
  endDate: calendarDateSchema,
  status: goalStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const goalCreateSchema = goalSchema
  .pick({
    habitId: true,
    name: true,
    targetCount: true,
    startDate: true,
    endDate: true,
  })
  .refine(({ startDate, endDate }) => endDate >= startDate, {
    message: 'End date must be on or after start date.',
    path: ['endDate'],
  });

export const goalUpdateSchema = goalCreateSchema
  .omit({ habitId: true })
  .partial()
  .extend({ status: goalStatusSchema.optional() });

export type GoalStatus = z.infer<typeof goalStatusSchema>;
