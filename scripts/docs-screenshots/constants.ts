import path from 'node:path';

export const docsFrontendUrl =
  process.env.DOCS_FRONTEND_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';
export const docsBackendUrl =
  process.env.DOCS_BACKEND_URL?.replace(/\/$/, '') ?? 'http://localhost:4000';
export const docsDatabaseUrl =
  process.env.DOCS_DATABASE_URL ??
  'postgresql://trackly:trackly@localhost:5432/trackly';
export const docsUserEmail =
  process.env.DOCS_USER_EMAIL ?? 'docs@trackly.local';
export const docsUserPassword =
  process.env.DOCS_USER_PASSWORD ?? 'Trackly-Docs-2026!';
export const docsUserName = process.env.DOCS_USER_NAME ?? 'Trackly Demo';
export const docsTimezone = process.env.DOCS_TIMEZONE ?? 'Asia/Jakarta';

export const screenshotRoot = path.resolve(
  process.cwd(),
  'docs/assets/screenshots',
);

export const demoIds = {
  categories: {
    health: 'd0c00000-0000-4000-8000-000000000001',
    learning: 'd0c00000-0000-4000-8000-000000000002',
    productivity: 'd0c00000-0000-4000-8000-000000000003',
  },
  habits: {
    morningRun: 'd0c10000-0000-4000-8000-000000000001',
    readPages: 'd0c10000-0000-4000-8000-000000000002',
    drinkWater: 'd0c10000-0000-4000-8000-000000000003',
    planTomorrow: 'd0c10000-0000-4000-8000-000000000004',
  },
  goals: {
    workouts: 'd0c20000-0000-4000-8000-000000000001',
    books: 'd0c20000-0000-4000-8000-000000000002',
  },
  goalSteps: {
    workoutPlan: 'd0c21000-0000-4000-8000-000000000001',
    firstWorkouts: 'd0c21000-0000-4000-8000-000000000002',
    recoveryReview: 'd0c21000-0000-4000-8000-000000000003',
    readingList: 'd0c21000-0000-4000-8000-000000000004',
    firstBooks: 'd0c21000-0000-4000-8000-000000000005',
    readingNotes: 'd0c21000-0000-4000-8000-000000000006',
  },
  reminders: {
    morningRun: 'd0c30000-0000-4000-8000-000000000001',
    readPages: 'd0c30000-0000-4000-8000-000000000002',
  },
} as const;
