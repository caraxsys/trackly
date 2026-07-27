import { buildApp } from './app.js';
import { environment } from './config/environment.js';

const app = await buildApp();

const shutdown = async (signal: NodeJS.Signals) => {
  app.log.info({ signal }, 'Gracefully shutting down');
  await app.close();
  process.exit(0);
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

try {
  await app.listen({
    host: environment.BACKEND_HOST,
    port: environment.BACKEND_PORT,
  });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
