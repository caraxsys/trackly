import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

import { describe, expect, it, vi } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'public/sw.js'), 'utf8');

function serviceWorker() {
  const listeners = new Map<string, (event: never) => void>();
  const showNotification = vi.fn().mockResolvedValue(undefined);
  const openWindow = vi.fn().mockResolvedValue(undefined);
  const matchAll = vi.fn().mockResolvedValue([]);
  const scope = {
    URL,
    self: {
      location: { origin: 'https://trackly.example' },
      registration: { showNotification },
      clients: { matchAll, openWindow },
      addEventListener: (type: string, listener: (event: never) => void) =>
        listeners.set(type, listener),
    },
  };
  vm.runInNewContext(source, scope);
  return { listeners, matchAll, openWindow, showNotification };
}

describe('Trackly notification service worker', () => {
  it('shows a valid notification payload', async () => {
    const worker = serviceWorker();
    let operation: Promise<unknown> | undefined;
    worker.listeners.get('push')?.({
      data: {
        json: () => ({
          title: 'Trackly',
          body: 'Habit reminder',
          data: { type: 'habit_reminder', reminderId: 'reminder-1' },
        }),
      },
      waitUntil: (promise: Promise<unknown>) => {
        operation = promise;
      },
    } as never);
    await operation;
    expect(worker.showNotification).toHaveBeenCalledWith('Trackly', {
      body: 'Habit reminder',
      data: { type: 'habit_reminder', reminderId: 'reminder-1' },
      tag: 'habit-reminder:reminder-1',
    });
  });

  it('uses a safe fallback for malformed payloads', async () => {
    const worker = serviceWorker();
    let operation: Promise<unknown> | undefined;
    worker.listeners.get('push')?.({
      data: {
        json: () => {
          throw new Error('malformed');
        },
      },
      waitUntil: (promise: Promise<unknown>) => {
        operation = promise;
      },
    } as never);
    await operation;
    expect(worker.showNotification).toHaveBeenCalledWith(
      'Trackly',
      expect.objectContaining({
        body: 'You have a scheduled reminder.',
      }),
    );
  });

  it('closes, focuses, and safely routes an existing Trackly window', async () => {
    const worker = serviceWorker();
    const focus = vi.fn().mockResolvedValue(undefined);
    const navigate = vi.fn().mockResolvedValue(undefined);
    worker.matchAll.mockResolvedValueOnce([
      { url: 'https://trackly.example/habits', focus, navigate },
    ]);
    const close = vi.fn();
    let operation: Promise<unknown> | undefined;
    worker.listeners.get('notificationclick')?.({
      notification: {
        close,
        data: {
          type: 'habit_reminder',
          url: 'https://malicious.example/phishing',
        },
      },
      waitUntil: (promise: Promise<unknown>) => {
        operation = promise;
      },
    } as never);
    await operation;
    expect(close).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith('https://trackly.example/today');
    expect(focus).toHaveBeenCalledOnce();
    expect(JSON.stringify(navigate.mock.calls)).not.toContain(
      'malicious.example',
    );
  });

  it('opens the whitelisted Trackly route when no window exists', async () => {
    const worker = serviceWorker();
    let operation: Promise<unknown> | undefined;
    worker.listeners.get('notificationclick')?.({
      notification: { close: vi.fn(), data: { type: 'unknown' } },
      waitUntil: (promise: Promise<unknown>) => {
        operation = promise;
      },
    } as never);
    await operation;
    expect(worker.openWindow).toHaveBeenCalledWith(
      'https://trackly.example/today',
    );
  });
});
