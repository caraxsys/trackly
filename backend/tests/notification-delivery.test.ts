import { describe, expect, it, vi } from 'vitest';

import { createNotificationDeliveryCoordinator } from '../src/modules/notifications/notification-delivery.coordinator.js';
import type { NotificationDeliveryRepository } from '../src/modules/notifications/notification-delivery.repository.js';
import type {
  NotificationDeliveryRecord,
  NotificationDeliveryStatus,
  NotificationProvider,
  NotificationProviderInput,
} from '../src/modules/notifications/notification-delivery.types.js';
import {
  createNotificationDispatcher,
  UnsupportedNotificationProviderError,
} from '../src/modules/notifications/notification-dispatcher.js';
import {
  createOccurrenceKey,
  mapEligibleReminderToOccurrence,
} from '../src/modules/notifications/notification-occurrence.js';
import { NoopNotificationProvider } from '../src/modules/notifications/notification-provider.js';
import type { EligibleReminder } from '../src/modules/reminders/reminder-scheduling.types.js';

const eligible: EligibleReminder = {
  reminderId: 'reminder-1',
  habitId: 'habit-1',
  userId: 'user-1',
  timezone: 'Asia/Jakarta',
  localDate: '2026-08-10',
  localTime: '08:00',
  timeOfDay: '08:00',
};
const delivery: NotificationDeliveryRecord = {
  id: 'delivery-1',
  ...mapEligibleReminderToOccurrence(eligible),
  provider: 'noop',
  status: 'pending',
  attemptCount: 0,
  createdAt: new Date('2026-08-10T01:00:00.000Z'),
  updatedAt: new Date('2026-08-10T01:00:00.000Z'),
};

function repository(
  overrides: Partial<NotificationDeliveryRepository> = {},
): NotificationDeliveryRepository {
  return {
    claimOccurrence: vi.fn().mockResolvedValue({
      claimed: true,
      delivery,
    }),
    markProcessing: vi.fn().mockResolvedValue({
      ...delivery,
      status: 'processing',
      attemptCount: 1,
    }),
    markDelivered: vi
      .fn()
      .mockResolvedValue({ ...delivery, status: 'delivered', attemptCount: 1 }),
    markFailed: vi
      .fn()
      .mockResolvedValue({ ...delivery, status: 'failed', attemptCount: 1 }),
    markSkipped: vi.fn().mockResolvedValue({ ...delivery, status: 'skipped' }),
    ...overrides,
  };
}

function logger() {
  return { debug: vi.fn(), error: vi.fn(), info: vi.fn() };
}

function provider(
  result: Awaited<ReturnType<NotificationProvider['send']>> = {
    status: 'delivered',
  },
) {
  return {
    name: 'noop' as const,
    send: vi.fn().mockResolvedValue(result),
  };
}

describe('Notification occurrence mapping', () => {
  it('is deterministic and canonicalizes local time', () => {
    const first = mapEligibleReminderToOccurrence({
      ...eligible,
      localTime: '08:00:00',
    });
    const second = mapEligibleReminderToOccurrence(eligible);
    expect(first).toEqual(second);
    expect(first.scheduledLocalTime).toBe('08:00');
    expect(first.occurrenceKey).toBe(
      JSON.stringify([1, 'reminder-1', 'Asia/Jakarta', '2026-08-10', '08:00']),
    );
  });

  it('changes identity for reminder, timezone, date, or time changes', () => {
    const base = mapEligibleReminderToOccurrence(eligible);
    for (const changes of [
      { reminderId: 'reminder-2' },
      { timezone: 'UTC' },
      { localDate: '2026-08-11' },
      { localTime: '08:01' },
    ]) {
      expect(
        mapEligibleReminderToOccurrence({
          ...eligible,
          ...changes,
        }).occurrenceKey,
      ).not.toBe(base.occurrenceKey);
    }
    expect(
      createOccurrenceKey({
        reminderId: 'reminder-1',
        timezone: 'Asia/Jakarta',
        scheduledLocalDate: '2026-08-10',
        scheduledLocalTime: '08:00:00',
      }),
    ).toBe(base.occurrenceKey);
  });
});

