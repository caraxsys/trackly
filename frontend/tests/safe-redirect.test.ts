import { describe, expect, it } from 'vitest';

import { safeInternalRedirect } from '@/lib/safe-redirect';

describe('safe internal redirects', () => {
  it('accepts local paths and rejects external or protocol-relative URLs', () => {
    expect(safeInternalRedirect('/tasks')).toBe('/tasks');
    expect(safeInternalRedirect('https://evil.example')).toBe('/today');
    expect(safeInternalRedirect('//evil.example')).toBe('/today');
  });
});
