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

export const analyticsHeatmapJsonSchema = {
  type: 'object',
  required: ['period', 'startDate', 'endDate', 'summary', 'days'],
  properties: {
    period: { type: 'string', enum: ['90d', '180d', '365d'] },
    startDate: { type: 'string', format: 'date' },
    endDate: { type: 'string', format: 'date' },
    summary: {
      type: 'object',
      required: [
        'activeDays',
        'completedDays',
        'totalScheduledCount',
        'totalCompletedCount',
        'averageCompletionRate',
      ],
      properties: {
        activeDays: { type: 'integer', minimum: 0 },
        completedDays: { type: 'integer', minimum: 0 },
        totalScheduledCount: { type: 'integer', minimum: 0 },
        totalCompletedCount: { type: 'integer', minimum: 0 },
        averageCompletionRate: { type: 'number', minimum: 0, maximum: 100 },
      },
    },
    days: {
      type: 'array',
      items: {
        type: 'object',
        required: [
          'date',
          'scheduledCount',
          'completedCount',
          'completionRate',
          'level',
        ],
        properties: {
          date: { type: 'string', format: 'date' },
          scheduledCount: { type: 'integer', minimum: 0 },
          completedCount: { type: 'integer', minimum: 0 },
          completionRate: { type: 'number', minimum: 0, maximum: 100 },
          level: { type: 'integer', minimum: 0, maximum: 4 },
        },
      },
    },
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

const nullableDayInsightSchema = {
  anyOf: [
    {
      type: 'object',
      required: ['date', 'completionRate'],
      properties: {
        date: { type: 'string', format: 'date' },
        completionRate: { type: 'number', minimum: 0, maximum: 100 },
      },
    },
    { type: 'null' },
  ],
} as const;

export const analyticsInsightsJsonSchema = {
  type: 'object',
  required: ['period', 'startDate', 'endDate', 'hasActivity', 'insights'],
  properties: {
    period: { type: 'string', enum: ['7d', '30d', '90d'] },
    startDate: { type: 'string', format: 'date' },
    endDate: { type: 'string', format: 'date' },
    hasActivity: { type: 'boolean' },
    insights: {
      type: 'object',
      required: [
        'bestDay',
        'lowestDay',
        'mostProductiveWeekday',
        'consistency',
        'trend',
      ],
      properties: {
        bestDay: nullableDayInsightSchema,
        lowestDay: nullableDayInsightSchema,
        mostProductiveWeekday: {
          anyOf: [
            {
              type: 'object',
              required: ['weekday', 'averageCompletionRate'],
              properties: {
                weekday: {
                  type: 'string',
                  enum: [
                    'monday',
                    'tuesday',
                    'wednesday',
                    'thursday',
                    'friday',
                    'saturday',
                    'sunday',
                  ],
                },
                averageCompletionRate: {
                  type: 'number',
                  minimum: 0,
                  maximum: 100,
                },
              },
            },
            { type: 'null' },
          ],
        },
        consistency: {
          anyOf: [
            {
              type: 'object',
              required: ['fullyCompletedDays', 'activeDays', 'consistencyRate'],
              properties: {
                fullyCompletedDays: { type: 'integer', minimum: 0 },
                activeDays: { type: 'integer', minimum: 0 },
                consistencyRate: {
                  type: 'number',
                  minimum: 0,
                  maximum: 100,
                },
              },
            },
            { type: 'null' },
          ],
        },
        trend: {
          anyOf: [
            {
              type: 'object',
              required: [
                'direction',
                'currentAverageCompletionRate',
                'previousAverageCompletionRate',
                'changePercentagePoints',
              ],
              properties: {
                direction: {
                  type: 'string',
                  enum: ['up', 'down', 'flat', 'insufficient-data'],
                },
                currentAverageCompletionRate: {
                  type: ['number', 'null'],
                  minimum: 0,
                  maximum: 100,
                },
                previousAverageCompletionRate: {
                  type: ['number', 'null'],
                  minimum: 0,
                  maximum: 100,
                },
                changePercentagePoints: {
                  type: ['number', 'null'],
                  minimum: -100,
                  maximum: 100,
                },
              },
            },
            { type: 'null' },
          ],
        },
      },
    },
  },
} as const;
