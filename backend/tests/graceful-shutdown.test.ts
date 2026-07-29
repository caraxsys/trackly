import { describe, expect, it, vi } from 'vitest';

import { createGracefulShutdown } from '../src/runtime/graceful-shutdown.js';

function setup(timeoutMs = 100) {
  const close = vi.fn(() => Promise.resolve());
  const forceExit = vi.fn();
  const setExitCode = vi.fn();
  const logger = { info: vi.fn(), error: vi.fn() };
  const shutdown = createGracefulShutdown({
    close,
    forceExit,
    logger,
    setExitCode,
    timeoutMs,
  });
  return { close, forceExit, logger, setExitCode, shutdown };
}

describe('graceful shutdown', () => {
  it('closes owned resources once across repeated shutdown requests', async () => {
    const { close, forceExit, setExitCode, shutdown } = setup();

    const first = shutdown('SIGTERM');
    const second = shutdown('SIGINT');
    expect(second).toBe(first);
    await first;

    expect(close).toHaveBeenCalledTimes(1);
    expect(setExitCode).toHaveBeenCalledWith(0);
    expect(forceExit).not.toHaveBeenCalled();
  });

  it('uses a non-zero exit code for fatal failures after clean close', async () => {
    const { forceExit, setExitCode, shutdown } = setup();

    await shutdown('unhandledRejection', 1, new Error('dependency failed'));

    expect(setExitCode).toHaveBeenCalledWith(1);
    expect(forceExit).not.toHaveBeenCalled();
  });

  it('forces termination when resource shutdown exceeds its deadline', async () => {
    vi.useFakeTimers();
    const { close, forceExit, logger, shutdown } = setup(50);
    close.mockReturnValue(new Promise<void>(() => undefined));

    const result = shutdown('SIGTERM');
    await vi.advanceTimersByTimeAsync(50);
    await result;

    expect(forceExit).toHaveBeenCalledWith(1);
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'server_shutdown_failed',
        reason: 'SIGTERM',
      }),
      'Server shutdown failed',
    );
    vi.useRealTimers();
  });
});
