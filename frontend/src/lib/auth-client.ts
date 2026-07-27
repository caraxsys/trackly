'use client';

import { createAuthClient } from 'better-auth/react';

import { publicEnvironment } from './env';

export const authClient = createAuthClient({
  baseURL: publicEnvironment.NEXT_PUBLIC_AUTH_URL,
  fetchOptions: {
    credentials: 'include',
  },
});

export const { getSession, signIn, signOut, signUp, useSession } = authClient;
