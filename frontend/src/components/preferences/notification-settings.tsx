'use client';

import { Bell, BellOff, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { StatusBadge } from '@/components/common/status-badge';
import { ApiError } from '@/services/api-error';
import {
  disableWebPush,
  enableWebPush,
  LocalPushUnsubscribeError,
  reconcileWebPushState,
} from '@/services/web-push-client';
import type { DeviceNotificationState } from '@/types/push-subscription';

const labels: Record<DeviceNotificationState, string> = {
  checking: 'Checking…',
  unsupported: 'Not supported',
  insecure: 'Secure connection required',
  'missing-configuration': 'Configuration unavailable',
  blocked: 'Blocked',
  disabled: 'Disabled on this device',
  enabled: 'Enabled on this device',
};

function guidance(state: DeviceNotificationState) {
  if (state === 'blocked') {
    return 'Notification permission is blocked. Change the permission in your browser or site settings, then refresh this status.';
  }
  if (state === 'unsupported') {
    return 'Use a browser that supports service workers and Web Push.';
  }
  if (state === 'insecure') {
    return 'Open Trackly over HTTPS or localhost to use notifications.';
  }
  if (state === 'missing-configuration') {
    return 'Web Push is not configured in this Trackly environment.';
  }
  return 'This setting applies only to this browser and device.';
}

export function NotificationSettings() {
  const [state, setState] = useState<DeviceNotificationState>('checking');
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState('');
  const operation = useRef(false);
  const reconciled = useRef(false);

  async function reconcile(announce = false) {
    if (operation.current) return;
    operation.current = true;
    setBusy(true);
    setState('checking');
    setMessage('');
    try {
      const result = await reconcileWebPushState();
      setState(result.state);
      setMessage(
        announce ? 'Notification status refreshed.' : (result.message ?? ''),
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        window.location.assign('/login');
        return;
      }
      setState('disabled');
      setMessage(
        'Trackly could not synchronize this device. Please try again.',
      );
    } finally {
      operation.current = false;
      setBusy(false);
    }
  }

  useEffect(() => {
    if (reconciled.current) return;
    reconciled.current = true;
    void reconcile();
  }, []);

  async function enable() {
    if (operation.current) return;
    operation.current = true;
    setBusy(true);
    setMessage('');
    try {
      const result = await enableWebPush();
      setState(result.status);
      setMessage(
        result.status === 'enabled'
          ? 'Notifications enabled on this device.'
          : 'Notification permission is blocked. Update your browser or site settings to continue.',
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        window.location.assign('/login');
        return;
      }
      setMessage(
        'Trackly could not enable notifications. Your device remains disabled.',
      );
      setState('disabled');
    } finally {
      operation.current = false;
      setBusy(false);
    }
  }

  async function disable() {
    if (operation.current) return;
    operation.current = true;
    setBusy(true);
    setMessage('');
    try {
      const result = await disableWebPush();
      setState(result.status);
      setMessage('Notifications disabled on this device.');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        window.location.assign('/login');
        return;
      }
      setMessage(
        error instanceof LocalPushUnsubscribeError
          ? error.message
          : 'Trackly could not disable notifications. Please try again.',
      );
    } finally {
      operation.current = false;
      setBusy(false);
    }
  }

  const canEnable = state === 'disabled';
  const canDisable = state === 'enabled';

  return (
    <section
      aria-labelledby="notification-settings-heading"
      className="border-border bg-surface rounded-xl border p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Bell aria-hidden="true" className="text-primary size-5" />
            <h2
              className="text-lg font-semibold"
              id="notification-settings-heading"
            >
              Notifications
            </h2>
          </div>
          <p className="text-muted-foreground max-w-2xl text-sm leading-6">
            Receive scheduled Habit reminders from Trackly in this browser.
            Permission is requested only when you choose to enable them.
          </p>
        </div>
        <StatusBadge muted={state !== 'enabled'}>{labels[state]}</StatusBadge>
      </div>

      <div className="mt-5 space-y-4">
        <p className="text-muted-foreground text-sm">{guidance(state)}</p>
        <div className="flex flex-wrap gap-3">
          {canEnable ? (
            <button
              className="bg-primary text-primary-foreground focus-visible:ring-ring rounded-lg px-4 py-2 text-sm font-medium outline-none focus-visible:ring-2 disabled:opacity-60"
              disabled={busy}
              onClick={() => void enable()}
              type="button"
            >
              <Bell aria-hidden="true" className="mr-2 inline size-4" />
              Enable notifications
            </button>
          ) : null}
          {canDisable ? (
            <button
              className="border-border bg-background hover:bg-muted focus-visible:ring-ring rounded-lg border px-4 py-2 text-sm font-medium outline-none focus-visible:ring-2 disabled:opacity-60"
              disabled={busy}
              onClick={() => void disable()}
              type="button"
            >
              <BellOff aria-hidden="true" className="mr-2 inline size-4" />
              Disable notifications
            </button>
          ) : null}
          {!busy ? (
            <button
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-lg px-3 py-2 text-sm font-medium outline-none focus-visible:ring-2"
              onClick={() => void reconcile(true)}
              type="button"
            >
              <RefreshCw aria-hidden="true" className="mr-2 inline size-4" />
              Refresh status
            </button>
          ) : null}
        </div>
        <div aria-live="polite" aria-atomic="true">
          {busy ? (
            <p className="text-muted-foreground text-sm" role="status">
              Checking notification status…
            </p>
          ) : null}
          {message ? (
            <p
              className={
                message.includes('could not')
                  ? 'text-destructive text-sm'
                  : 'text-sm'
              }
              role={message.includes('could not') ? 'alert' : 'status'}
            >
              {message}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
