import 'server-only';

import { cookies } from 'next/headers';
import { cache } from 'react';
import { z } from 'zod';

import { getInternalApiUrl } from './server-environment';

const sessionSchema = z.object({
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.email(),
    image: z.string().nullable().optional(),
  }),
  session: z.object({
    expiresAt: z.coerce.date(),
  }),
});

export type AuthSession = z.infer<typeof sessionSchema>;

async function loadServerSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();

  try {
    const response = await fetch(
      `${getInternalApiUrl()}/api/auth/get-session`,
      {
        cache: 'no-store',
        headers: {
          cookie: cookieStore.toString(),
        },
      },
    );

    if (!response.ok) {
      return null;
    }

    const result = sessionSchema.safeParse(await response.json());
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export const getServerSession = cache(loadServerSession);
