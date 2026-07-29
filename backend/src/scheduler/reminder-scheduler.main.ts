import { pathToFileURL } from 'node:url';

import {
  closeDatabaseConnection,
  database,
  verifyDatabaseConnection,
} from '../db/index.js';
import { createLogger } from '../config/logger.js';
import { createReminderSchedulingRepository } from '../modules/reminders/reminder-scheduling.repository.js';
import { createReminderEligibilityService } from '../modules/reminders/reminder-scheduling.service.js';
import { createNotificationDeliveryRepository } from '../modules/notifications/notification-delivery.repository.js';
import { createNotificationDeliveryCoordinator } from '../modules/notifications/notification-delivery.coordinator.js';
import { createNotificationDispatcher } from '../modules/notifications/notification-dispatcher.js';
import { NoopNotificationProvider } from '../modules/notifications/notification-provider.js';
import { WebPushNotificationProvider } from '../modules/notifications/web-push.provider.js';
import { createPushSubscriptionRepository } from '../modules/push-subscriptions/push-subscription.repository.js';
import { environment } from '../config/environment.js';
import { createReminderSchedulerLoop } from './reminder-scheduler.loop.js';
import {
  createReminderSchedulerRunner,
  normalizeTickInstant,
} from './reminder-scheduler.runner.js';

export type ReminderSchedulerMode = 'once' | 'recurring';

export async function runReminderSchedulerProcess(mode: ReminderSchedulerMode) {
  const logger = createLogger();
  const clock = { now: () => new Date() };
  const service = createReminderEligibilityService(
    createReminderSchedulingRepository(database),
  );
  const noopProvider = new NoopNotificationProvider(logger);
  const hasWebPushConfiguration = Boolean(
    environment.WEB_PUSH_VAPID_PUBLIC_KEY &&
    environment.WEB_PUSH_VAPID_PRIVATE_KEY &&
    environment.WEB_PUSH_SUBJECT,
  );
  const webPushProvider = hasWebPushConfiguration
    ? new WebPushNotificationProvider(
        createPushSubscriptionRepository(database),
        {
          publicKey: environment.WEB_PUSH_VAPID_PUBLIC_KEY!,
          privateKey: environment.WEB_PUSH_VAPID_PRIVATE_KEY!,
          subject: environment.WEB_PUSH_SUBJECT!,
        },
        logger,
      )
    : null;
  const providers = webPushProvider
    ? [noopProvider, webPushProvider]
    : [noopProvider];
  const coordinator = createNotificationDeliveryCoordinator({
    repository: createNotificationDeliveryRepository(database),
    dispatcher: createNotificationDispatcher(providers),
    provider: webPushProvider ? 'web_push' : 'noop',
    logger,
  });
  const runner = createReminderSchedulerRunner({
    clock,
    coordinator,
    logger,
    service,
  });
  const loop = createReminderSchedulerLoop({ clock, logger, runner });

  try {
    await verifyDatabaseConnection();
    if (mode === 'once') {
      logger.info(
        { event: 'reminder_scheduler_started', mode },
        'Reminder scheduler one-shot started',
      );
      const result = await runner.runTick(normalizeTickInstant(clock.now()));
      logger.info(
        {
          event: 'reminder_scheduler_stopped',
          mode,
          status: result.status,
          eligibleCount: result.eligibleCount,
          claimedCount: result.claimedCount,
          deliveredCount: result.deliveredCount,
          failedCount: result.failedCount,
          duplicateCount: result.duplicateCount,
          skippedCount: result.skippedCount,
          durationMs: result.durationMs,
        },
        'Reminder scheduler one-shot stopped',
      );
      return result.status === 'completed' ? 0 : 1;
    }

    const abortController = new AbortController();
    let resolveShutdown: (() => void) | undefined;
    const shutdownRequested = new Promise<void>((resolve) => {
      resolveShutdown = resolve;
    });
    const requestShutdown = (signal: NodeJS.Signals) => {
      logger.info(
        { event: 'reminder_scheduler_stopping', signal },
        'Reminder scheduler shutdown requested',
      );
      abortController.abort();
      resolveShutdown?.();
    };
    const onSigint = () => requestShutdown('SIGINT');
    const onSigterm = () => requestShutdown('SIGTERM');
    process.once('SIGINT', onSigint);
    process.once('SIGTERM', onSigterm);
    loop.start(abortController.signal);
    await shutdownRequested;
    await loop.stop();
    process.removeListener('SIGINT', onSigint);
    process.removeListener('SIGTERM', onSigterm);
    return 0;
  } catch (error) {
    logger.error(
      {
        event: 'reminder_scheduler_startup_failed',
        errorName: error instanceof Error ? error.name : 'UnknownError',
      },
      'Reminder scheduler startup failed',
    );
    return 1;
  } finally {
    await closeDatabaseConnection();
    logger.flush();
  }
}

const entrypoint = process.argv[1];
if (entrypoint && import.meta.url === pathToFileURL(entrypoint).href) {
  const mode: ReminderSchedulerMode = process.argv.includes('--once')
    ? 'once'
    : 'recurring';
  process.exitCode = await runReminderSchedulerProcess(mode);
}
