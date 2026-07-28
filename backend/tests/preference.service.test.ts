import { describe, expect, it, vi } from 'vitest';
import { preferenceUpdateSchema } from '../src/modules/preferences/preference.schema.js';
import { createPreferenceService } from '../src/modules/preferences/preference.service.js';

const stored = {
  id: 'preference-1',
  userId: 'user-1',
  timezone: 'Asia/Jakarta',
  weekStartsOn: 7,
  dateFormat: 'dd/MM/yyyy',
  timeFormat: '12h',
  theme: 'dark',
  createdAt: new Date('2026-07-01T00:00:00.000Z'),
  updatedAt: new Date('2026-07-02T00:00:00.000Z'),
};

function setup(value: typeof stored | null = null) {
  const repository = {
    findByUserId: vi.fn().mockResolvedValue(value),
    findTimezone: vi.fn(),
    upsert: vi.fn().mockResolvedValue(stored),
  };
  return { repository, service: createPreferenceService(repository) };
}

describe('Preference service', () => {
  it('returns complete defaults without provisioning a row', async () => {
    const { repository, service } = setup();
    await expect(service.get('user-1')).resolves.toEqual({
      timezone: 'UTC',
      weekStartsOn: 'monday',
      dateFormat: 'yyyy-MM-dd',
      timeFormat: '24h',
      theme: 'system',
      createdAt: null,
      updatedAt: null,
    });
    expect(repository.upsert).not.toHaveBeenCalled();
  });

  it('maps persisted fields and safely resolves invalid legacy values', async () => {
    const { service } = setup(stored);
    await expect(service.get('user-1')).resolves.toMatchObject({
      timezone: 'Asia/Jakarta',
      weekStartsOn: 'sunday',
      dateFormat: 'dd/MM/yyyy',
      timeFormat: '12h',
      theme: 'dark',
    });
    const invalid = {
      ...stored,
      timezone: 'Invalid/Timezone',
      dateFormat: 'legacy',
      timeFormat: 'legacy',
      theme: 'legacy',
    };
    const fallback = setup(invalid).service;
    await expect(fallback.get('user-1')).resolves.toMatchObject({
      timezone: 'UTC',
      dateFormat: 'yyyy-MM-dd',
      timeFormat: '24h',
      theme: 'system',
    });
  });

  it('upserts partial updates with the authenticated user id', async () => {
    const { repository, service } = setup();
    await service.update('user-1', {
      timezone: 'Asia/Jakarta',
      weekStartsOn: 'sunday',
    });
    expect(repository.upsert).toHaveBeenCalledWith('user-1', {
      timezone: 'Asia/Jakarta',
      weekStartsOn: 7,
    });
  });

  it('validates timezones, enum fields, empty bodies, and unknown fields', () => {
    expect(
      preferenceUpdateSchema.safeParse({ timezone: 'Europe/London' }).success,
    ).toBe(true);
    for (const value of [
      {},
      { timezone: 'Not a timezone' },
      { theme: 'sepia' },
      { unknown: true },
    ]) {
      expect(preferenceUpdateSchema.safeParse(value).success).toBe(false);
    }
  });
});
