interface JsonSchema {
  [key: string]: unknown;
}

export const errorResponseJsonSchema: JsonSchema = {
  type: 'object',
  required: ['success', 'error'],
  properties: {
    success: { type: 'boolean', enum: [false] },
    error: {
      type: 'object',
      required: ['code', 'message'],
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
        details: {},
      },
    },
  },
};

export function successResponseJsonSchema(data: JsonSchema): JsonSchema {
  return {
    type: 'object',
    required: ['success', 'data'],
    properties: {
      success: { type: 'boolean', enum: [true] },
      data,
      meta: { type: 'object', additionalProperties: true },
    },
  };
}
