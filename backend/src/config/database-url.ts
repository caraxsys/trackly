import { z } from 'zod';

export const databaseUrlSchema = z
  .url('DATABASE_URL must be a valid PostgreSQL connection URL')
  .refine(
    (url) => ['postgresql:', 'postgres:'].includes(new URL(url).protocol),
    'DATABASE_URL must use the postgresql:// or postgres:// protocol',
  );

export function parseDatabaseUrl(value: unknown) {
  const result = databaseUrlSchema.safeParse(value);

  if (!result.success) {
    throw new Error(
      `Invalid database configuration:\n${z.prettifyError(result.error)}`,
    );
  }

  return result.data;
}
