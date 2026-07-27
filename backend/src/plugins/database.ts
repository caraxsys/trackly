import fastifyPlugin from 'fastify-plugin';

import {
  closeDatabaseConnection,
  database,
  type Database,
  verifyDatabaseConnection,
} from '../db/index.js';

export type DatabaseConnectionCheck = () => Promise<void>;

interface DatabasePluginOptions {
  connectionCheck?: DatabaseConnectionCheck;
}

declare module 'fastify' {
  interface FastifyInstance {
    database: Database;
  }
}

export const databasePlugin = fastifyPlugin<DatabasePluginOptions>(
  async (app, options) => {
    const connectionCheck = options.connectionCheck ?? verifyDatabaseConnection;

    try {
      await connectionCheck();
    } catch (error) {
      app.log.error(error, 'Unable to connect to PostgreSQL');
      throw new Error('Database connection failed', { cause: error });
    }

    app.decorate('database', database);
    app.addHook('onClose', async () => {
      await closeDatabaseConnection();
    });
  },
  { name: 'database' },
);
