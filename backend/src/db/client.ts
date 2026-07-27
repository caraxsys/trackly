import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';

import { environment } from '../config/environment.js';
import * as schema from './schema/index.js';

export const postgresClient = postgres(environment.DATABASE_URL, {
  max: environment.NODE_ENV === 'production' ? 20 : 5,
  prepare: false,
});

export const database = drizzle({
  client: postgresClient,
  casing: 'snake_case',
  schema,
});

export async function closeDatabaseConnection() {
  await postgresClient.end();
}

export async function verifyDatabaseConnection() {
  await database.execute(sql`select 1`);
}

export type Database = typeof database;
