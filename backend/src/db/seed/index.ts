import { closeDatabaseConnection, verifyDatabaseConnection } from '../index.js';

async function runSeed() {
  try {
    await verifyDatabaseConnection();
    console.info(
      'Database seed connection verified. No seed data is defined yet.',
    );
  } catch (error) {
    console.error('Database seed failed.', error);
    process.exitCode = 1;
  } finally {
    await closeDatabaseConnection();
  }
}

await runSeed();
