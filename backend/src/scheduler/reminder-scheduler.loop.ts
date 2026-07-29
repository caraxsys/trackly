import type { AppLogger } from '../config/logger.js';
import {
  normalizeTickInstant,
  type ReminderSchedulerRunner,
  type SchedulerClock,
} from './reminder-scheduler.runner.js';

export interface SchedulerTimer {
  clear(handle: ReturnType<typeof setTimeout>): void;
  schedule(
    callback: () => void,
    delayMs: number,
  ): ReturnType<typeof setTimeout>;
}

const systemTimer: SchedulerTimer = {
  clear: clearTimeout,
  schedule: (callback, delayMs) => setTimeout(callback, delayMs),
};

export function millisecondsUntilNextMinute(now: Date) {
  const nextMinute = Math.floor(now.getTime() / 60_000) * 60_000 + 60_000;
  return Math.max(0, nextMinute - now.getTime());
}

export function createReminderSchedulerLoop({
  clock,
  logger,
  runner,
  timer = systemTimer,
}: {
  clock: SchedulerClock;
  logger: Pick<AppLogger, 'info' | 'warn'>;
  runner: Pick<ReminderSchedulerRunner, 'runTick'>;
  timer?: SchedulerTimer;
}) {
  let timerHandle: ReturnType<typeof setTimeout> | undefined;
  let currentTick: Promise<unknown> | undefined;
  let stopPromise: Promise<void> | undefined;
  let stopped = true;

  function scheduleNext() {
    if (stopped) return;
    const delayMs = millisecondsUntilNextMinute(clock.now());
    timerHandle = timer.schedule(() => {
      scheduleNext();
      if (currentTick) {
        logger.warn(
          {
            event: 'reminder_scheduler_tick_skipped',
            reason: 'previous_tick_running',
            status: 'skipped',
          },
          'Reminder scheduler tick skipped',
        );
        return;
      }
      const tickInstant = normalizeTickInstant(clock.now());
      currentTick = runner.runTick(tickInstant).finally(() => {
        currentTick = undefined;
      });
    }, delayMs);
  }

  function stop() {
    if (stopPromise) return stopPromise;
    if (stopped) return Promise.resolve();
    stopped = true;
    stopPromise = (async () => {
      logger.info(
        { event: 'reminder_scheduler_stopping' },
        'Reminder scheduler stopping',
      );
      if (timerHandle) timer.clear(timerHandle);
      await currentTick;
      logger.info(
        { event: 'reminder_scheduler_stopped' },
        'Reminder scheduler stopped',
      );
    })();
    return stopPromise;
  }

  return {
    start(signal?: AbortSignal) {
      if (!stopped) return;
      stopped = false;
      stopPromise = undefined;
      logger.info(
        { event: 'reminder_scheduler_started' },
        'Reminder scheduler started',
      );
      signal?.addEventListener('abort', () => void stop(), { once: true });
      scheduleNext();
    },
    stop,
  };
}

export type ReminderSchedulerLoop = ReturnType<
  typeof createReminderSchedulerLoop
>;
