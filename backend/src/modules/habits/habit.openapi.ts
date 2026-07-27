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

export const habitMutationDataSchema = {
  type: 'object',
  required: [
    'id',
    'name',
    'description',
    'categoryId',
    'frequencyType',
    'targetCount',
    'startDate',
    'endDate',
    'isActive',
    'weekdays',
  ],
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    description: { type: ['string', 'null'] },
    categoryId: { type: ['string', 'null'], format: 'uuid' },
    frequencyType: {
      type: 'string',
      enum: ['daily', 'weekly', 'custom'],
    },
    targetCount: { type: 'integer', minimum: 1 },
    startDate: { type: 'string', format: 'date' },
    endDate: { type: ['string', 'null'], format: 'date' },
    isActive: { type: 'boolean' },
    weekdays: {
      type: 'array',
      uniqueItems: true,
      items: { type: 'integer', minimum: 1, maximum: 7 },
    },
  },
};

export const habitStateDataSchema = {
  type: 'object',
  required: ['id', 'isActive'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    isActive: { type: 'boolean' },
  },
};

export const habitDeleteDataSchema = {
  type: 'object',
  required: ['id', 'deleted'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    deleted: { type: 'boolean', const: true },
  },
};

export const habitCheckInDataSchema = {
  type: 'object',
  required: ['habitId', 'date', 'completedCount', 'targetCount', 'isCompleted'],
  properties: {
    habitId: { type: 'string', format: 'uuid' },
    date: { type: 'string', format: 'date' },
    completedCount: { type: 'integer', minimum: 0 },
    targetCount: { type: 'integer', minimum: 1 },
    isCompleted: { type: 'boolean' },
  },
};

export const habitCheckInBodyJsonSchema = {
  type: 'object',
  required: ['completedCount'],
  additionalProperties: false,
  properties: {
    date: { type: 'string', format: 'date' },
    completedCount: { type: 'integer', minimum: 0 },
  },
  examples: [{ date: '2026-07-27', completedCount: 1 }],
};

export const habitCreateBodySchema = {
  type: 'object',
  required: ['name', 'frequencyType', 'startDate'],
  additionalProperties: false,
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 160 },
    description: { type: ['string', 'null'], maxLength: 10_000 },
    categoryId: { type: ['string', 'null'], format: 'uuid' },
    frequencyType: {
      type: 'string',
      enum: ['daily', 'weekly', 'custom'],
    },
    targetCount: { type: 'integer', minimum: 1, default: 1 },
    startDate: { type: 'string', format: 'date' },
    endDate: { type: ['string', 'null'], format: 'date' },
    weekdays: {
      type: 'array',
      uniqueItems: true,
      default: [],
      items: { type: 'integer', minimum: 1, maximum: 7 },
    },
    isActive: { type: 'boolean', default: true },
  },
  examples: [
    {
      name: 'Read',
      frequencyType: 'weekly',
      startDate: '2026-07-01',
      weekdays: [1, 3, 5],
      targetCount: 1,
    },
  ],
};

export const habitUpdateBodySchema = {
  ...habitCreateBodySchema,
  required: [],
  minProperties: 1,
  examples: [{ name: 'Read a chapter', targetCount: 2 }],
};
