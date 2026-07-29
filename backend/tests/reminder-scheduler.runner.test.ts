import { describe, expect, it, vi } from 'vitest';

import { createReminderSchedulerRunner } from '../src/scheduler/reminder-scheduler.runner.js';
import type { EligibleReminder } from '../src/modules/reminders/reminder-scheduling.types.js';

const eligible: EligibleReminder = {
  reminderId: 'reminder-1',
  habitId: 'habit-1',
  userId: 'user-1',
  timezone: 'Asia/Jakarta',
  localDate: '2026-07-29',
  localTime: '10:15',
  timeOfDay: '10:15',
};

function logger() {
  return { info: vi.fn(), error: vi.fn() };
}

function coordinator() {
  return {
    process: vi.fn().mockResolvedValue({
      claimed: true,
      deliveryId: 'delivery-1',
      status: 'delivered',
    }),
  };
}

describe('Reminder scheduler runner', () => {
  it('normalizes and passes one explicit instant to the eligibility service', async () => {
    const listEligible = vi.fn().mockResolvedValue([eligible]);
    const log = logger();
    const times = [
      new Date('2026-07-29T03:15:00.100Z'),
      new Date('2026-07-29T03:15:00.125Z'),
    ];
    const runner = createReminderSchedulerRunner({
      clock: { now: () => times.shift() ?? new Date(0) },
      coordinator: coordinator(),
      logger: log,
      service: { listEligible },
    });

    await expect(
      runner.runTick(new Date('2026-07-29T03:15:37.400Z')),
    ).resolves.toEqual({
      status: 'completed',
      startedAt: '2026-07-29T03:15:00.100Z',
      completedAt: '2026-07-29T03:15:00.125Z',
      currentInstant: '2026-07-29T03:15:00.000Z',
      durationMs: 25,
      eligibleCount: 1,
      eligibleReminders: [eligible],
      deliveryResults: [
        {
          claimed: true,
          deliveryId: 'delivery-1',
          status: 'delivered',
        },
      ],
      claimedCount: 1,
      deliveredCount: 1,
      failedCount: 0,
      duplicateCount: 0,
      skippedCount: 0,
    });
    expect(listEligible).toHaveBeenCalledOnce();
    expect(listEligible).toHaveBeenCalledWith(
      new Date('2026-07-29T03:15:00.000Z'),
    );
    expect(JSON.stringify(log.info.mock.calls)).not.toContain('user-1');
  });

  it('reports a successful zero-result tick', async () => {
    const runner = createReminderSchedulerRunner({
      clock: { now: () => new Date('2026-07-29T03:15:00.000Z') },
      coordinator: coordinator(),
      logger: logger(),
      service: { listEligible: vi.fn().mockResolvedValue([]) },
    });
    await expect(
      runner.runTick(new Date('2026-07-29T03:15:00.000Z')),
    ).resolves.toMatchObject({
      status: 'completed',
      eligibleCount: 0,
      eligibleReminders: [],
      deliveryResults: [],
      claimedCount: 0,
      deliveredCount: 0,
      failedCount: 0,
      duplicateCount: 0,
      skippedCount: 0,
      durationMs: 0,
    });
  });

  it('sanitizes service failures into a failed aggregate result', async () => {
    const log = logger();
    const runner = createReminderSchedulerRunner({
      clock: { now: () => new Date('2026-07-29T03:15:00.000Z') },
      coordinator: coordinator(),
      logger: log,
      service: {
        listEligible: vi.fn().mockRejectedValue(new Error('private details')),
      },
    });
    await expect(
      runner.runTick(new Date('2026-07-29T03:15:00.000Z')),
    ).resolves.toMatchObject({
      status: 'failed',
      eligibleCount: 0,
      eligibleReminders: [],
    });
    expect(JSON.stringify(log.error.mock.calls)).toContain(
      'reminder_scheduler_tick_failed',
    );
    expect(JSON.stringify(log.error.mock.calls)).not.toContain(
      'private details',
    );
  });

  it('continues after one delivery failure and reports partial aggregates', async () => {
    const second = { ...eligible, reminderId: 'reminder-2' };
    const process = vi
      .fn()
      .mockRejectedValueOnce(new Error('claim failed'))
      .mockResolvedValueOnce({
        claimed: true,
        deliveryId: 'delivery-2',
        status: 'delivered',
      });
    const runner = createReminderSchedulerRunner({
      clock: { now: () => new Date('2026-07-29T03:15:00.000Z') },
      coordinator: { process },
      logger: logger(),
      service: { listEligible: vi.fn().mockResolvedValue([eligible, second]) },
    });
    await expect(
      runner.runTick(new Date('2026-07-29T03:15:00.000Z')),
    ).resolves.toMatchObject({
      status: 'completed_with_failures',
      eligibleCount: 2,
      claimedCount: 1,
      deliveredCount: 1,
      failedCount: 1,
      duplicateCount: 0,
      skippedCount: 0,
    });
    expect(process).toHaveBeenCalledTimes(2);
  });
});
