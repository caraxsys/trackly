import helmet from '@fastify/helmet';
import fastifyPlugin from 'fastify-plugin';

export const securityPlugin = fastifyPlugin(
  async (app) => {
    await app.register(helmet, {
      contentSecurityPolicy: false,
    });
  },
  { name: 'security' },
);
