import webPush from 'web-push';
import { z } from 'zod';

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
  'subject must be a mailto: address or HTTPS URL.',
);

const webPushConfigurationSchema = z
  .object({
    publicKey: z.string().min(1),
    privateKey: z.string().min(1),
    subject: vapidSubjectSchema,
  })
  .strict();

export type WebPushConfiguration = z.infer<typeof webPushConfigurationSchema>;

export function configureWebPush(
  input: WebPushConfiguration,
  client: Pick<typeof webPush, 'setVapidDetails'> = webPush,
) {
  const configuration = webPushConfigurationSchema.parse(input);
  try {
    client.setVapidDetails(
      configuration.subject,
      configuration.publicKey,
      configuration.privateKey,
    );
  } catch {
    throw new Error('Invalid Web Push VAPID configuration.');
  }
  return configuration;
}
