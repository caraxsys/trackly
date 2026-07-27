import 'server-only';

import { z } from 'zod';

export function getInternalApiUrl() {
  const value =
    process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_AUTH_URL;
  const result = z.url().safeParse(value);

  if (!result.success) {
    throw new Error(
      'INTERNAL_API_URL or NEXT_PUBLIC_AUTH_URL must be a valid absolute URL.',
    );
  }

  return result.data;
}
