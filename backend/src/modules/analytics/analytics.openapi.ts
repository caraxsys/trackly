export const analyticsSummaryJsonSchema = {
  type: 'object',
  required: [
    'period',
    'startDate',
    'endDate',
    'scheduledCount',
    'completedCount',
    'completionRate',
    'totalTargetCount',
    'totalCompletedCount',
    'progressRate',
  ],
  properties: {
    period: { type: 'string', enum: ['day', 'week', 'month'] },
    startDate: { type: 'string', format: 'date' },
    endDate: { type: 'string', format: 'date' },
    scheduledCount: { type: 'integer', minimum: 0 },
    completedCount: { type: 'integer', minimum: 0 },
    completionRate: { type: 'number', minimum: 0, maximum: 100 },
    totalTargetCount: { type: 'integer', minimum: 0 },
    totalCompletedCount: { type: 'integer', minimum: 0 },
    progressRate: { type: 'number', minimum: 0, maximum: 100 },
  },
} as const;

const analyticsHistoryPointJsonSchema = {
  type: 'object',
  required: [
    'date',
    'scheduledCount',
    'completedCount',
    'completionRate',
    'totalTargetCount',
    'totalCompletedCount',
    'progressRate',
  ],
  properties: {
    date: { type: 'string', format: 'date' },
    scheduledCount: { type: 'integer', minimum: 0 },
    completedCount: { type: 'integer', minimum: 0 },
    completionRate: { type: 'number', minimum: 0, maximum: 100 },
    totalTargetCount: { type: 'integer', minimum: 0 },
    totalCompletedCount: { type: 'integer', minimum: 0 },
    progressRate: { type: 'number', minimum: 0, maximum: 100 },
  },
} as const;

export const analyticsHistoryJsonSchema = {
  type: 'object',
  required: [
    'period',
    'granularity',
    'startDate',
    'endDate',
    'summary',
    'history',
  ],
  properties: {
    period: { type: 'string', enum: ['7d', '30d', '90d'] },
    granularity: { type: 'string', enum: ['day'] },
    startDate: { type: 'string', format: 'date' },
    endDate: { type: 'string', format: 'date' },
    summary: {
      type: 'object',
      required: [
        'averageCompletionRate',
        'averageProgressRate',
        'scheduledCount',
        'completedCount',
        'totalTargetCount',
        'totalCompletedCount',
      ],
      properties: {
        averageCompletionRate: {
          type: 'number',
          minimum: 0,
          maximum: 100,
        },
        averageProgressRate: {
          type: 'number',
          minimum: 0,
          maximum: 100,
        },
        scheduledCount: { type: 'integer', minimum: 0 },
        completedCount: { type: 'integer', minimum: 0 },
        totalTargetCount: { type: 'integer', minimum: 0 },
        totalCompletedCount: { type: 'integer', minimum: 0 },
      },
    },
    history: {
      type: 'array',
      items: analyticsHistoryPointJsonSchema,
    },
  },
} as const;
