import { AppError } from '../../errors/app-error.js';
import { ErrorCode } from '../../errors/error-codes.js';
import type { PushSubscriptionRepository } from './push-subscription.repository.js';
import type {
  PushSubscriptionCreateBody,
  PushSubscriptionDeleteBody,
} from './push-subscription.schema.js';
import type { PublicPushSubscription } from './push-subscription.types.js';

function endpointIdentifier(endpoint: string) {
  const url = new URL(endpoint);
  const suffix = url.pathname.slice(-12);
  return `${url.origin}/…${suffix}`;
}

function toPublic(value: {
  id: string;
  endpoint: string;
  userAgent: string | null;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}): PublicPushSubscription {
  return {
    id: value.id,
    endpointIdentifier: endpointIdentifier(value.endpoint),
    userAgent: value.userAgent,
    isEnabled: value.isEnabled,
    createdAt: value.createdAt.toISOString(),
    updatedAt: value.updatedAt.toISOString(),
  };
}

export function createPushSubscriptionService(
  repository: PushSubscriptionRepository,
) {
  return {
    async subscribe(userId: string, input: PushSubscriptionCreateBody) {
      const result = await repository.createOrReactivate(userId, {
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        ...(input.userAgent === undefined
          ? {}
          : { userAgent: input.userAgent }),
      });
      if (result.status === 'owned_by_another_user') {
        throw new AppError({
          statusCode: 409,
          code: ErrorCode.Conflict,
          message: 'The push subscription could not be registered.',
        });
      }
      return {
        created: result.status === 'created',
        subscription: toPublic(result.subscription),
      };
    },

    async list(userId: string) {
      const subscriptions = await repository.listActiveByUser(userId);
      return { items: subscriptions.map(toPublic) };
    },

    async unsubscribe(userId: string, input: PushSubscriptionDeleteBody) {
      await repository.disableOwned(userId, input.endpoint);
      return { unsubscribed: true as const };
    },
  };
}

export type PushSubscriptionService = ReturnType<
  typeof createPushSubscriptionService
>;
