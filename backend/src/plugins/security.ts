import helmet from '@fastify/helmet';
import fastifyPlugin from 'fastify-plugin';

import { environment } from '../config/environment.js';

export const securityPlugin = fastifyPlugin(
  async (app) => {
    await app.register(helmet, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          imgSrc: ["'self'", 'data:'],
          objectSrc: ["'none'"],
          scriptSrc: [
            "'self'",
            ...(environment.EXPOSE_API_DOCS ? ["'unsafe-inline'"] : []),
          ],
          styleSrc: [
            "'self'",
            ...(environment.EXPOSE_API_DOCS ? ["'unsafe-inline'"] : []),
          ],
          workerSrc: ["'self'"],
          ...(environment.NODE_ENV === 'production'
            ? { upgradeInsecureRequests: [] }
            : {}),
        },
      },
      crossOriginEmbedderPolicy: false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    });
  },
  { name: 'security' },
);
