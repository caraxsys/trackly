import { migrate } from 'drizzle-orm/postgres-js/migrator';

import { closeDatabaseConnection, database } from './index.js';

async function runMigrations() {
  try {
    await migrate(database, {
      migrationsFolder: 'src/db/migrations',
    });
    console.info('Database migrations completed successfully.');
  } catch (error) {
    console.error('Database migration failed.', error);
    process.exitCode = 1;
  } finally {
    await closeDatabaseConnection();
  }
}

await runMigrations();
