import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

import { environment } from '../config/environment.js';
import { database, type Database } from '../db/client.js';
import { userPreferences } from '../db/schema/user-preferences.js';

interface CreateAuthOptions {
  requireEmailVerification?: boolean;
}

export function createAuth(
  databaseConnection: Database,
  options: CreateAuthOptions = {},
) {
  const requireEmailVerification =
    options.requireEmailVerification ??
    environment.AUTH_REQUIRE_EMAIL_VERIFICATION;

  return betterAuth({
    appName: 'Trackly',
    baseURL: environment.BETTER_AUTH_URL,
    secret: environment.BETTER_AUTH_SECRET,
    database: drizzleAdapter(databaseConnection, {
      provider: 'pg',
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      requireEmailVerification,
    },
    session: {
      expiresIn: environment.AUTH_SESSION_EXPIRES_IN,
      updateAge: environment.AUTH_SESSION_UPDATE_AGE,
    },
    trustedOrigins: environment.BETTER_AUTH_TRUSTED_ORIGINS,
    advanced: {
      useSecureCookies: environment.NODE_ENV === 'production',
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      customRules: {
        '/sign-in/email': {
          window: 60,
          max: 10,
        },
        '/sign-up/email': {
          window: 60,
          max: 5,
        },
      },
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            await databaseConnection
              .insert(userPreferences)
              .values({ userId: user.id })
              .onConflictDoNothing();
          },
        },
      },
    },
  });
}

export const auth = createAuth(database);
export type Auth = ReturnType<typeof createAuth>;
