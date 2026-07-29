import type { Logger } from 'pino';

export type ShutdownReason =
  NodeJS.Signals | 'uncaughtException' | 'unhandledRejection' | 'startupError';

interface ShutdownDependencies {
  close: () => Promise<void>;
  forceExit: (code: number) => void;
  logger: Pick<Logger, 'error' | 'info'>;
  setExitCode: (code: number) => void;
  timeoutMs: number;
}

export function createGracefulShutdown(dependencies: ShutdownDependencies) {
  let shutdownPromise: Promise<void> | undefined;

  return (reason: ShutdownReason, exitCode = 0, error?: unknown) => {
    if (shutdownPromise) return shutdownPromise;

    shutdownPromise = (async () => {
      dependencies.logger.info(
        { event: 'server_shutdown_started', reason },
        'Server shutdown started',
      );

      let timer: NodeJS.Timeout | undefined;
      const deadline = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error('Graceful shutdown deadline exceeded'));
        }, dependencies.timeoutMs);
        timer.unref();
      });

      try {
        await Promise.race([dependencies.close(), deadline]);
        dependencies.setExitCode(exitCode);
        dependencies.logger.info(
          { event: 'server_shutdown_completed', reason, exitCode },
          'Server shutdown completed',
        );
      } catch (shutdownError) {
        dependencies.logger.error(
          {
            event: 'server_shutdown_failed',
            reason,
            errorName:
              shutdownError instanceof Error
                ? shutdownError.name
                : 'UnknownError',
            ...(error instanceof Error ? { causeName: error.name } : {}),
          },
          'Server shutdown failed',
        );
        dependencies.forceExit(1);
      } finally {
        if (timer) clearTimeout(timer);
      }
    })();

    return shutdownPromise;
  };
}
