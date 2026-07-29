import { z } from 'zod';

const endpointSchema = z
  .url()
  .max(4096)
  .refine((value) => new URL(value).protocol === 'https:', {
    message: 'endpoint must use HTTPS.',
  });
const keySchema = z.string().trim().min(16).max(2048);

export const pushSubscriptionCreateBodySchema = z
  .object({
    endpoint: endpointSchema,
    keys: z
      .object({
        p256dh: keySchema,
        auth: keySchema,
      })
      .strict(),
    userAgent: z.string().trim().min(1).max(512).optional(),
  })
  .strict();

export const pushSubscriptionDeleteBodySchema = z
  .object({ endpoint: endpointSchema })
  .strict();

export type PushSubscriptionCreateBody = z.infer<
  typeof pushSubscriptionCreateBodySchema
>;
export type PushSubscriptionDeleteBody = z.infer<
  typeof pushSubscriptionDeleteBodySchema
>;
