import type { FastifyInstance } from 'fastify';

import type { DatabaseConnectionCheck } from '../plugins/database.js';
import { systemRoutes } from './system.route.js';
import { v1Routes } from './v1/index.js';

interface RouteOptions {
  connectionCheck: DatabaseConnectionCheck;
}

export async function routes(app: FastifyInstance, options: RouteOptions) {
  await app.register(systemRoutes, options);
  await app.register(v1Routes, { prefix: '/api/v1' });
}
