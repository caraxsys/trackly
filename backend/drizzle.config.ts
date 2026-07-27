import 'dotenv/config';

import { defineConfig } from 'drizzle-kit';

import { parseDatabaseUrl } from './src/config/database-url.js';

const databaseUrl = parseDatabaseUrl(process.env.DATABASE_URL);

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  casing: 'snake_case',
  dbCredentials: {
    url: databaseUrl,
  },
  strict: true,
  verbose: true,
});
