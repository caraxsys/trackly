export const pushSubscriptionJsonSchema = {
  type: 'object',
  required: [
    'id',
    'endpointIdentifier',
    'userAgent',
    'isEnabled',
    'createdAt',
    'updatedAt',
  ],
  properties: {
    id: { type: 'string', format: 'uuid' },
    endpointIdentifier: {
      type: 'string',
      description: 'A safely truncated identifier, not the full push endpoint.',
    },
    userAgent: { type: ['string', 'null'] },
    isEnabled: { type: 'boolean' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
} as const;

export const pushSubscriptionListJsonSchema = {
  type: 'object',
  required: ['items'],
  properties: {
    items: { type: 'array', items: pushSubscriptionJsonSchema },
  },
} as const;

export const pushSubscriptionDeleteJsonSchema = {
  type: 'object',
  required: ['unsubscribed'],
  properties: { unsubscribed: { type: 'boolean', const: true } },
} as const;
