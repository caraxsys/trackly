import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  detectWebPushSupport,
  disableWebPush,
  enableWebPush,
  getCurrentPushSubscription,
  LocalPushUnsubscribeError,
  reconcileWebPushState,
  registerNotificationServiceWorker,
  serializePushSubscription,
  urlBase64ToUint8Array,
} from '@/services/web-push-client';

const api = vi.hoisted(() => ({
  deletePushSubscription: vi.fn(),
  synchronizePushSubscription: vi.fn(),
}));
vi.mock('@/services/push-subscription-service', () => api);

const publicKey = 'AQIDBA';
const serialized = {
  endpoint: 'https://push.example.test/device-secret',
  keys: {
    p256dh: 'p256dh-key-material',
    auth: 'auth-key-material',
  },
};

function browserSubscription(unsubscribe = vi.fn().mockResolvedValue(true)) {
  return {
    endpoint: serialized.endpoint,
    toJSON: vi.fn(() => serialized),
    unsubscribe,
  } as unknown as PushSubscription;
}

function installBrowser({
  permission = 'granted',
  subscription = browserSubscription(),
  secure = true,
}: {
  permission?: NotificationPermission;
  subscription?: PushSubscription | null;
  secure?: boolean;
} = {}) {
  const getSubscription = vi.fn().mockResolvedValue(subscription);
  const subscribe = vi.fn().mockResolvedValue(browserSubscription());
  const registration = {
    pushManager: { getSubscription, subscribe },
  } as unknown as ServiceWorkerRegistration;
  const register = vi.fn().mockResolvedValue(registration);
  const getRegistration = vi.fn().mockResolvedValue(registration);
  const requestPermission = vi.fn().mockResolvedValue('granted');

  Object.defineProperty(window, 'isSecureContext', {
    configurable: true,
    value: secure,
  });
  Object.defineProperty(window, 'PushManager', {
    configurable: true,
    value: class PushManager {},
  });
  Object.defineProperty(window, 'Notification', {
    configurable: true,
    value: { permission, requestPermission },
  });
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { register, getRegistration },
  });
  return {
    getRegistration,
    getSubscription,
    register,
    registration,
    requestPermission,
    subscribe,
  };
}

describe('Web Push browser capability and utilities', () => {
  beforeEach(() => {
    api.deletePushSubscription.mockReset().mockResolvedValue(undefined);
    api.synchronizePushSubscription.mockReset().mockResolvedValue(undefined);
  });

  it('distinguishes supported, insecure, unsupported, and unconfigured states', () => {
    installBrowser();
    expect(detectWebPushSupport(publicKey)).toEqual({ status: 'supported' });

    installBrowser({ secure: false });
    expect(detectWebPushSupport(publicKey).status).toBe('insecure');

    installBrowser();
    Object.defineProperty(window, 'PushManager', {
      configurable: true,
      value: undefined,
    });
    expect(detectWebPushSupport(publicKey).status).toBe('unsupported');

    installBrowser();
    expect(detectWebPushSupport(undefined).status).toBe(
      'missing-configuration',
    );
  });

  it('converts URL-safe Base64 into the application server key', () => {
    installBrowser();
    expect([...urlBase64ToUint8Array(publicKey)]).toEqual([1, 2, 3, 4]);
  });

  it('serializes browser-provided endpoint and keys without modification', () => {
    installBrowser();
    expect(serializePushSubscription(browserSubscription())).toEqual({
      ...serialized,
      userAgent: navigator.userAgent,
    });
  });

  it('registers the root service worker and retrieves an existing subscription', async () => {
    const context = installBrowser();
    await expect(registerNotificationServiceWorker()).resolves.toBe(
      context.registration,
    );
    expect(context.register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
    await expect(getCurrentPushSubscription()).resolves.toMatchObject({
      endpoint: serialized.endpoint,
    });
    expect(context.getRegistration).toHaveBeenCalledWith('/');
  });
});

describe('Web Push enable and reconciliation', () => {
  beforeEach(() => {
    api.deletePushSubscription.mockReset().mockResolvedValue(undefined);
    api.synchronizePushSubscription.mockReset().mockResolvedValue(undefined);
  });

  it('requests default permission only during explicit enable', async () => {
    const context = installBrowser({
      permission: 'default',
      subscription: null,
    });
    expect(context.requestPermission).not.toHaveBeenCalled();
    await expect(enableWebPush(publicKey)).resolves.toEqual({
      status: 'enabled',
    });
    expect(context.requestPermission).toHaveBeenCalledOnce();
    expect(context.subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: new Uint8Array([1, 2, 3, 4]),
    });
    expect(api.synchronizePushSubscription).toHaveBeenCalledWith({
      ...serialized,
      userAgent: navigator.userAgent,
    });
  });

  it('reuses and synchronizes an existing subscription', async () => {
    const context = installBrowser();
    await enableWebPush(publicKey);
    expect(context.subscribe).not.toHaveBeenCalled();
    expect(api.synchronizePushSubscription).toHaveBeenCalledOnce();
  });

  it('does not subscribe or request again when permission is denied', async () => {
    const context = installBrowser({ permission: 'denied' });
    await expect(enableWebPush(publicKey)).resolves.toEqual({
      status: 'blocked',
    });
    expect(context.requestPermission).not.toHaveBeenCalled();
    expect(context.subscribe).not.toHaveBeenCalled();
  });

  it('does not report enabled when backend synchronization fails', async () => {
    installBrowser();
    api.synchronizePushSubscription.mockRejectedValueOnce(
      new Error('backend unavailable'),
    );
    await expect(enableWebPush(publicKey)).rejects.toThrow(
      'backend unavailable',
    );
  });

  it('reconciles an existing granted subscription without creating one', async () => {
    const context = installBrowser();
    await expect(reconcileWebPushState(publicKey)).resolves.toEqual({
      state: 'enabled',
    });
    expect(context.subscribe).not.toHaveBeenCalled();
    expect(api.synchronizePushSubscription).toHaveBeenCalledOnce();
  });
});

describe('Web Push disable flow', () => {
  beforeEach(() => {
    api.deletePushSubscription.mockReset().mockResolvedValue(undefined);
    api.synchronizePushSubscription.mockReset().mockResolvedValue(undefined);
  });

  it('deletes from the backend before unsubscribing locally', async () => {
    const order: string[] = [];
    api.deletePushSubscription.mockImplementationOnce(async () => {
      order.push('backend');
    });
    const unsubscribe = vi.fn().mockImplementationOnce(async () => {
      order.push('browser');
      return true;
    });
    installBrowser({ subscription: browserSubscription(unsubscribe) });
    await expect(disableWebPush()).resolves.toEqual({ status: 'disabled' });
    expect(api.deletePushSubscription).toHaveBeenCalledWith(
      serialized.endpoint,
    );
    expect(order).toEqual(['backend', 'browser']);
  });

  it('handles a missing local subscription idempotently', async () => {
    installBrowser({ subscription: null });
    await expect(disableWebPush()).resolves.toEqual({ status: 'disabled' });
    expect(api.deletePushSubscription).not.toHaveBeenCalled();
  });

  it('surfaces partial local cleanup without exposing the endpoint', async () => {
    const unsubscribe = vi.fn().mockResolvedValue(false);
    installBrowser({ subscription: browserSubscription(unsubscribe) });
    await expect(disableWebPush()).rejects.toBeInstanceOf(
      LocalPushUnsubscribeError,
    );
    expect(api.deletePushSubscription).toHaveBeenCalledOnce();
  });
});
