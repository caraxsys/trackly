import { z } from 'zod';

const optionalPublicValue = z.preprocess(
  (value) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  z.string().trim().min(1).optional(),
);

const publicEnvironmentSchema = z.object({
  NEXT_PUBLIC_API_URL: z.url(
    'NEXT_PUBLIC_API_URL must be a valid absolute URL',
  ),
  NEXT_PUBLIC_AUTH_URL: z.url(
    'NEXT_PUBLIC_AUTH_URL must be a valid absolute URL',
  ),
  NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY: optionalPublicValue,
});

interface PublicEnvironmentInput {
  NEXT_PUBLIC_API_URL?: string;
  NEXT_PUBLIC_AUTH_URL?: string;
  NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY?: string;
}

export function parsePublicEnvironment(input: PublicEnvironmentInput) {
  const result = publicEnvironmentSchema.safeParse(input);

  if (!result.success) {
    throw new Error(
      `Invalid public frontend environment:\n${z.prettifyError(result.error)}`,
    );
  }

  return result.data;
}

export const publicEnvironment = parsePublicEnvironment({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_AUTH_URL: process.env.NEXT_PUBLIC_AUTH_URL,
  NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY:
    process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY,
});
