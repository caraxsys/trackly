import type { FastifyInstance } from 'fastify';

import { database } from '../../db/client.js';
import {
  errorResponseJsonSchema,
  successResponseJsonSchema,
} from '../../http/openapi-schemas.js';
import { validateRequest } from '../../validation/validate.js';
import { createPreferenceRepository } from '../preferences/preference.repository.js';
import { createAnalyticsQueryController } from './analytics.controller.js';
import {
  analyticsHeatmapJsonSchema,
  analyticsHistoryJsonSchema,
  analyticsInsightsJsonSchema,
  analyticsSummaryJsonSchema,
} from './analytics.openapi.js';
import { createAnalyticsQueryRepository } from './analytics.repository.js';
import {
  analyticsHeatmapQuerySchema,
  analyticsHistoryQuerySchema,
  analyticsInsightsQuerySchema,
  analyticsSummaryQuerySchema,
  type AnalyticsHeatmapQuery,
  type AnalyticsHistoryQuery,
  type AnalyticsInsightsQuery,
  type AnalyticsSummaryQuery,
} from './analytics.schema.js';
import { createAnalyticsQueryService } from './analytics.service.js';

const analyticsService = createAnalyticsQueryService({
  analyticsRepository: createAnalyticsQueryRepository(database),
  preferenceRepository: createPreferenceRepository(database),
});
const analyticsController = createAnalyticsQueryController(analyticsService);

export function analyticsRoutes(app: FastifyInstance) {
  app.get<{ Querystring: AnalyticsHeatmapQuery }>(
    '/analytics/heatmap',
    {
      preValidation: validateRequest({ query: analyticsHeatmapQuerySchema }),
      schema: {
        tags: ['analytics'],
        summary: "Get the authenticated user's contribution heatmap",
        description:
          'Returns a gap-free, timezone-aware daily completion heatmap ending on the current user-local date. Derived aggregates are never persisted.',
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            period: {
              type: 'string',
              enum: ['90d', '180d', '365d'],
              default: '365d',
            },
          },
        },
        response: {
          200: successResponseJsonSchema(analyticsHeatmapJsonSchema),
          400: errorResponseJsonSchema,
          401: errorResponseJsonSchema,
          500: errorResponseJsonSchema,
        },
      },
    },
    analyticsController.heatmap,
  );

  app.get<{ Querystring: AnalyticsSummaryQuery }>(
    '/analytics/summary',
    {
      preValidation: validateRequest({ query: analyticsSummaryQuerySchema }),
      schema: {
        tags: ['analytics'],
        summary: "Get the authenticated user's habit analytics summary",
        description:
          'Returns derived habit occurrence and progress totals for an inclusive local-calendar day, week, or month.',
        querystring: {
          type: 'object',
          required: ['period'],
          additionalProperties: false,
          properties: {
            period: {
              type: 'string',
              enum: ['day', 'week', 'month'],
            },
            date: {
              type: 'string',
              format: 'date',
              description:
                "Optional selected logical date in the user's timezone.",
            },
          },
        },
        response: {
          200: successResponseJsonSchema(analyticsSummaryJsonSchema),
          400: errorResponseJsonSchema,
          401: errorResponseJsonSchema,
          500: errorResponseJsonSchema,
        },
      },
    },
    analyticsController.summary,
  );

  app.get<{ Querystring: AnalyticsHistoryQuery }>(
    '/analytics/history',
    {
      preValidation: validateRequest({ query: analyticsHistoryQuerySchema }),
      schema: {
        tags: ['analytics'],
        summary: "Get the authenticated user's daily analytics history",
        description:
          'Returns a timezone-aware, gap-free daily history ending on the user-local current date. Aggregates are derived and never persisted.',
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            period: {
              type: 'string',
              enum: ['7d', '30d', '90d'],
              default: '30d',
            },
            granularity: {
              type: 'string',
              enum: ['day'],
              default: 'day',
            },
          },
        },
        response: {
          200: successResponseJsonSchema(analyticsHistoryJsonSchema),
          400: errorResponseJsonSchema,
          401: errorResponseJsonSchema,
          500: errorResponseJsonSchema,
        },
      },
    },
    analyticsController.history,
  );

  app.get<{ Querystring: AnalyticsInsightsQuery }>(
    '/analytics/insights',
    {
      preValidation: validateRequest({ query: analyticsInsightsQuerySchema }),
      schema: {
        tags: ['analytics'],
        summary:
          "Get the authenticated user's deterministic analytics insights",
        description:
          'Derives best and lowest active days, strongest weekday, consistency, and equal-window completion trend from the existing user-local daily history.',
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            period: {
              type: 'string',
              enum: ['7d', '30d', '90d'],
              default: '30d',
            },
          },
        },
        response: {
          200: successResponseJsonSchema(analyticsInsightsJsonSchema),
          400: errorResponseJsonSchema,
          401: errorResponseJsonSchema,
          500: errorResponseJsonSchema,
        },
      },
    },
    analyticsController.insights,
  );
}
