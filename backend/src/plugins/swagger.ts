import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import fastifyPlugin from 'fastify-plugin';

export const swaggerPlugin = fastifyPlugin(
  async (app) => {
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
        tags: [
          { name: 'system', description: 'Health and readiness endpoints' },
          { name: 'diagnostics', description: 'Non-business diagnostics' },
          { name: 'auth', description: 'Future authentication endpoints' },
          { name: 'today', description: 'Authenticated Today aggregation' },
          { name: 'categories', description: 'Category query endpoints' },
          { name: 'habits', description: 'Future habit endpoints' },
          { name: 'tasks', description: 'Future task endpoints' },
          { name: 'goals', description: 'Future goal endpoints' },
          { name: 'analytics', description: 'Future analytics endpoints' },
        ],
      },
    });

    await app.register(swaggerUi, {
      routePrefix: '/docs',
    });
  },
  { name: 'swagger' },
);