describe('Notification providers and dispatcher', () => {
  it('uses an explicit deterministic Noop provider without mutating input', async () => {
    const log = logger();
    const noop = new NoopNotificationProvider(log);
    const input: NotificationProviderInput = {
      ...mapEligibleReminderToOccurrence(eligible),
      deliveryId: 'delivery-1',
      habitId: eligible.habitId,
      title: 'Title',
      body: 'Body',
    };
    const snapshot = structuredClone(input);
    expect(noop.name).toBe('noop');
    await expect(noop.send(input)).resolves.toEqual({ status: 'delivered' });
    expect(input).toEqual(snapshot);
    expect(JSON.stringify(log.debug.mock.calls)).not.toContain('Title');
    expect(JSON.stringify(log.debug.mock.calls)).not.toContain('Body');
  });

  it('resolves registered providers and rejects unsupported names', async () => {
    const noop = provider();
    const dispatcher = createNotificationDispatcher([noop]);
    await dispatcher.dispatch('noop', {
      ...mapEligibleReminderToOccurrence(eligible),
      deliveryId: 'delivery-1',
      habitId: eligible.habitId,
      title: 'Title',
      body: 'Body',
    });
    expect(noop.send).toHaveBeenCalledOnce();
    expect(() =>
      dispatcher.dispatch('web_push', {
        ...mapEligibleReminderToOccurrence(eligible),
        deliveryId: 'delivery-1',
        habitId: eligible.habitId,
        title: 'Title',
        body: 'Body',
      }),
    ).toThrow(UnsupportedNotificationProviderError);
  });
});

describe('Notification delivery coordinator', () => {
  function setup(repositoryValue = repository(), providerValue = provider()) {
    return {
      provider: providerValue,
      repository: repositoryValue,
      coordinator: createNotificationDeliveryCoordinator({
        dispatcher: createNotificationDispatcher([providerValue]),
        logger: logger(),
        provider: 'noop',
        repository: repositoryValue,
      }),
    };
  }

  it('claims, processes, dispatches, and marks a new occurrence delivered', async () => {
    const context = setup();
    await expect(context.coordinator.process(eligible)).resolves.toEqual({
      claimed: true,
      deliveryId: delivery.id,
      status: 'delivered',
    });
    expect(context.provider.send).toHaveBeenCalledOnce();
    expect(context.repository.markProcessing).toHaveBeenCalledWith(delivery.id);
    expect(context.repository.markDelivered).toHaveBeenCalledWith(delivery.id);
  });

  for (const status of [
    'pending',
    'processing',
    'delivered',
    'skipped',
    'failed',
  ] as NotificationDeliveryStatus[]) {
    it(`does not dispatch an existing ${status} occurrence`, async () => {
      const context = setup(
        repository({
          claimOccurrence: vi.fn().mockResolvedValue({
            claimed: false,
            delivery: { ...delivery, status },
          }),
        }),
      );
      await expect(context.coordinator.process(eligible)).resolves.toEqual({
        claimed: false,
        deliveryId: delivery.id,
        existingStatus: status,
        status: 'duplicate',
      });
      expect(context.provider.send).not.toHaveBeenCalled();
    });
  }

  it('marks an expected provider failure and does not throw', async () => {
    const context = setup(
      repository(),
      provider({
        status: 'failed',
        errorCode: 'NOOP_TEST_FAILURE',
      }),
    );
    await expect(context.coordinator.process(eligible)).resolves.toEqual({
      claimed: true,
      deliveryId: delivery.id,
      status: 'failed',
    });
    expect(context.repository.markFailed).toHaveBeenCalledWith(delivery.id);
  });

  it('maps a provider skip to the durable skipped state', async () => {
    const context = setup(
      repository(),
      provider({
        status: 'skipped',
        reasonCode: 'NO_ACTIVE_PUSH_SUBSCRIPTIONS',
      }),
    );
    await expect(context.coordinator.process(eligible)).resolves.toEqual({
      claimed: true,
      deliveryId: delivery.id,
      status: 'skipped',
    });
    expect(context.repository.markSkipped).toHaveBeenCalledWith(delivery.id);
    expect(context.repository.markDelivered).not.toHaveBeenCalled();
  });

  it('never invokes a provider when the durable claim fails', async () => {
    const context = setup(
      repository({
        claimOccurrence: vi.fn().mockRejectedValue(new Error('database down')),
      }),
    );
    await expect(context.coordinator.process(eligible)).rejects.toThrow(
      'database down',
    );
    expect(context.provider.send).not.toHaveBeenCalled();
  });
});
