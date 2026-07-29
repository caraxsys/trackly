import { describe, expect, it, vi } from 'vitest';

import type { ReminderRepository } from '../src/modules/reminders/reminder.repository.js';
import {
  reminderCreateBodySchema,
  reminderUpdateBodySchema,
} from '../src/modules/reminders/reminder.schema.js';
import { createReminderService } from '../src/modules/reminders/reminder.service.js';

const stored = {
  id: '00000000-0000-4000-8000-000000000001',
  habitId: '00000000-0000-4000-8000-000000000002',
  timeOfDay: '08:30:00',
  isEnabled: true,
  createdAt: new Date('2026-07-29T00:00:00.000Z'),
  updatedAt: new Date('2026-07-29T00:00:00.000Z'),
};

function setup(overrides: Partial<ReminderRepository> = {}) {
  const create = vi
    .fn<ReminderRepository['create']>()
    .mockResolvedValue(stored);
  const update = vi
    .fn<ReminderRepository['update']>()
    .mockResolvedValue(stored);
  const softDelete = vi
    .fn<ReminderRepository['softDelete']>()
    .mockResolvedValue({ id: stored.id });
  const repository: ReminderRepository = {
    habitExists: vi.fn().mockResolvedValue(true),
    list: vi.fn().mockResolvedValue([stored]),
    find: vi.fn().mockResolvedValue(stored),
    duplicateExists: vi.fn().mockResolvedValue(false),
    create,
    update,
    softDelete,
    ...overrides,
  };
  const preferenceRepository = {
    findTimezone: vi.fn().mockResolvedValue('Asia/Jakarta'),
  };
  return {
    repository,
    mutations: { create, update, softDelete },
    preferenceRepository,
    service: createReminderService(repository, preferenceRepository),
  };
}

describe('Reminder service', () => {
  it('lists owned reminders in the resolved preference timezone', async () => {
    const { service, preferenceRepository } = setup();
    await expect(service.list('user-1', stored.habitId)).resolves.toEqual({
      timezone: 'Asia/Jakarta',
      items: [
        expect.objectContaining({
          id: stored.id,
          timeOfDay: '08:30',
          isEnabled: true,
        }),
      ],
    });
    expect(preferenceRepository.findTimezone).toHaveBeenCalledWith('user-1');
  });

  it('creates, updates, and soft deletes through ownership-scoped methods', async () => {
    const { service, mutations } = setup();
    await service.create('user-1', stored.habitId, {
      timeOfDay: '08:30',
      isEnabled: true,
    });
    await service.update('user-1', stored.habitId, stored.id, {
      isEnabled: false,
    });
    await service.softDelete('user-1', stored.habitId, stored.id);

    expect(mutations.create).toHaveBeenCalledWith('user-1', stored.habitId, {
      timeOfDay: '08:30',
      isEnabled: true,
    });
    expect(mutations.update).toHaveBeenCalledWith(
      'user-1',
      stored.habitId,
      stored.id,
      { isEnabled: false },
    );
    expect(mutations.softDelete).toHaveBeenCalledWith(
      'user-1',
      stored.habitId,
      stored.id,
    );
  });

  it('uses safe 404 responses for inaccessible habits and reminders', async () => {
    const missingHabit = setup({
      habitExists: vi.fn().mockResolvedValue(false),
    }).service;
    await expect(
      missingHabit.list('user-1', stored.habitId),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });

    const missingReminder = setup({
      find: vi.fn().mockResolvedValue(null),
    }).service;
    await expect(
      missingReminder.update('user-1', stored.habitId, stored.id, {
        isEnabled: false,
      }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });

  it('rejects duplicate active reminder times with a conflict', async () => {
    const { service } = setup({
      duplicateExists: vi.fn().mockResolvedValue(true),
    });
    await expect(
      service.create('user-1', stored.habitId, {
        timeOfDay: '08:30',
        isEnabled: true,
      }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' });
  });

  it('strictly validates HH:mm, unknown fields, and empty updates', () => {
    expect(
      reminderCreateBodySchema.safeParse({ timeOfDay: '08:30' }).data,
    ).toEqual({ timeOfDay: '08:30', isEnabled: true });
    for (const timeOfDay of ['24:00', '12:60', '8:30', '08:3']) {
      expect(reminderCreateBodySchema.safeParse({ timeOfDay }).success).toBe(
        false,
      );
    }
    expect(
      reminderCreateBodySchema.safeParse({
        timeOfDay: '08:30',
        userId: 'forbidden',
      }).success,
    ).toBe(false);
    expect(reminderUpdateBodySchema.safeParse({}).success).toBe(false);
  });
});
