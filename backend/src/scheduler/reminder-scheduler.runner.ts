import type { AppLogger } from '../config/logger.js';
import type { ReminderEligibilityService } from '../modules/reminders/reminder-scheduling.service.js';
import type { EligibleReminder } from '../modules/reminders/reminder-scheduling.types.js';
import type { NotificationDeliveryCoordinator } from '../modules/notifications/notification-delivery.coordinator.js';
import type { NotificationDeliveryResult } from '../modules/notifications/notification-delivery.types.js';

export interface SchedulerClock {
  now(): Date;
}

export interface ReminderSchedulerTickResult {
  completedAt: string;
  currentInstant: string;
  durationMs: number;
  claimedCount: number;
  deliveredCount: number;
  deliveryResults: NotificationDeliveryResult[];
  duplicateCount: number;
  eligibleCount: number;
  eligibleReminders: EligibleReminder[];
  failedCount: number;
  skippedCount: number;
  startedAt: string;
  status: 'completed' | 'completed_with_failures' | 'failed';
}

export function normalizeTickInstant(instant: Date) {
  const normalized = new Date(instant);
  normalized.setUTCSeconds(0, 0);
  return normalized;
}

export function createReminderSchedulerRunner({
  clock,
  coordinator,
  logger,
  service,
}: {
  clock: SchedulerClock;
  coordinator: Pick<NotificationDeliveryCoordinator, 'process'>;
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
        const deliveryResults: NotificationDeliveryResult[] = [];
        let orchestrationFailures = 0;
        for (const eligible of eligibleReminders) {
          try {
            deliveryResults.push(await coordinator.process(eligible));
          } catch (error) {
            orchestrationFailures += 1;
            logger.error(
              {
                event: 'notification_delivery_failed',
                errorName: error instanceof Error ? error.name : 'UnknownError',
              },
              'Notification delivery orchestration failed',
            );
          }
        }
        const completedAt = clock.now();
        const claimedCount = deliveryResults.filter(
          ({ claimed }) => claimed,
        ).length;
        const deliveredCount = deliveryResults.filter(
          ({ status }) => status === 'delivered',
        ).length;
        const failedCount =
          orchestrationFailures +
          deliveryResults.filter(({ status }) => status === 'failed').length;
        const duplicateCount = deliveryResults.filter(
          ({ status }) => status === 'duplicate',
        ).length;
        const skippedCount = deliveryResults.filter(
          ({ status }) => status === 'skipped',
        ).length;
        const result: ReminderSchedulerTickResult = {
          status: failedCount > 0 ? 'completed_with_failures' : 'completed',
          startedAt: startedAt.toISOString(),
          completedAt: completedAt.toISOString(),
          currentInstant: tickInstant.toISOString(),
          durationMs: Math.max(0, completedAt.getTime() - startedAt.getTime()),
          eligibleCount: eligibleReminders.length,
          eligibleReminders,
          deliveryResults,
          claimedCount,
          deliveredCount,
          failedCount,
          duplicateCount,
          skippedCount,
        };
        logger.info(
          {
            event: 'reminder_scheduler_delivery_summary',
            tickInstant,
            eligibleCount: result.eligibleCount,
            claimedCount,
            deliveredCount,
            failedCount,
            duplicateCount,
            skippedCount,
            status: result.status,
          },
          'Reminder scheduler delivery summary',
        );
        logger.info(
          {
            event: 'reminder_scheduler_tick_completed',
            tickInstant,
            eligibleCount: result.eligibleCount,
            claimedCount,
            deliveredCount,
            failedCount,
            duplicateCount,
            skippedCount,
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
          deliveryResults: [],
          claimedCount: 0,
          deliveredCount: 0,
          failedCount: 0,
          duplicateCount: 0,
          skippedCount: 0,
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
