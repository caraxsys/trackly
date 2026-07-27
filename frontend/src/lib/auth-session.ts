import 'server-only';

import { cookies } from 'next/headers';
import { z } from 'zod';

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

function getInternalApiUrl() {
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

export async function getServerSession(): Promise<AuthSession | null> {
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
