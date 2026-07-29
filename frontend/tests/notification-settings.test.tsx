import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NotificationSettings } from '@/components/preferences/notification-settings';

const client = vi.hoisted(() => ({
  disableWebPush: vi.fn(),
  enableWebPush: vi.fn(),
  reconcileWebPushState: vi.fn(),
  LocalPushUnsubscribeError: class LocalPushUnsubscribeError extends Error {},
}));
vi.mock('@/services/web-push-client', () => client);

describe('NotificationSettings', () => {
  beforeEach(() => {
    client.disableWebPush.mockReset().mockResolvedValue({ status: 'disabled' });
    client.enableWebPush.mockReset().mockResolvedValue({ status: 'enabled' });
    client.reconcileWebPushState
      .mockReset()
      .mockResolvedValue({ state: 'disabled' });
  });

  it('announces checking, then renders the disabled state', async () => {
    let resolveCheck: ((value: { state: 'disabled' }) => void) | undefined;
    client.reconcileWebPushState.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveCheck = resolve;
      }),
    );
    render(<NotificationSettings />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Checking notification status…',
    );
    resolveCheck?.({ state: 'disabled' });
    expect(
      await screen.findByText('Disabled on this device'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Enable notifications' }),
    ).toBeEnabled();
  });

  it('enables only after the explicit action and prevents duplicate clicks', async () => {
    const user = userEvent.setup();
    let resolveEnable: ((value: { status: 'enabled' }) => void) | undefined;
    client.enableWebPush.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveEnable = resolve;
      }),
    );
    render(<NotificationSettings />);
    const button = await screen.findByRole('button', {
      name: 'Enable notifications',
    });
    await user.dblClick(button);
    expect(client.enableWebPush).toHaveBeenCalledOnce();
    resolveEnable?.({ status: 'enabled' });
    expect(
      await screen.findByText('Enabled on this device'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Notifications enabled on this device.'),
    ).toHaveAttribute('role', 'status');
  });

  it('disables an enabled device and announces success', async () => {
    client.reconcileWebPushState.mockResolvedValueOnce({ state: 'enabled' });
    const user = userEvent.setup();
    render(<NotificationSettings />);
    await user.click(
      await screen.findByRole('button', { name: 'Disable notifications' }),
    );
    expect(client.disableWebPush).toHaveBeenCalledOnce();
    expect(
      await screen.findByText('Notifications disabled on this device.'),
    ).toHaveAttribute('role', 'status');
  });

  it.each([
    ['blocked', 'Blocked'],
    ['unsupported', 'Not supported'],
    ['missing-configuration', 'Configuration unavailable'],
  ] as const)('renders the %s state accessibly', async (state, label) => {
    client.reconcileWebPushState.mockResolvedValueOnce({ state });
    render(<NotificationSettings />);
    expect(await screen.findByText(label)).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Refresh status' }),
    ).toBeEnabled();
  });

  it('shows a safe error and does not falsely report enabled', async () => {
    const user = userEvent.setup();
    client.enableWebPush.mockRejectedValueOnce(new Error('raw endpoint error'));
    render(<NotificationSettings />);
    await user.click(
      await screen.findByRole('button', { name: 'Enable notifications' }),
    );
    expect(
      await screen.findByText(
        'Trackly could not enable notifications. Your device remains disabled.',
      ),
    ).toHaveAttribute('role', 'alert');
    expect(screen.queryByText('raw endpoint error')).not.toBeInTheDocument();
    expect(screen.getByText('Disabled on this device')).toBeVisible();
  });
});
