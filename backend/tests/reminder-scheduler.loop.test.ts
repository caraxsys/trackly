import { describe, expect, it, vi } from 'vitest';

import {
  createReminderSchedulerLoop,
  millisecondsUntilNextMinute,
  type SchedulerTimer,
} from '../src/scheduler/reminder-scheduler.loop.js';

interface Scheduled {
  callback: () => void;
  delayMs: number;
  handle: ReturnType<typeof setTimeout>;
}

function setup() {
  let current = new Date('2026-07-29T10:15:37.400Z');
  const scheduled: Scheduled[] = [];
  const cleared: ReturnType<typeof setTimeout>[] = [];
  const timer: SchedulerTimer = {
    schedule: (callback, delayMs) => {
      const handle = Symbol('timer') as unknown as ReturnType<
        typeof setTimeout
      >;
      scheduled.push({ callback, delayMs, handle });
      return handle;
    },
    clear: (handle) => cleared.push(handle),
  };
  const logger = { info: vi.fn(), warn: vi.fn() };
  const runTick = vi.fn().mockResolvedValue({ status: 'completed' });
  const loop = createReminderSchedulerLoop({
    clock: { now: () => current },
    logger,
    runner: { runTick },
    timer,
  });
  return {
    cleared,
    logger,
    loop,
    runTick,
    scheduled,
    setTime: (value: string) => {
      current = new Date(value);
    },
  };
}

describe('Reminder scheduler loop', () => {
  it('aligns the first and subsequent timers to recalculated minute boundaries', async () => {
    const context = setup();
    context.loop.start();
    expect(context.scheduled[0]?.delayMs).toBe(22_600);

    context.setTime('2026-07-29T10:16:00.000Z');
    context.scheduled.shift()?.callback();
    expect(context.runTick).toHaveBeenCalledWith(
      new Date('2026-07-29T10:16:00.000Z'),
    );
    expect(context.scheduled[0]?.delayMs).toBe(60_000);
    await Promise.resolve();
    await context.loop.stop();
  });

  it('skips overlapping ticks but keeps the future timer scheduled', async () => {
    const context = setup();
    let resolveTick: (() => void) | undefined;
    context.runTick.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveTick = () => resolve({ status: 'completed' });
        }),
    );
    context.loop.start();
    context.setTime('2026-07-29T10:16:00.000Z');
    context.scheduled.shift()?.callback();
    context.setTime('2026-07-29T10:17:00.000Z');
    context.scheduled.shift()?.callback();
    expect(context.runTick).toHaveBeenCalledTimes(1);
    expect(context.logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'reminder_scheduler_tick_skipped',
        reason: 'previous_tick_running',
      }),
      expect.any(String),
    );
    expect(context.scheduled).toHaveLength(1);
    resolveTick?.();
    await Promise.resolve();
    await context.loop.stop();
  });

  it('continues scheduling after a failed aggregate tick', async () => {
    const context = setup();
    context.runTick.mockResolvedValue({ status: 'failed' });
    context.loop.start();
    context.setTime('2026-07-29T10:16:00.000Z');
    context.scheduled.shift()?.callback();
    await Promise.resolve();
    context.setTime('2026-07-29T10:17:00.000Z');
    context.scheduled.shift()?.callback();
    expect(context.runTick).toHaveBeenCalledTimes(2);
    await context.loop.stop();
  });

  it('cancels future scheduling and waits for the active tick on shutdown', async () => {
    const context = setup();
    let resolveTick: (() => void) | undefined;
    context.runTick.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveTick = () => resolve({ status: 'completed' });
        }),
    );
    context.loop.start();
    context.setTime('2026-07-29T10:16:00.000Z');
    context.scheduled.shift()?.callback();
    let stopped = false;
    const stopping = context.loop.stop().then(() => {
      stopped = true;
    });
    await Promise.resolve();
    expect(stopped).toBe(false);
    expect(context.cleared).toHaveLength(1);
    resolveTick?.();
    await stopping;
    expect(stopped).toBe(true);
    expect(JSON.stringify(context.logger.info.mock.calls)).toContain(
      'reminder_scheduler_stopped',
    );
  });

  it('supports AbortSignal cancellation without real timers', async () => {
    const context = setup();
    const controller = new AbortController();
    context.loop.start(controller.signal);
    controller.abort();
    await Promise.resolve();
    expect(context.cleared).toHaveLength(1);
  });

  it('calculates exact minute-boundary delays', () => {
    expect(
      millisecondsUntilNextMinute(new Date('2026-07-29T10:15:37.400Z')),
    ).toBe(22_600);
  });
});
