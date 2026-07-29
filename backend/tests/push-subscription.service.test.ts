import { describe, expect, it, vi } from 'vitest';

import type { PushSubscriptionRepository } from '../src/modules/push-subscriptions/push-subscription.repository.js';
import { createPushSubscriptionService } from '../src/modules/push-subscriptions/push-subscription.service.js';

const row = {
  id: '00000000-0000-4000-8000-000000000001',
  endpoint: 'https://push.example.test/subscriptions/secret-identifier',
  userAgent: 'Test Browser',
  isEnabled: true,
  createdAt: new Date('2026-08-10T00:00:00.000Z'),
  updatedAt: new Date('2026-08-10T00:00:00.000Z'),
};

function repository(
  overrides: Partial<PushSubscriptionRepository> = {},
): PushSubscriptionRepository {
  const value = {
    createOrReactivate: vi.fn().mockResolvedValue({
      status: 'created',
      subscription: row,
    }),
    listActiveByUser: vi.fn().mockResolvedValue([row]),
    findActiveForDelivery: vi.fn().mockResolvedValue([]),
    disableOwned: vi.fn().mockResolvedValue(null),
    recordSuccess: vi.fn().mockResolvedValue(null),
    recordFailure: vi.fn().mockResolvedValue(null),
    invalidate: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
  return value;
}

describe('Push subscription service', () => {
  it('registers from authenticated ownership and returns safe metadata', async () => {
    const repo = repository();
    const service = createPushSubscriptionService(repo);
    const result = await service.subscribe('user-1', {
      endpoint: row.endpoint,
      keys: {
        p256dh: 'p256dh-key-material',
        auth: 'auth-key-material',
      },
      userAgent: 'Test Browser',
    });
    expect(result.subscription).not.toHaveProperty('endpoint');
    expect(result.subscription).not.toHaveProperty('p256dh');
    expect(result.subscription.endpointIdentifier).toContain('…');
  });

  it('returns only the authenticated user query result', async () => {
    const repo = repository();
    const service = createPushSubscriptionService(repo);
    await expect(service.list('user-1')).resolves.toMatchObject({
      items: [{ id: row.id, isEnabled: true }],
    });
  });

  it('makes unsubscribe idempotent and owner-scoped', async () => {
    const repo = repository();
    const service = createPushSubscriptionService(repo);
    await expect(
      service.unsubscribe('user-1', { endpoint: row.endpoint }),
    ).resolves.toEqual({ unsubscribed: true });
  });

  it('rejects an endpoint actively owned by another user safely', async () => {
    const service = createPushSubscriptionService(
      repository({
        createOrReactivate: vi
          .fn()
          .mockResolvedValue({ status: 'owned_by_another_user' }),
      }),
    );
    await expect(
      service.subscribe('user-1', {
        endpoint: row.endpoint,
        keys: {
          p256dh: 'p256dh-key-material',
          auth: 'auth-key-material',
        },
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'CONFLICT',
    });
  });
});
