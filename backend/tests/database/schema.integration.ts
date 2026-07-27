import { randomUUID } from 'node:crypto';

import { and, eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres, { type Sql } from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createAuth, type Auth } from '../../src/auth/auth.js';
import {
  categories,
  goals,
  goalSteps,
  habitCheckIns,
  habitSchedules,
  habits,
  tasks,
  user,
  userPreferences,
} from '../../src/db/schema/index.js';
import * as schema from '../../src/db/schema/index.js';

const adminUrl =
  process.env.DATABASE_ADMIN_URL ??
  'postgresql://trackly:trackly@localhost:5432/postgres';
const databaseName = `trackly_test_${process.pid}_${Date.now()}`;
const testDatabaseUrl = new URL(adminUrl);
testDatabaseUrl.pathname = `/${databaseName}`;

let adminClient: Sql;
let testClient: Sql;
function createTestDatabase(client: Sql) {
  return drizzle({
    client,
    schema,
    casing: 'snake_case',
  });
}

let database: ReturnType<typeof createTestDatabase>;
let testAuth: Auth;

async function authRequest(
  path: string,
  options: { body?: Record<string, unknown>; cookie?: string } = {},
) {
  return testAuth.handler(
    new Request(`http://localhost:4000/api/auth${path}`, {
      method: options.body ? 'POST' : 'GET',
      headers: {
        origin: 'http://localhost:3000',
        ...(options.body ? { 'content-type': 'application/json' } : {}),
        ...(options.cookie ? { cookie: options.cookie } : {}),
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    }),
  );
}

function sessionCookie(response: Response) {
  const setCookie = response.headers.get('set-cookie');
  if (!setCookie) {
    throw new Error('Authentication response did not set a session cookie.');
  }
  return setCookie.split(';', 1)[0] ?? '';
}

async function insertHabit(userId: string) {
  const [habit] = await database
    .insert(habits)
    .values({
      userId,
      name: 'Read',
      frequencyType: 'daily',
      startDate: '2026-01-01',
    })
    .returning({ id: habits.id });

  if (!habit) {
    throw new Error('Test habit was not created.');
  }

  return habit.id;
}

async function createTestUser() {
  const userId = `test-user-${randomUUID()}`;
  await database.insert(user).values({
    id: userId,
    name: 'Test User',
    email: `${userId}@example.com`,
  });
  return userId;
}

async function expectPostgresError(
  operation: Promise<unknown>,
  code: '23503' | '23505' | '23514',
) {
  try {
    await operation;
  } catch (error) {
    const cause =
      error instanceof Error && 'cause' in error ? error.cause : undefined;
    expect(cause).toMatchObject({ code });
    return;
  }

  throw new Error(`Expected PostgreSQL error ${code}.`);
}

describe('core database domain schema', () => {
  beforeAll(async () => {
    adminClient = postgres(adminUrl, { max: 1 });
    await adminClient.unsafe(`create database "${databaseName}"`);

    testClient = postgres(testDatabaseUrl.toString(), { max: 1 });
    database = createTestDatabase(testClient);

    await migrate(database, {
      migrationsFolder: 'src/db/migrations',
    });
    testAuth = createAuth(database);
  });

  afterAll(async () => {
    await testClient.end();
    await adminClient.unsafe(`drop database if exists "${databaseName}"`);
    await adminClient.end();
  });

  it('applies migrations to a clean database', async () => {
    const result = await database.execute<{ table_count: number }>(sql`
      select count(*)::int as table_count
      from information_schema.tables
      where table_schema = 'public'
        and table_name in (
          'categories',
          'habits',
          'habit_schedules',
          'habit_check_ins',
          'tasks',
          'goals',
          'goal_steps',
          'user_preferences',
          'user',
          'session',
          'account',
          'verification'
        )
    `);

    expect(result[0]?.table_count).toBe(12);
  });

  it('supports registration, login, persistent sessions, and logout', async () => {
    const email = `auth-${randomUUID()}@example.com`;
    const password = 'correct-horse-battery-staple';
    const registration = await authRequest('/sign-up/email', {
      body: { name: 'Auth Test', email, password },
    });

    expect(registration.status).toBe(200);
    const registrationCookie = sessionCookie(registration);
    const registered = (await registration.json()) as {
      user: { id: string; email: string };
    };

    expect(registered.user.email).toBe(email);
    expect(
      await database.$count(
        userPreferences,
        eq(userPreferences.userId, registered.user.id),
      ),
    ).toBe(1);

    const duplicate = await authRequest('/sign-up/email', {
      body: { name: 'Duplicate', email, password },
    });
    expect(duplicate.status).toBeGreaterThanOrEqual(400);
    expect(
      await database.$count(
        userPreferences,
        eq(userPreferences.userId, registered.user.id),
      ),
    ).toBe(1);

    const invalidLogin = await authRequest('/sign-in/email', {
      body: { email, password: 'incorrect-password' },
    });
    expect(invalidLogin.status).toBe(401);

    const login = await authRequest('/sign-in/email', {
      body: { email, password },
    });
    expect(login.status).toBe(200);
    const cookie = sessionCookie(login);

    const currentSession = await authRequest('/get-session', { cookie });
    expect(currentSession.status).toBe(200);
    expect(await currentSession.json()).toMatchObject({
      user: { id: registered.user.id, email },
    });

    const forgedSession = await authRequest('/get-session', {
      cookie: 'better-auth.session_token=forged',
    });
    expect(await forgedSession.json()).toBeNull();

    const logout = await authRequest('/sign-out', { body: {}, cookie });
    expect(logout.status).toBe(200);

    const expiredSession = await authRequest('/get-session', { cookie });
    expect(await expiredSession.json()).toBeNull();

    expect(registrationCookie).toContain('session');
  });

  it('rejects duplicate habit check-ins for one habit and date', async () => {
    const userId = await createTestUser();
    const habitId = await insertHabit(userId);
    const checkIn = {
      habitId,
      userId,
      checkInDate: '2026-01-02',
      completedCount: 1,
    };

    await database.insert(habitCheckIns).values(checkIn);

    await expectPostgresError(
      database.insert(habitCheckIns).values(checkIn),
      '23505',
    );
  });

  it('rejects duplicate and invalid habit schedule weekdays', async () => {
    const habitId = await insertHabit(await createTestUser());

    await database.insert(habitSchedules).values({ habitId, dayOfWeek: 1 });

    await expectPostgresError(
      database.insert(habitSchedules).values({ habitId, dayOfWeek: 1 }),
      '23505',
    );

    await expectPostgresError(
      database.insert(habitSchedules).values({ habitId, dayOfWeek: 8 }),
      '23514',
    );
  });

  it('rejects invalid habit counts and date ranges', async () => {
    const userId = await createTestUser();

    await expectPostgresError(
      database.insert(habits).values({
        userId,
        name: 'Invalid target',
        frequencyType: 'daily',
        targetCount: -1,
        startDate: '2026-01-01',
      }),
      '23514',
    );

    await expectPostgresError(
      database.insert(habits).values({
        userId,
        name: 'Invalid range',
        frequencyType: 'daily',
        startDate: '2026-02-01',
        endDate: '2026-01-01',
      }),
      '23514',
    );
  });

  it('rejects a negative habit completed count', async () => {
    const userId = await createTestUser();
    const habitId = await insertHabit(userId);

    await expectPostgresError(
      database.insert(habitCheckIns).values({
        habitId,
        userId,
        checkInDate: '2026-01-03',
        completedCount: -1,
      }),
      '23514',
    );
  });

  it('rejects invalid goal date ranges', async () => {
    const userId = await createTestUser();
    await expectPostgresError(
      database.insert(goals).values({
        userId,
        title: 'Invalid goal',
        startDate: '2026-03-01',
        targetDate: '2026-02-01',
      }),
      '23514',
    );
  });

  it('cascades physical habit deletion to schedules and check-ins', async () => {
    const userId = await createTestUser();
    const habitId = await insertHabit(userId);

    await database.insert(habitSchedules).values({ habitId, dayOfWeek: 2 });
    await database.insert(habitCheckIns).values({
      habitId,
      userId,
      checkInDate: '2026-01-04',
    });
    await database.delete(habits).where(eq(habits.id, habitId));

    const [schedule, checkIn] = await Promise.all([
      database.query.habitSchedules.findFirst({
        where: eq(habitSchedules.habitId, habitId),
      }),
      database.query.habitCheckIns.findFirst({
        where: eq(habitCheckIns.habitId, habitId),
      }),
    ]);

    expect(schedule).toBeUndefined();
    expect(checkIn).toBeUndefined();
  });

  it('cascades physical goal deletion to goal steps', async () => {
    const [goal] = await database
      .insert(goals)
      .values({
        userId: await createTestUser(),
        title: 'Test goal',
      })
      .returning({ id: goals.id });

    if (!goal) {
      throw new Error('Test goal was not created.');
    }

    await database
      .insert(goalSteps)
      .values({ goalId: goal.id, title: 'First step' });
    await database.delete(goals).where(eq(goals.id, goal.id));

    const step = await database.query.goalSteps.findFirst({
      where: eq(goalSteps.goalId, goal.id),
    });
    expect(step).toBeUndefined();
  });

  it('sets category references to null after physical deletion', async () => {
    const userId = await createTestUser();
    const [category] = await database
      .insert(categories)
      .values({ userId, name: 'Focus' })
      .returning({ id: categories.id });

    if (!category) {
      throw new Error('Test category was not created.');
    }

    const [habit] = await database
      .insert(habits)
      .values({
        userId,
        categoryId: category.id,
        name: 'Focus habit',
        frequencyType: 'daily',
        startDate: '2026-01-01',
      })
      .returning({ id: habits.id });
    const [task] = await database
      .insert(tasks)
      .values({ userId, categoryId: category.id, title: 'Focus task' })
      .returning({ id: tasks.id });
    const [goal] = await database
      .insert(goals)
      .values({ userId, categoryId: category.id, title: 'Focus goal' })
      .returning({ id: goals.id });

    if (!habit || !task || !goal) {
      throw new Error('Categorized test records were not created.');
    }

    await database
      .delete(categories)
      .where(
        and(eq(categories.id, category.id), eq(categories.userId, userId)),
      );

    const [storedHabit, storedTask, storedGoal] = await Promise.all([
      database.query.habits.findFirst({ where: eq(habits.id, habit.id) }),
      database.query.tasks.findFirst({ where: eq(tasks.id, task.id) }),
      database.query.goals.findFirst({ where: eq(goals.id, goal.id) }),
    ]);

    expect(storedHabit?.categoryId).toBeNull();
    expect(storedTask?.categoryId).toBeNull();
    expect(storedGoal?.categoryId).toBeNull();
  });

  it('rejects duplicate user preferences for one user', async () => {
    const userId = await createTestUser();
    await database.insert(userPreferences).values({ userId });

    await expectPostgresError(
      database.insert(userPreferences).values({ userId }),
      '23505',
    );
  });

  it('rejects ownership rows for nonexistent users', async () => {
    await expectPostgresError(
      database.insert(categories).values({
        userId: `missing-${randomUUID()}`,
        name: 'Orphan',
      }),
      '23503',
    );
  });

  it('cascades user deletion through all owned application records', async () => {
    const userId = await createTestUser();
    const [category] = await database
      .insert(categories)
      .values({ userId, name: 'Owned category' })
      .returning({ id: categories.id });
    const habitId = await insertHabit(userId);

    await Promise.all([
      database.insert(habitCheckIns).values({
        habitId,
        userId,
        checkInDate: '2026-04-01',
      }),
      database.insert(tasks).values({ userId, title: 'Owned task' }),
      database.insert(goals).values({ userId, title: 'Owned goal' }),
      database.insert(userPreferences).values({ userId }),
    ]);

    await database.delete(user).where(eq(user.id, userId));

    const counts = await Promise.all([
      database.$count(categories, eq(categories.userId, userId)),
      database.$count(habits, eq(habits.userId, userId)),
      database.$count(habitCheckIns, eq(habitCheckIns.userId, userId)),
      database.$count(tasks, eq(tasks.userId, userId)),
      database.$count(goals, eq(goals.userId, userId)),
      database.$count(userPreferences, eq(userPreferences.userId, userId)),
    ]);

    expect(category).toBeDefined();
    expect(counts).toEqual([0, 0, 0, 0, 0, 0]);
  });
});
