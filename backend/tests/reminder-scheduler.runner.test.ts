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
      logger: logger(),
      service: { listEligible: vi.fn().mockResolvedValue([]) },
    });
    await expect(
      runner.runTick(new Date('2026-07-29T03:15:00.000Z')),
    ).resolves.toMatchObject({
      status: 'completed',
      eligibleCount: 0,
      eligibleReminders: [],
      durationMs: 0,
    });
  });

  it('sanitizes service failures into a failed aggregate result', async () => {
    const log = logger();
    const runner = createReminderSchedulerRunner({
      clock: { now: () => new Date('2026-07-29T03:15:00.000Z') },
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
});
