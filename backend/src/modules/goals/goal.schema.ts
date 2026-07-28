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

export type GoalStatus = z.infer<typeof goalStatusSchema>;

export const goalParamsSchema = z.object({ id: z.uuid() });
export const goalListQuerySchema = z
  .object({
    status: goalStatusSchema.optional(),
    habitId: z.uuid().optional(),
    startDate: calendarDateSchema.optional(),
    endDate: calendarDateSchema.optional(),
  })
  .refine(
    ({ startDate, endDate }) => !startDate || !endDate || endDate >= startDate,
    { message: 'endDate must be on or after startDate.', path: ['endDate'] },
  );

export const goalCreateBodySchema = goalCreateSchema.extend({
  status: goalStatusSchema.default('active'),
});

export const goalUpdateBodySchema = z
  .object({
    habitId: z.uuid().optional(),
    name: z.string().trim().min(1).max(200).optional(),
    targetCount: z.int().min(1).optional(),
    startDate: calendarDateSchema.optional(),
    endDate: calendarDateSchema.optional(),
    status: goalStatusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required.',
  });

export type GoalParams = z.infer<typeof goalParamsSchema>;
export type GoalListQuery = z.infer<typeof goalListQuerySchema>;
export type GoalCreateBody = z.infer<typeof goalCreateBodySchema>;
export type GoalUpdateBody = z.infer<typeof goalUpdateBodySchema>;
