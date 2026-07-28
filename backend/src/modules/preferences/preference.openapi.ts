export const preferenceProperties = {
  timezone: {
    type: 'string',
    description: 'Supported IANA timezone identifier.',
  },
  weekStartsOn: { type: 'string', enum: ['monday', 'sunday'] },
  dateFormat: {
    type: 'string',
    enum: ['dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd'],
  },
  timeFormat: { type: 'string', enum: ['12h', '24h'] },
  theme: { type: 'string', enum: ['system', 'light', 'dark'] },
} as const;

export const preferenceResponseSchema = {
  type: 'object',
  required: [
    'timezone',
    'weekStartsOn',
    'dateFormat',
    'timeFormat',
    'theme',
    'createdAt',
    'updatedAt',
  ],
  properties: {
    ...preferenceProperties,
    createdAt: { type: ['string', 'null'], format: 'date-time' },
    updatedAt: { type: ['string', 'null'], format: 'date-time' },
  },
} as const;
