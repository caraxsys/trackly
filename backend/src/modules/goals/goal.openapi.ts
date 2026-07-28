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
    'progress',
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
    progress: {
      type: 'object',
      description:
        'Read-only request-time accumulation from owned Habit check-ins. Rates use the 0-100 percentage convention.',
      required: [
        'currentCount',
        'targetCount',
        'remainingCount',
        'progressRate',
        'isTargetReached',
      ],
      properties: {
        currentCount: { type: 'integer', minimum: 0 },
        targetCount: { type: 'integer', minimum: 1 },
        remainingCount: { type: 'integer', minimum: 0 },
        progressRate: { type: 'number', minimum: 0 },
        isTargetReached: { type: 'boolean' },
      },
    },
  },
} as const;
