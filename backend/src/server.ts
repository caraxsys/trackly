import { buildApp } from './app.js';
import { environment } from './config/environment.js';
import { createGracefulShutdown } from './runtime/graceful-shutdown.js';

const app = await buildApp();
const shutdown = createGracefulShutdown({
  close: () => app.close(),
  logger: app.log,
  timeoutMs: 10_000,
  setExitCode: (code) => {
    process.exitCode = code;
  },
  forceExit: (code) => process.exit(code),
});

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('uncaughtException', (error) => {
  app.log.fatal(
    { event: 'server_fatal_error', errorName: error.name },
    'Uncaught exception',
  );
  void shutdown('uncaughtException', 1, error);
});
process.once('unhandledRejection', (error) => {
  app.log.fatal(
    {
      event: 'server_fatal_error',
      errorName: error instanceof Error ? error.name : 'UnknownError',
    },
    'Unhandled rejection',
  );
  void shutdown('unhandledRejection', 1, error);
});

try {
  await app.listen({
    host: environment.BACKEND_HOST,
    port: environment.BACKEND_PORT,
  });
} catch (error) {
  app.log.error(
    {
      event: 'server_startup_failed',
      errorName: error instanceof Error ? error.name : 'UnknownError',
    },
    'Server startup failed',
  );
  await shutdown('startupError', 1, error);
}
