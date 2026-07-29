import { describe, expect, it, vi } from 'vitest';

import type { ReminderSchedulingRepository } from '../src/modules/reminders/reminder-scheduling.repository.js';
import { createReminderEligibilityService } from '../src/modules/reminders/reminder-scheduling.service.js';
import type { ReminderSchedulingCandidate } from '../src/modules/reminders/reminder-scheduling.types.js';

const instant = new Date('2026-07-29T01:00:00.000Z');
const candidate: ReminderSchedulingCandidate = {
  reminderId: 'reminder-1',
  userId: 'user-1',
  habitId: 'habit-1',
  timeOfDay: '08:00:00',
  reminderIsEnabled: true,
  reminderDeletedAt: null,
  habitIsActive: true,
  habitDeletedAt: null,
  habitFrequencyType: 'daily',
  habitStartDate: '2026-01-01',
  habitEndDate: null,
  storedTimezone: 'Asia/Jakarta',
  weekdays: [],
};

function setup(candidates: ReminderSchedulingCandidate[]) {
  const listStoredTimezones = vi
    .fn<ReminderSchedulingRepository['listStoredTimezones']>()
    .mockResolvedValue(['Asia/Jakarta', 'Europe/London']);
  const findCandidates = vi
    .fn<ReminderSchedulingRepository['findCandidates']>()
    .mockResolvedValue(candidates);
  const repository: ReminderSchedulingRepository = {
    listStoredTimezones,
    findCandidates,
  };
  return {
    repository,
    queries: { listStoredTimezones, findCandidates },
    service: createReminderEligibilityService(repository),
  };
}

describe('Reminder eligibility service', () => {
  it('uses two set-based repository calls and prefilters relevant local times', async () => {
    const { queries, service } = setup([candidate]);
    await expect(service.listEligible(instant)).resolves.toEqual([
      {
        reminderId: 'reminder-1',
        userId: 'user-1',
        habitId: 'habit-1',
        timezone: 'Asia/Jakarta',
        localDate: '2026-07-29',
        localTime: '08:00',
        timeOfDay: '08:00',
      },
    ]);
    expect(queries.listStoredTimezones).toHaveBeenCalledTimes(1);
    expect(queries.findCandidates).toHaveBeenCalledTimes(1);
    expect(queries.findCandidates).toHaveBeenCalledWith([
      '01:00',
      '02:00',
      '08:00',
    ]);
  });

  it('resolves multiple users independently and excludes mismatched candidates', async () => {
    const london = {
      ...candidate,
      reminderId: 'reminder-2',
      userId: 'user-2',
      habitId: 'habit-2',
      storedTimezone: 'Europe/London',
      timeOfDay: '02:00:00',
    };
    const mismatched = {
      ...candidate,
      reminderId: 'reminder-3',
      timeOfDay: '07:59:00',
    };
    const { service } = setup([london, mismatched, candidate]);
    const results = await service.listEligible(instant);
    expect(results.map(({ reminderId }) => reminderId)).toEqual([
      'reminder-2',
      'reminder-1',
    ]);
  });

  it('returns deterministic unique rows from the candidate contract', async () => {
    const later = {
      ...candidate,
      reminderId: 'reminder-2',
      habitId: 'habit-2',
    };
    const { service } = setup([later, candidate]);
    await expect(service.listEligible(instant)).resolves.toEqual([
      expect.objectContaining({ reminderId: 'reminder-1' }),
      expect.objectContaining({ reminderId: 'reminder-2' }),
    ]);
  });
});
