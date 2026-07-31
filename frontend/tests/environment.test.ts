import { describe, expect, it } from 'vitest';

import { parsePublicEnvironment } from '@/lib/env';

describe('public environment validation', () => {
  it('fails clearly for an invalid API URL', () => {
    expect(() =>
      parsePublicEnvironment({
        NEXT_PUBLIC_API_URL: 'not-a-url',
        NEXT_PUBLIC_AUTH_URL: 'http://localhost:4000',
      }),
    ).toThrow(
      /Invalid public frontend environment:[\s\S]*NEXT_PUBLIC_API_URL must be a valid absolute URL/,
    );
  });

  it('allows missing optional Web Push configuration', () => {
    expect(
      parsePublicEnvironment({
        NEXT_PUBLIC_API_URL: 'http://localhost:4000',
        NEXT_PUBLIC_AUTH_URL: 'http://localhost:4000',
      }).NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY,
    ).toBeUndefined();
  });

  it.each(['', '   '])(
    'normalizes blank optional Web Push configuration to missing',
    (publicKey) => {
      expect(
        parsePublicEnvironment({
          NEXT_PUBLIC_API_URL: 'http://localhost:4000',
          NEXT_PUBLIC_AUTH_URL: 'http://localhost:4000',
          NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY: publicKey,
        }).NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY,
      ).toBeUndefined();
    },
  );
});
