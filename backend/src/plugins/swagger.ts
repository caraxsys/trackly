import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import fastifyPlugin from 'fastify-plugin';

import { environment } from '../config/environment.js';

export const swaggerPlugin = fastifyPlugin(
  async (app) => {
    if (!environment.EXPOSE_API_DOCS) return;

    await app.register(swagger, {
      openapi: {
        info: {
          title: 'Trackly API',
          description:
            'Versioned API foundation for the Trackly productivity platform.',
          version: '1.0.0',
        },
        servers: [
          {
            url: 'http://localhost:4000',
            description: 'Local development',
          },
        ],
        components: {
          securitySchemes: {
            cookieAuth: {
              type: 'apiKey',
              in: 'cookie',
              name: 'better-auth.session_token',
              description:
                'Better Auth session cookie. Obtain it through the authentication endpoints.',
            },
          },
        },
        tags: [
          { name: 'system', description: 'Health and readiness endpoints' },
          { name: 'diagnostics', description: 'Non-business diagnostics' },
          { name: 'auth', description: 'Future authentication endpoints' },
          { name: 'today', description: 'Authenticated Today aggregation' },
          { name: 'categories', description: 'Category query endpoints' },
          {
            name: 'habits',
            description: 'Authenticated habit query and command endpoints',
          },
          { name: 'tasks', description: 'Future task endpoints' },
          { name: 'goals', description: 'Future goal endpoints' },
          {
            name: 'preferences',
            description: 'Authenticated user preference endpoints',
          },
          {
            name: 'analytics',
            description: 'Authenticated analytics summary endpoints',
          },
          {
            name: 'push-subscriptions',
            description: 'Authenticated browser push subscription management',
          },
        ],
      },
    });

    await app.register(swaggerUi, {
      routePrefix: '/docs',
    });
  },
  { name: 'swagger' },
);
