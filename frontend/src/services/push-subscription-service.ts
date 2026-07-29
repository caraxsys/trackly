import { httpClient } from '@/services/http-client';
import type { PushSubscriptionPayload } from '@/types/push-subscription';

export async function synchronizePushSubscription(
  payload: PushSubscriptionPayload,
) {
  await httpClient.post('/api/v1/push-subscriptions', payload);
}

export async function deletePushSubscription(endpoint: string) {
  await httpClient.delete('/api/v1/push-subscriptions', {
    data: { endpoint },
  });
}
