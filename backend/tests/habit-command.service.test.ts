import { describe, expect, it, vi } from 'vitest';

import type { HabitCommandRepository } from '../src/modules/habits/habit-command.repository.js';
import { createHabitCommandService } from '../src/modules/habits/habit-command.service.js';
import {
  createHabitBodySchema,
  updateHabitBodySchema,
} from '../src/modules/habits/habit.schema.js';

function repository(overrides: Partial<HabitCommandRepository> = {}) {
  const base: HabitCommandRepository = {
    categoryExists: vi
      .fn<HabitCommandRepository['categoryExists']>()
      .mockResolvedValue(true),
    findOwned: vi.fn<HabitCommandRepository['findOwned']>().mockResolvedValue({
      id: 'habit-id',
      name: 'Existing',
      description: null,
      categoryId: null,
      frequencyType: 'weekly',
      targetCount: 1,
      startDate: '2026-01-01',
      endDate: null,
      isActive: true,
      weekdays: [1, 3],
    }),
    createAtomic: vi
      .fn<HabitCommandRepository['createAtomic']>()
      .mockImplementation((_userId, input) =>
        Promise.resolve({
          id: 'habit-id',
          name: input.name,
          description: input.description ?? null,
          categoryId: input.categoryId ?? null,
          frequencyType: input.frequencyType,
          targetCount: input.targetCount ?? 1,
          startDate: input.startDate,
          endDate: input.endDate ?? null,
          isActive: input.isActive ?? true,
          weekdays: input.weekdays ?? [],
        }),
      ),
    updateAtomic: vi
      .fn<HabitCommandRepository['updateAtomic']>()
      .mockImplementation((_userId, id, changes, schedule) =>
        Promise.resolve({
          id,
          name: changes.name ?? 'Existing',
          description: changes.description ?? null,
          categoryId: changes.categoryId ?? null,
          frequencyType: changes.frequencyType ?? 'weekly',
          targetCount: changes.targetCount ?? 1,
          startDate: changes.startDate ?? '2026-01-01',
          endDate: changes.endDate ?? null,
          isActive: changes.isActive ?? true,
          weekdays: schedule ?? [1, 3],
        }),
      ),
    softDelete: vi
      .fn<HabitCommandRepository['softDelete']>()
      .mockResolvedValue({ id: 'habit-id' }),
    setActive: vi
      .fn<HabitCommandRepository['setActive']>()
      .mockResolvedValue({ id: 'habit-id', isActive: false }),
  };

  return { ...base, ...overrides };
}

describe('HabitCommandService', () => {
  it('normalizes names, sorts schedules, and ignores daily weekdays', async () => {
    const repo = repository();
    const service = createHabitCommandService(repo);

    const weekly = await service.create('user-id', {
      name: '  Read  ',
      frequencyType: 'weekly',
      startDate: '2026-01-01',
      weekdays: [5, 1, 3],
    });
    const daily = await service.create('user-id', {
      name: 'Water',
      frequencyType: 'daily',
      startDate: '2026-01-01',
      weekdays: [2, 4],
    });

    expect(weekly).toMatchObject({ name: 'Read', weekdays: [1, 3, 5] });
    expect(daily.weekdays).toEqual([]);
  });

  it('validates categories, ranges, weekdays, and state conflicts', async () => {
    const missingCategory = createHabitCommandService(
      repository({
        categoryExists: vi.fn().mockResolvedValue(false),
      }),
    );
    await expect(
      missingCategory.create('user-id', {
        name: 'Read',
        categoryId: '00000000-0000-4000-8000-000000000001',
        frequencyType: 'daily',
        startDate: '2026-01-01',
      }),
    ).rejects.toMatchObject({ statusCode: 404 });

    const service = createHabitCommandService(repository());
    await expect(
      service.create('user-id', {
        name: 'Read',
        frequencyType: 'weekly',
        startDate: '2026-01-02',
        endDate: '2026-01-01',
        weekdays: [1],
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      service.create('user-id', {
        name: 'Read',
        frequencyType: 'custom',
        startDate: '2026-01-01',
        weekdays: [],
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(service.activate('user-id', 'habit-id')).rejects.toMatchObject(
      {
        statusCode: 409,
      },
    );
  });

  it('validates request bodies with Zod', () => {
    expect(
      createHabitBodySchema.safeParse({
        name: ' ',
        frequencyType: 'daily',
        startDate: '2026-01-01',
      }).success,
    ).toBe(false);
    expect(
      createHabitBodySchema.safeParse({
        name: 'Read',
        frequencyType: 'weekly',
        startDate: '2026-01-01',
        weekdays: [1, 1],
      }).success,
    ).toBe(false);
    expect(
      createHabitBodySchema.safeParse({
        name: 'Read',
        frequencyType: 'weekly',
        startDate: '2026-01-01',
        weekdays: [],
      }).success,
    ).toBe(false);
    expect(
      createHabitBodySchema.safeParse({
        name: 'Read',
        frequencyType: 'daily',
        targetCount: -1,
        startDate: '2026-01-01',
      }).success,
    ).toBe(false);
    expect(updateHabitBodySchema.safeParse({}).success).toBe(false);
  });
});
