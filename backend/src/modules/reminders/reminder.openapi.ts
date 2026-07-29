export const reminderJsonSchema = {
  type: 'object',
  required: [
    'id',
    'habitId',
    'timeOfDay',
    'isEnabled',
    'createdAt',
    'updatedAt',
  ],
  properties: {
    id: { type: 'string', format: 'uuid' },
    habitId: { type: 'string', format: 'uuid' },
    timeOfDay: {
      type: 'string',
      pattern: '^(?:[01]\\d|2[0-3]):[0-5]\\d$',
      example: '08:30',
      description: 'User-local reminder time in strict 24-hour HH:mm format.',
    },
    isEnabled: { type: 'boolean' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
} as const;

export const reminderListJsonSchema = {
  type: 'object',
  required: ['timezone', 'items'],
  properties: {
    timezone: {
      type: 'string',
      description:
        'Resolved user preference timezone, with the established safe UTC fallback.',
    },
    items: { type: 'array', items: reminderJsonSchema },
  },
} as const;

export const reminderDeleteJsonSchema = {
  type: 'object',
  required: ['id', 'deleted'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    deleted: { type: 'boolean', const: true },
  },
} as const;
