import 'dotenv/config';

import { z } from 'zod';

import { databaseUrlSchema } from './database-url.js';

const vapidSubjectSchema = z.string().refine(
  (value) =>
    /^mailto:[^@\s]+@[^@\s]+$/i.test(value) ||
    (() => {
      try {
        return new URL(value).protocol === 'https:';
      } catch {
        return false;
      }
    })(),
  'WEB_PUSH_SUBJECT must be a mailto: address or HTTPS URL.',
);
const optionalEnvironmentValue = <Schema extends z.ZodType>(schema: Schema) =>
  z.preprocess(
    (value) =>
      typeof value === 'string' && value.trim() === '' ? undefined : value,
    schema.optional(),
  );
const booleanEnvironmentValue = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

export const environmentSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    DATABASE_URL: databaseUrlSchema,
    BACKEND_HOST: z.string().min(1).default('0.0.0.0'),
    BACKEND_PORT: z.coerce.number().int().positive().max(65535).default(4000),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    CORS_ORIGINS: z
      .string()
      .min(1)
      .default('http://localhost:3000')
      .transform((origins) =>
        origins
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean),
      )
      .pipe(z.array(z.url()).min(1)),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url().default('http://localhost:4000'),
    BETTER_AUTH_TRUSTED_ORIGINS: z
      .string()
      .min(1)
      .default('http://localhost:3000')
      .transform((origins) =>
        origins
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean),
      )
      .pipe(z.array(z.url()).min(1)),
    AUTH_SESSION_EXPIRES_IN: z.coerce
      .number()
      .int()
      .positive()
      .default(60 * 60 * 24 * 7),
    AUTH_SESSION_UPDATE_AGE: z.coerce
      .number()
      .int()
      .nonnegative()
      .default(60 * 60 * 24),
    AUTH_REQUIRE_EMAIL_VERIFICATION: booleanEnvironmentValue.optional(),
    API_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
    API_MUTATION_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),
    API_RATE_LIMIT_WINDOW_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(60_000),
    EXPOSE_API_DOCS: booleanEnvironmentValue.optional(),
    ENABLE_DIAGNOSTICS: booleanEnvironmentValue.optional(),
    TRUST_PROXY: booleanEnvironmentValue.default(false),
    WEB_PUSH_VAPID_PUBLIC_KEY: optionalEnvironmentValue(z.string().min(1)),
    WEB_PUSH_VAPID_PRIVATE_KEY: optionalEnvironmentValue(z.string().min(1)),
    WEB_PUSH_SUBJECT: optionalEnvironmentValue(vapidSubjectSchema),
  })
  .transform((value) => ({
    ...value,
    AUTH_REQUIRE_EMAIL_VERIFICATION:
      value.AUTH_REQUIRE_EMAIL_VERIFICATION ?? value.NODE_ENV === 'production',
    EXPOSE_API_DOCS: value.EXPOSE_API_DOCS ?? value.NODE_ENV !== 'production',
    ENABLE_DIAGNOSTICS:
      value.ENABLE_DIAGNOSTICS ?? value.NODE_ENV !== 'production',
  }))
  .superRefine((value, context) => {
    if (value.NODE_ENV !== 'production') return;
    for (const key of [
      'WEB_PUSH_VAPID_PUBLIC_KEY',
      'WEB_PUSH_VAPID_PRIVATE_KEY',
      'WEB_PUSH_SUBJECT',
    ] as const) {
      if (!value[key]) {
        context.addIssue({
          code: 'custom',
          path: [key],
          message: `${key} is required in production.`,
        });
      }
    }

    if (new URL(value.BETTER_AUTH_URL).protocol !== 'https:') {
      context.addIssue({
        code: 'custom',
        path: ['BETTER_AUTH_URL'],
        message: 'BETTER_AUTH_URL must use HTTPS in production.',
      });
    }

    for (const [key, origins] of [
      ['CORS_ORIGINS', value.CORS_ORIGINS],
      ['BETTER_AUTH_TRUSTED_ORIGINS', value.BETTER_AUTH_TRUSTED_ORIGINS],
    ] as const) {
      if (origins.some((origin) => new URL(origin).protocol !== 'https:')) {
        context.addIssue({
          code: 'custom',
          path: [key],
          message: `${key} must contain only HTTPS origins in production.`,
        });
      }
    }

    if (
      /development|replace-with|test-only|change-before-production/i.test(
        value.BETTER_AUTH_SECRET,
      )
    ) {
      context.addIssue({
        code: 'custom',
        path: ['BETTER_AUTH_SECRET'],
        message:
          'BETTER_AUTH_SECRET must not use a known development placeholder in production.',
      });
    }

    if (!value.AUTH_REQUIRE_EMAIL_VERIFICATION) {
      context.addIssue({
        code: 'custom',
        path: ['AUTH_REQUIRE_EMAIL_VERIFICATION'],
        message: 'AUTH_REQUIRE_EMAIL_VERIFICATION must be true in production.',
      });
    }

    if (value.ENABLE_DIAGNOSTICS) {
      context.addIssue({
        code: 'custom',
        path: ['ENABLE_DIAGNOSTICS'],
        message: 'ENABLE_DIAGNOSTICS must be false in production.',
      });
    }
  });

const result = environmentSchema.safeParse(process.env);

if (!result.success) {
  const errors = z.prettifyError(result.error);
  throw new Error(`Invalid backend environment configuration:\n${errors}`);
}

export const environment = result.data;
