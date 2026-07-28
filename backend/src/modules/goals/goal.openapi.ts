export const goalStatusJsonSchema = {
  type: 'string',
  enum: ['active', 'completed', 'cancelled'],
} as const;

export const goalJsonSchema = {
  type: 'object',
  required: [
    'id',
    'userId',
    'habitId',
    'habitName',
    'name',
    'targetCount',
    'startDate',
    'endDate',
    'status',
    'createdAt',
    'updatedAt',
  ],
  properties: {
    id: { type: 'string', format: 'uuid' },
    userId: { type: 'string' },
    habitId: { type: 'string', format: 'uuid' },
    habitName: { type: 'string' },
    name: { type: 'string', minLength: 1, maxLength: 200 },
    targetCount: { type: 'integer', minimum: 1 },
    startDate: { type: 'string', format: 'date' },
    endDate: { type: 'string', format: 'date' },
    status: goalStatusJsonSchema,
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
} as const;
