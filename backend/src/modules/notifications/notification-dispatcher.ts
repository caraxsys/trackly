import type {
  NotificationProvider,
  NotificationProviderInput,
  NotificationProviderName,
} from './notification-delivery.types.js';

export class UnsupportedNotificationProviderError extends Error {
  constructor(provider: string) {
    super(`Unsupported notification provider: ${provider}`);
    this.name = 'UnsupportedNotificationProviderError';
  }
}

export function createNotificationDispatcher(
  providers: NotificationProvider[],
) {
  const registry = new Map(
    providers.map((provider) => [provider.name, provider]),
  );
  return {
    dispatch(
      provider: NotificationProviderName,
      input: NotificationProviderInput,
    ) {
      const implementation = registry.get(provider);
      if (!implementation) {
        throw new UnsupportedNotificationProviderError(provider);
      }
      return implementation.send(input);
    },
  };
}

export type NotificationDispatcher = ReturnType<
  typeof createNotificationDispatcher
>;
