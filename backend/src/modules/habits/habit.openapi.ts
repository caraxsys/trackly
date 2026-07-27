const categorySchema = {
  anyOf: [
    {
      type: 'object',
      required: ['id', 'name', 'color', 'icon'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        color: { type: ['string', 'null'] },
        icon: { type: ['string', 'null'] },
      },
    },
    { type: 'null' },
  ],
};

const projectionSchema = {
  type: 'object',
  required: ['date', 'isScheduled', 'completedCount', 'isCompleted'],
  properties: {
    date: { type: 'string', format: 'date' },
    isScheduled: { type: 'boolean' },
    completedCount: { type: 'integer', minimum: 0 },
    isCompleted: { type: 'boolean' },
  },
};

const baseHabitProperties = {
  id: { type: 'string', format: 'uuid' },
  name: { type: 'string' },
  description: { type: ['string', 'null'] },
  frequencyType: { type: 'string', enum: ['daily', 'weekly', 'custom'] },
  targetCount: { type: 'integer', minimum: 1 },
  isActive: { type: 'boolean' },
  startDate: { type: 'string', format: 'date' },
  endDate: { type: ['string', 'null'], format: 'date' },
  position: { type: 'integer', minimum: 0 },
  category: categorySchema,
  schedule: {
    type: 'object',
    required: ['weekdays'],
    properties: {
      weekdays: {
        type: 'array',
        items: { type: 'integer', minimum: 1, maximum: 7 },
      },
    },
  },
  createdAt: { type: 'string', format: 'date-time' },
  updatedAt: { type: 'string', format: 'date-time' },
};

const baseRequired = Object.keys(baseHabitProperties);

export const habitCollectionDataSchema = {
  type: 'object',
  required: ['items', 'pagination', 'query'],
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        required: [...baseRequired, 'selectedDate'],
        properties: { ...baseHabitProperties, selectedDate: projectionSchema },
      },
    },
    pagination: {
      type: 'object',
      required: [
        'page',
        'limit',
        'totalItems',
        'totalPages',
        'hasPreviousPage',
        'hasNextPage',
      ],
      properties: {
        page: { type: 'integer', minimum: 1 },
        limit: { type: 'integer', minimum: 1, maximum: 100 },
        totalItems: { type: 'integer', minimum: 0 },
        totalPages: { type: 'integer', minimum: 0 },
        hasPreviousPage: { type: 'boolean' },
        hasNextPage: { type: 'boolean' },
      },
    },
    query: {
      type: 'object',
      required: ['view', 'date', 'timezone', 'search', 'sort', 'order'],
      properties: {
        view: { type: 'string', enum: ['today', 'all', 'inactive'] },
        date: { type: 'string', format: 'date' },
        timezone: { type: 'string' },
        search: { type: 'string' },
        sort: {
          type: 'string',
          enum: ['position', 'name', 'createdAt', 'updatedAt'],
        },
        order: { type: 'string', enum: ['asc', 'desc'] },
      },
    },
  },
};

export const habitDetailDataSchema = {
  type: 'object',
  required: [...baseRequired, 'today', 'timezone'],
  properties: {
    ...baseHabitProperties,
    today: projectionSchema,
    timezone: { type: 'string' },
  },
};
