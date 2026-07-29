import type { AppLogger } from '../config/logger.js';
import type { ReminderEligibilityService } from '../modules/reminders/reminder-scheduling.service.js';
import type { EligibleReminder } from '../modules/reminders/reminder-scheduling.types.js';

export interface SchedulerClock {
  now(): Date;
}

export interface ReminderSchedulerTickResult {
  completedAt: string;
  currentInstant: string;
  durationMs: number;
  eligibleCount: number;
  eligibleReminders: EligibleReminder[];
  startedAt: string;
  status: 'completed' | 'failed';
}

export function normalizeTickInstant(instant: Date) {
  const normalized = new Date(instant);
  normalized.setUTCSeconds(0, 0);
  return normalized;
}

export function createReminderSchedulerRunner({
  clock,
  logger,
  service,
}: {
  clock: SchedulerClock;
  logger: Pick<AppLogger, 'error' | 'info'>;
  service: Pick<ReminderEligibilityService, 'listEligible'>;
}) {
  return {
    async runTick(currentInstant: Date): Promise<ReminderSchedulerTickResult> {
      const tickInstant = normalizeTickInstant(currentInstant);
      const startedAt = clock.now();
      logger.info(
        { event: 'reminder_scheduler_tick_started', tickInstant },
        'Reminder scheduler tick started',
      );
      try {
        const eligibleReminders = await service.listEligible(tickInstant);
        const completedAt = clock.now();
        const result: ReminderSchedulerTickResult = {
          status: 'completed',
          startedAt: startedAt.toISOString(),
          completedAt: completedAt.toISOString(),
          currentInstant: tickInstant.toISOString(),
          durationMs: Math.max(0, completedAt.getTime() - startedAt.getTime()),
          eligibleCount: eligibleReminders.length,
          eligibleReminders,
        };
        logger.info(
          {
            event: 'reminder_scheduler_tick_completed',
            tickInstant,
            eligibleCount: result.eligibleCount,
            durationMs: result.durationMs,
            status: result.status,
          },
          'Reminder scheduler tick completed',
        );
        return result;
      } catch (error) {
        const completedAt = clock.now();
        const result: ReminderSchedulerTickResult = {
          status: 'failed',
          startedAt: startedAt.toISOString(),
          completedAt: completedAt.toISOString(),
          currentInstant: tickInstant.toISOString(),
          durationMs: Math.max(0, completedAt.getTime() - startedAt.getTime()),
          eligibleCount: 0,
          eligibleReminders: [],
        };
        logger.error(
          {
            event: 'reminder_scheduler_tick_failed',
            tickInstant,
            durationMs: result.durationMs,
            status: result.status,
            errorName: error instanceof Error ? error.name : 'UnknownError',
          },
          'Reminder scheduler tick failed',
        );
        return result;
      }
    },
  };
}

export type ReminderSchedulerRunner = ReturnType<
  typeof createReminderSchedulerRunner
>;
