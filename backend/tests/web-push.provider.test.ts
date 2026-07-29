import { describe, expect, it, vi } from 'vitest';

import type { NotificationProviderInput } from '../src/modules/notifications/notification-delivery.types.js';
import { configureWebPush } from '../src/modules/notifications/web-push.config.js';
import { WebPushNotificationProvider } from '../src/modules/notifications/web-push.provider.js';

const configuration = {
  subject: 'mailto:admin@example.com',
  publicKey: 'test-public-key',
  privateKey: 'test-private-key',
};
const input: NotificationProviderInput = {
  deliveryId: 'delivery-1',
  occurrenceKey: 'occurrence-1',
  userId: 'user-1',
  habitId: 'habit-1',
  reminderId: 'reminder-1',
  scheduledLocalDate: '2026-08-10',
  scheduledLocalTime: '08:00',
  timezone: 'Asia/Jakarta',
  title: 'Trackly reminder',
  body: 'A scheduled Habit is ready for your attention.',
};

function subscription(id: string) {
  return {
    id,
    endpoint: `https://push.example.test/${id}`,
    p256dh: `p256dh-${id}`,
    auth: `auth-${id}`,
  };
}

function setup(
  subscriptions = [subscription('subscription-1')],
  sends: Array<Promise<unknown>> = [Promise.resolve({ statusCode: 201 })],
) {
  const repository = {
    findActiveForDelivery: vi.fn().mockResolvedValue(subscriptions),
    recordSuccess: vi.fn().mockResolvedValue({ id: 'subscription-1' }),
    recordFailure: vi.fn().mockResolvedValue({ id: 'subscription-1' }),
    invalidate: vi.fn().mockResolvedValue({ id: 'subscription-1' }),
  };
  const client = {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(),
  };
  for (const result of sends)
    client.sendNotification.mockReturnValueOnce(result);
  const logger = { error: vi.fn(), info: vi.fn() };
  return {
    client,
    logger,
    repository,
    provider: new WebPushNotificationProvider(
      repository,
      configuration,
      logger,
      client,
    ),
  };
}

describe('Web Push configuration', () => {
  it('configures VAPID without exposing private key material', () => {
    const client = { setVapidDetails: vi.fn() };
    expect(configureWebPush(configuration, client)).toEqual(configuration);
    expect(client.setVapidDetails).toHaveBeenCalledWith(
      configuration.subject,
      configuration.publicKey,
      configuration.privateKey,
    );
  });

  it('rejects an invalid VAPID subject', () => {
    expect(() =>
      configureWebPush(
        { ...configuration, subject: 'http://insecure.example.com' },
        { setVapidDetails: vi.fn() },
      ),
    ).toThrow();
  });
});

describe('WebPushNotificationProvider', () => {
  it('returns skipped without sending when no active subscription exists', async () => {
    const context = setup([], []);
    await expect(context.provider.send(input)).resolves.toEqual({
      status: 'skipped',
      reasonCode: 'NO_ACTIVE_PUSH_SUBSCRIPTIONS',
    });
    expect(context.client.sendNotification).not.toHaveBeenCalled();
  });

  it('sends the minimal payload and records success', async () => {
    const context = setup();
    await expect(context.provider.send(input)).resolves.toEqual({
      status: 'delivered',
    });
    expect(context.repository.recordSuccess).toHaveBeenCalledWith(
      'subscription-1',
    );
    const sentPayload: unknown =
      context.client.sendNotification.mock.calls[0]?.[1];
    expect(JSON.parse(String(sentPayload))).toEqual({
      title: 'Trackly',
      body: input.body,
      data: {
        type: 'habit_reminder',
        habitId: input.habitId,
        reminderId: input.reminderId,
        scheduledLocalDate: input.scheduledLocalDate,
        scheduledLocalTime: input.scheduledLocalTime,
      },
    });
  });

  it('isolates failures and delivers when at least one subscription succeeds', async () => {
    const gone = Object.assign(new Error('endpoint details'), {
      statusCode: 410,
    });
    const context = setup(
      [subscription('subscription-1'), subscription('subscription-2')],
      [Promise.reject(gone), Promise.resolve({ statusCode: 201 })],
    );
    await expect(context.provider.send(input)).resolves.toEqual({
      status: 'delivered',
    });
    expect(context.repository.invalidate).toHaveBeenCalledWith(
      'subscription-1',
    );
    expect(context.repository.recordSuccess).toHaveBeenCalledWith(
      'subscription-2',
    );
    expect(context.client.sendNotification).toHaveBeenCalledTimes(2);
  });

  it.each([404, 410])(
    'invalidates a permanently expired subscription on %s',
    async (statusCode) => {
      const context = setup(undefined, [
        Promise.reject(Object.assign(new Error('gone'), { statusCode })),
      ]);
      await expect(context.provider.send(input)).resolves.toEqual({
        status: 'failed',
        errorCode: 'WEB_PUSH_ALL_ATTEMPTS_FAILED',
      });
      expect(context.repository.invalidate).toHaveBeenCalledWith(
        'subscription-1',
      );
      expect(context.repository.recordFailure).not.toHaveBeenCalled();
    },
  );

  it('records a transient failure without invalidating the subscription', async () => {
    const context = setup(undefined, [
      Promise.reject(
        Object.assign(new Error('sensitive upstream response'), {
          statusCode: 503,
        }),
      ),
    ]);
    await expect(context.provider.send(input)).resolves.toEqual({
      status: 'failed',
      errorCode: 'WEB_PUSH_ALL_ATTEMPTS_FAILED',
    });
    expect(context.repository.recordFailure).toHaveBeenCalledWith(
      'subscription-1',
    );
    expect(context.repository.invalidate).not.toHaveBeenCalled();
    const logs = JSON.stringify(context.logger.error.mock.calls);
    expect(logs).not.toContain('sensitive upstream response');
    expect(logs).not.toContain('push.example.test');
  });
});
