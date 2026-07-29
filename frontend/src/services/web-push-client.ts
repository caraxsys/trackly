import { publicEnvironment } from '@/lib/env';
import {
  deletePushSubscription,
  synchronizePushSubscription,
} from '@/services/push-subscription-service';
import type {
  DeviceNotificationState,
  PushSubscriptionPayload,
  WebPushSupport,
} from '@/types/push-subscription';

const SERVICE_WORKER_PATH = '/sw.js';

export class LocalPushUnsubscribeError extends Error {
  constructor() {
    super(
      'Trackly disabled notifications on the server, but this browser could not finish local cleanup.',
    );
    this.name = 'LocalPushUnsubscribeError';
  }
}

export function detectWebPushSupport(
  publicKey = publicEnvironment.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY,
): WebPushSupport {
  if (typeof window === 'undefined') {
    return {
      status: 'unsupported',
      message: 'Notifications are available only in a browser.',
    };
  }
  if (!window.isSecureContext) {
    return {
      status: 'insecure',
      message: 'Notifications require HTTPS or localhost.',
    };
  }
  if (
    !('serviceWorker' in navigator) ||
    typeof window.PushManager !== 'function' ||
    typeof window.Notification === 'undefined'
  ) {
    return {
      status: 'unsupported',
      message: 'This browser does not support Web Push notifications.',
    };
  }
  if (!publicKey) {
    return {
      status: 'missing-configuration',
      message: 'Notifications are not configured for this Trackly environment.',
    };
  }
  return { status: 'supported' };
}

export function urlBase64ToUint8Array(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replaceAll('-', '+').replaceAll('_', '/');
  const decoded = window.atob(base64);
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

export function serializePushSubscription(
  subscription: PushSubscription,
): PushSubscriptionPayload {
  const serialized = subscription.toJSON();
  if (
    !serialized.endpoint ||
    !serialized.keys?.p256dh ||
    !serialized.keys.auth
  ) {
    throw new Error('The browser returned an incomplete push subscription.');
  }
  return {
    endpoint: serialized.endpoint,
    keys: {
      p256dh: serialized.keys.p256dh,
      auth: serialized.keys.auth,
    },
    userAgent: navigator.userAgent,
  };
}

export async function registerNotificationServiceWorker() {
  return navigator.serviceWorker.register(SERVICE_WORKER_PATH, { scope: '/' });
}

export async function getCurrentPushSubscription() {
  const registration = await navigator.serviceWorker.getRegistration('/');
  return (await registration?.pushManager.getSubscription()) ?? null;
}

export async function enableWebPush(
  publicKey = publicEnvironment.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY,
) {
  const support = detectWebPushSupport(publicKey);
  if (support.status !== 'supported') throw new Error(support.message);
  if (!publicKey) throw new Error('Web Push configuration is unavailable.');
  if (Notification.permission === 'denied') {
    return { status: 'blocked' as const };
  }

  const registration = await registerNotificationServiceWorker();
  const permission =
    Notification.permission === 'default'
      ? await Notification.requestPermission()
      : Notification.permission;
  if (permission !== 'granted') return { status: 'blocked' as const };

  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));
  await synchronizePushSubscription(serializePushSubscription(subscription));
  return { status: 'enabled' as const };
}

export async function disableWebPush() {
  const subscription = await getCurrentPushSubscription();
  if (!subscription) return { status: 'disabled' as const };
  await deletePushSubscription(subscription.endpoint);
  if (!(await subscription.unsubscribe())) {
    throw new LocalPushUnsubscribeError();
  }
  return { status: 'disabled' as const };
}

export async function reconcileWebPushState(
  publicKey = publicEnvironment.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY,
): Promise<{ state: DeviceNotificationState; message?: string }> {
  const support = detectWebPushSupport(publicKey);
  if (support.status !== 'supported') {
    return { state: support.status, message: support.message };
  }
  if (Notification.permission === 'denied') return { state: 'blocked' };
  if (Notification.permission !== 'granted') return { state: 'disabled' };

  const subscription = await getCurrentPushSubscription();
  if (!subscription) return { state: 'disabled' };
  await synchronizePushSubscription(serializePushSubscription(subscription));
  return { state: 'enabled' };
}
