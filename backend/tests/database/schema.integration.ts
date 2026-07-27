import { randomUUID } from 'node:crypto';

import { and, eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres, { type Sql } from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createAuth, type Auth } from '../../src/auth/auth.js';
import { createCategoryRepository } from '../../src/modules/categories/category.repository.js';
import { createGoalRepository } from '../../src/modules/goals/goal.repository.js';
import { createHabitRepository } from '../../src/modules/habits/habit.repository.js';
import { createHabitCommandRepository } from '../../src/modules/habits/habit-command.repository.js';
import { createHabitCommandService } from '../../src/modules/habits/habit-command.service.js';
import { createHabitService } from '../../src/modules/habits/habit.service.js';
import { createPreferenceRepository } from '../../src/modules/preferences/preference.repository.js';
import { createTaskRepository } from '../../src/modules/tasks/task.repository.js';
import { createTodayService } from '../../src/modules/today/today.service.js';
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

function todayService() {
  return createTodayService({
    preferenceRepository: createPreferenceRepository(database),
    habitRepository: createHabitRepository(database),
    taskRepository: createTaskRepository(database),
    goalRepository: createGoalRepository(database),
  });
}

function habitService() {
  return createHabitService({
    preferenceRepository: createPreferenceRepository(database),
    habitRepository: createHabitRepository(database),
  });
}

function habitCommandService() {
  return createHabitCommandService(createHabitCommandRepository(database));
}

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

  it('aggregates Today data with strict ownership and documented semantics', async () => {
    const userId = await createTestUser();
    const otherUserId = await createTestUser();
    await Promise.all([
      database
        .insert(userPreferences)
        .values({ userId, timezone: 'Asia/Jakarta' }),
      database
        .insert(userPreferences)
        .values({ userId: otherUserId, timezone: 'UTC' }),
    ]);

    const [category] = await database
      .insert(categories)
      .values({ userId, name: 'Health', color: '#00aa66' })
      .returning({ id: categories.id });
    const [deletedCategory] = await database
      .insert(categories)
      .values({
        userId,
        name: 'Archived',
        deletedAt: new Date('2026-07-01T00:00:00Z'),
      })
      .returning({ id: categories.id });

    if (!category || !deletedCategory) {
      throw new Error('Test categories were not created.');
    }

    const insertedHabits = await database
      .insert(habits)
      .values([
        {
          userId,
          categoryId: category.id,
          name: 'Daily complete',
          frequencyType: 'daily',
          targetCount: 2,
          startDate: '2026-07-01',
          position: 2,
        },
        {
          userId,
          name: 'Weekly Monday',
          frequencyType: 'weekly',
          startDate: '2026-07-01',
          position: 1,
        },
        {
          userId,
          name: 'Custom Monday',
          frequencyType: 'custom',
          startDate: '2026-07-01',
          position: 3,
        },
        {
          userId,
          name: 'Outside range',
          frequencyType: 'daily',
          startDate: '2026-08-01',
        },
        {
          userId,
          name: 'Inactive',
          frequencyType: 'daily',
          startDate: '2026-07-01',
          isActive: false,
        },
        {
          userId,
          name: 'Deleted habit',
          frequencyType: 'daily',
          startDate: '2026-07-01',
          deletedAt: new Date('2026-07-20T00:00:00Z'),
        },
        {
          userId: otherUserId,
          name: 'Other user habit',
          frequencyType: 'daily',
          startDate: '2026-07-01',
        },
      ])
      .returning({ id: habits.id, name: habits.name });
    const byHabitName = new Map(
      insertedHabits.map((habit) => [habit.name, habit.id]),
    );
    const dailyId = byHabitName.get('Daily complete');
    const weeklyId = byHabitName.get('Weekly Monday');
    const customId = byHabitName.get('Custom Monday');

    if (!dailyId || !weeklyId || !customId) {
      throw new Error('Scheduled test habits were not created.');
    }

    await database.insert(habitSchedules).values([
      { habitId: weeklyId, dayOfWeek: 1 },
      { habitId: customId, dayOfWeek: 1 },
    ]);
    await database.insert(habitCheckIns).values({
      habitId: dailyId,
      userId,
      checkInDate: '2026-07-27',
      completedCount: 2,
    });

    await database.insert(tasks).values([
      {
        userId,
        title: 'Overdue high',
        priority: 'high',
        dueAt: new Date('2026-07-26T16:00:00Z'),
      },
      {
        userId,
        title: 'Overdue low',
        priority: 'low',
        dueAt: new Date('2026-07-26T16:00:00Z'),
      },
      {
        userId,
        title: 'Due today',
        priority: 'medium',
        dueAt: new Date('2026-07-26T17:30:00Z'),
      },
      {
        userId,
        title: 'Completed after local midnight',
        status: 'completed',
        dueAt: new Date('2026-07-26T16:30:00Z'),
        completedAt: new Date('2026-07-26T18:00:00Z'),
      },
      {
        userId,
        title: 'Cancelled',
        status: 'cancelled',
        dueAt: new Date('2026-07-26T18:00:00Z'),
      },
      {
        userId,
        title: 'Deleted task',
        dueAt: new Date('2026-07-26T18:00:00Z'),
        deletedAt: new Date('2026-07-01T00:00:00Z'),
      },
      {
        userId: otherUserId,
        title: 'Other user task',
        dueAt: new Date('2026-07-26T18:00:00Z'),
      },
    ]);

    const insertedGoals = await database
      .insert(goals)
      .values([
        {
          userId,
          categoryId: deletedCategory.id,
          title: 'Sooner goal',
          targetDate: '2026-08-01',
          position: 2,
        },
        {
          userId,
          title: 'Later goal',
          targetDate: '2026-09-01',
          position: 1,
        },
        {
          userId,
          title: 'Zero-step goal',
          position: 3,
        },
        {
          userId,
          title: 'Future goal',
          startDate: '2026-08-01',
        },
        {
          userId,
          title: 'Paused goal',
          status: 'paused',
        },
        {
          userId,
          title: 'Deleted goal',
          deletedAt: new Date('2026-07-01T00:00:00Z'),
        },
        {
          userId: otherUserId,
          title: 'Other user goal',
        },
      ])
      .returning({ id: goals.id, title: goals.title });
    const soonerGoal = insertedGoals.find(
      (goal) => goal.title === 'Sooner goal',
    );

    if (!soonerGoal) {
      throw new Error('Test goal was not created.');
    }

    await database.insert(goalSteps).values([
      { goalId: soonerGoal.id, title: 'Done', isCompleted: true },
      { goalId: soonerGoal.id, title: 'Pending' },
    ]);

    const result = await todayService().getToday({
      userId,
      date: '2026-07-27',
    });
    const tuesdayResult = await todayService().getToday({
      userId,
      date: '2026-07-28',
    });
    const activeCategories =
      await createCategoryRepository(database).listActiveByUser(userId);

    expect(result.timezone).toBe('Asia/Jakarta');
    expect(result.habits.map((habit) => habit.name)).toEqual([
      'Weekly Monday',
      'Daily complete',
      'Custom Monday',
    ]);
    expect(result.habits.find((habit) => habit.id === dailyId)).toMatchObject({
      completedCount: 2,
      isCompleted: true,
      category: { name: 'Health' },
    });
    expect(result.habits.find((habit) => habit.id === weeklyId)).toMatchObject({
      completedCount: 0,
      isCompleted: false,
    });
    expect(result.tasks.overdue.map((task) => task.title)).toEqual([
      'Overdue high',
      'Overdue low',
    ]);
    expect(result.tasks.dueToday.map((task) => task.title)).toEqual([
      'Due today',
    ]);
    expect(result.tasks.completedToday.map((task) => task.title)).toEqual([
      'Completed after local midnight',
    ]);
    expect(result.goals.map((goal) => goal.title)).toEqual([
      'Sooner goal',
      'Later goal',
      'Zero-step goal',
    ]);
    expect(result.goals[0]).toMatchObject({
      totalSteps: 2,
      completedSteps: 1,
      progressPercentage: 50,
      category: null,
    });
    expect(result.goals[2]).toMatchObject({
      totalSteps: 0,
      completedSteps: 0,
      progressPercentage: 0,
    });
    expect(result.summary).toEqual({
      habitsTotal: 3,
      habitsCompleted: 1,
      tasksDueToday: 1,
      tasksCompletedToday: 1,
      overdueTasks: 2,
      activeGoals: 3,
      completedItems: 2,
      totalItems: 7,
      completionPercentage: 29,
    });
    expect(activeCategories.map((item) => item.name)).toEqual(['Health']);
    expect(tuesdayResult.habits.map((habit) => habit.name)).toEqual([
      'Daily complete',
    ]);
    expect(JSON.stringify(result)).not.toContain('Other user');
  });

  it('uses timezone-local default dates and returns a valid empty state', async () => {
    const userId = await createTestUser();
    await database
      .insert(userPreferences)
      .values({ userId, timezone: 'Asia/Jakarta' });

    const result = await todayService().getToday({
      userId,
      now: new Date('2026-07-26T18:00:00Z'),
    });

    expect(result).toMatchObject({
      date: '2026-07-27',
      timezone: 'Asia/Jakarta',
      habits: [],
      tasks: { overdue: [], dueToday: [], completedToday: [] },
      goals: [],
      summary: {
        completedItems: 0,
        totalItems: 0,
        completionPercentage: 0,
      },
    });
  });

  it('falls back to UTC for missing or invalid preferences', async () => {
    const missingPreferenceUser = await createTestUser();
    const invalidTimezoneUser = await createTestUser();
    await database.insert(userPreferences).values({
      userId: invalidTimezoneUser,
      timezone: 'Invalid/Timezone',
    });
    let fallbackCount = 0;

    const [missing, invalid] = await Promise.all([
      todayService().getToday({
        userId: missingPreferenceUser,
        now: new Date('2026-07-26T23:30:00Z'),
      }),
      todayService().getToday({
        userId: invalidTimezoneUser,
        now: new Date('2026-07-26T23:30:00Z'),
        onTimezoneFallback: () => {
          fallbackCount += 1;
        },
      }),
    ]);

    expect(missing).toMatchObject({ timezone: 'UTC', date: '2026-07-26' });
    expect(invalid).toMatchObject({ timezone: 'UTC', date: '2026-07-26' });
    expect(fallbackCount).toBe(1);
  });

  it('keeps Today query cost bounded for a realistic fixture', async () => {
    const userId = await createTestUser();
    await database.insert(userPreferences).values({ userId, timezone: 'UTC' });

    const fixtureHabits = await database
      .insert(habits)
      .values(
        Array.from({ length: 50 }, (_, index) => ({
          userId,
          name: `Fixture habit ${index}`,
          frequencyType: 'daily' as const,
          startDate: '2026-01-01',
          position: index,
        })),
      )
      .returning({ id: habits.id });

    await database.insert(habitCheckIns).values(
      Array.from({ length: 200 }, (_, index) => ({
        habitId: fixtureHabits[index % fixtureHabits.length]!.id,
        userId,
        checkInDate: `2026-06-${Math.floor(index / 50 + 1)
          .toString()
          .padStart(2, '0')}`,
        completedCount: 1,
      })),
    );
    await database.insert(tasks).values(
      Array.from({ length: 100 }, (_, index) => ({
        userId,
        title: `Fixture task ${index}`,
        dueAt: new Date(
          `2026-07-27T${(index % 16).toString().padStart(2, '0')}:00:00Z`,
        ),
      })),
    );
    const fixtureGoals = await database
      .insert(goals)
      .values(
        Array.from({ length: 20 }, (_, index) => ({
          userId,
          title: `Fixture goal ${index}`,
          targetDate: '2026-12-31',
        })),
      )
      .returning({ id: goals.id });
    await database.insert(goalSteps).values(
      Array.from({ length: 100 }, (_, index) => ({
        goalId: fixtureGoals[index % fixtureGoals.length]!.id,
        title: `Fixture step ${index}`,
        isCompleted: index % 2 === 0,
      })),
    );

    const startedAt = performance.now();
    const result = await todayService().getToday({
      userId,
      date: '2026-07-27',
    });
    const elapsed = performance.now() - startedAt;

    expect(result.habits).toHaveLength(50);
    expect(result.tasks.dueToday).toHaveLength(100);
    expect(result.goals).toHaveLength(20);
    expect(elapsed).toBeLessThan(3_000);
    expect(JSON.stringify(result).length).toBeLessThan(1_000_000);
  });

  it('filters, searches, sorts, paginates, and projects habit collections', async () => {
    const userId = await createTestUser();
    const otherUserId = await createTestUser();
    await database
      .insert(userPreferences)
      .values({ userId, timezone: 'Asia/Jakarta' });
    const [category] = await database
      .insert(categories)
      .values({ userId, name: 'Health' })
      .returning({ id: categories.id });
    const [foreignCategory] = await database
      .insert(categories)
      .values({ userId: otherUserId, name: 'Private' })
      .returning({ id: categories.id });
    if (!category || !foreignCategory)
      throw new Error('Category fixture failed.');

    const rows = await database
      .insert(habits)
      .values([
        {
          userId,
          categoryId: category.id,
          name: 'Alpha Daily',
          description: 'Morning routine',
          frequencyType: 'daily',
          targetCount: 2,
          startDate: '2026-07-27',
          endDate: '2026-07-27',
          position: 2,
        },
        {
          userId,
          name: 'beta weekly',
          description: 'READING practice',
          frequencyType: 'weekly',
          startDate: '2026-01-01',
          position: 1,
        },
        {
          userId,
          name: 'Custom Tuesday',
          frequencyType: 'custom',
          startDate: '2026-01-01',
          position: 3,
        },
        {
          userId,
          name: 'Inactive',
          frequencyType: 'daily',
          startDate: '2026-01-01',
          isActive: false,
        },
        {
          userId,
          name: 'Deleted',
          frequencyType: 'daily',
          startDate: '2026-01-01',
          deletedAt: new Date(),
        },
        {
          userId: otherUserId,
          categoryId: foreignCategory.id,
          name: 'Other owner',
          frequencyType: 'daily',
          startDate: '2026-01-01',
        },
      ])
      .returning({ id: habits.id, name: habits.name });
    const idFor = (name: string) => rows.find((row) => row.name === name)?.id;
    const dailyId = idFor('Alpha Daily');
    const weeklyId = idFor('beta weekly');
    const customId = idFor('Custom Tuesday');
    if (!dailyId || !weeklyId || !customId)
      throw new Error('Habit fixture failed.');

    await database.insert(habitSchedules).values([
      { habitId: weeklyId, dayOfWeek: 1 },
      { habitId: weeklyId, dayOfWeek: 3 },
      { habitId: customId, dayOfWeek: 2 },
    ]);
    await database.insert(habitCheckIns).values({
      habitId: dailyId,
      userId,
      checkInDate: '2026-07-27',
      completedCount: 2,
    });

    const base = {
      userId,
      date: '2026-07-27',
      view: 'today' as const,
      search: '',
      sort: 'position' as const,
      order: 'asc' as const,
      page: 1,
      limit: 20,
    };
    const [today, all, inactive, searched, secondPage] = await Promise.all([
      habitService().list({ userId }, base),
      habitService().list(
        { userId },
        { ...base, view: 'all', sort: 'name', order: 'desc' },
      ),
      habitService().list({ userId }, { ...base, view: 'inactive' }),
      habitService().list(
        { userId },
        { ...base, view: 'all', search: '  reading  ' },
      ),
      habitService().list(
        { userId },
        { ...base, view: 'all', page: 2, limit: 2 },
      ),
    ]);

    expect(today.items.map((item) => item.name)).toEqual([
      'beta weekly',
      'Alpha Daily',
    ]);
    expect(today.items.find((item) => item.id === dailyId)).toMatchObject({
      category: { name: 'Health' },
      selectedDate: {
        isScheduled: true,
        completedCount: 2,
        isCompleted: true,
      },
    });
    expect(
      today.items.find((item) => item.id === weeklyId)?.schedule.weekdays,
    ).toEqual([1, 3]);
    expect(all.items.map((item) => item.name)).toEqual([
      'Inactive',
      'Custom Tuesday',
      'beta weekly',
      'Alpha Daily',
    ]);
    expect(inactive.items.map((item) => item.name)).toEqual(['Inactive']);
    expect(searched.items.map((item) => item.name)).toEqual(['beta weekly']);
    expect(secondPage.items).toHaveLength(2);
    expect(secondPage.pagination).toMatchObject({
      totalItems: 4,
      totalPages: 2,
      hasPreviousPage: true,
      hasNextPage: false,
    });
    expect(JSON.stringify([today, all, inactive])).not.toContain('Other owner');
    expect(JSON.stringify([today, all, inactive])).not.toContain('Private');
  });

  it('returns owned habit details and hides foreign or deleted habits', async () => {
    const userId = await createTestUser();
    const otherUserId = await createTestUser();
    await database
      .insert(userPreferences)
      .values({ userId, timezone: 'Pacific/Kiritimati' });
    const inserted = await database
      .insert(habits)
      .values([
        {
          userId,
          name: 'Owned weekly',
          frequencyType: 'weekly',
          startDate: '2026-01-01',
        },
        {
          userId,
          name: 'Deleted owned',
          frequencyType: 'daily',
          startDate: '2026-01-01',
          deletedAt: new Date(),
        },
        {
          userId: otherUserId,
          name: 'Foreign',
          frequencyType: 'daily',
          startDate: '2026-01-01',
        },
      ])
      .returning({ id: habits.id, name: habits.name });
    const ownedId = inserted.find((item) => item.name === 'Owned weekly')!.id;
    await database
      .insert(habitSchedules)
      .values({ habitId: ownedId, dayOfWeek: 1 });

    const detail = await habitService().detail(
      { userId, now: new Date('2026-07-26T12:30:00Z') },
      ownedId,
    );

    expect(detail).toMatchObject({
      name: 'Owned weekly',
      timezone: 'Pacific/Kiritimati',
      today: { date: '2026-07-27', isScheduled: true, completedCount: 0 },
      schedule: { weekdays: [1] },
    });
    await expect(
      habitService().detail(
        { userId },
        inserted.find((item) => item.name === 'Foreign')!.id,
      ),
    ).rejects.toMatchObject({ statusCode: 404 });
    await expect(
      habitService().detail(
        { userId },
        inserted.find((item) => item.name === 'Deleted owned')!.id,
      ),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('keeps a 100-habit collection bounded and deterministic', async () => {
    const userId = await createTestUser();
    await database.insert(userPreferences).values({ userId, timezone: 'UTC' });
    await database.insert(habits).values(
      Array.from({ length: 100 }, (_, index) => ({
        userId,
        name: `Performance habit ${index.toString().padStart(3, '0')}`,
        frequencyType: 'daily' as const,
        startDate: '2026-01-01',
        position: Math.floor(index / 2),
      })),
    );

    const startedAt = performance.now();
    const [firstPage, secondPage] = await Promise.all([
      habitService().list(
        { userId },
        {
          view: 'all',
          date: '2026-07-27',
          search: '',
          sort: 'position',
          order: 'asc',
          page: 1,
          limit: 20,
        },
      ),
      habitService().list(
        { userId },
        {
          view: 'all',
          date: '2026-07-27',
          search: '',
          sort: 'position',
          order: 'asc',
          page: 2,
          limit: 20,
        },
      ),
    ]);
    const elapsed = performance.now() - startedAt;
    const ids = [...firstPage.items, ...secondPage.items].map(
      (habit) => habit.id,
    );

    expect(firstPage.pagination).toMatchObject({
      totalItems: 100,
      totalPages: 5,
      hasNextPage: true,
    });
    expect(firstPage.items).toHaveLength(20);
    expect(secondPage.items).toHaveLength(20);
    expect(new Set(ids).size).toBe(40);
    expect(JSON.stringify(firstPage).length).toBeLessThan(100_000);
    expect(elapsed).toBeLessThan(3_000);
  });

  it('creates daily, weekly, and custom habits atomically', async () => {
    const userId = await createTestUser();
    const otherUserId = await createTestUser();
    const [category] = await database
      .insert(categories)
      .values({ userId, name: 'Owned category' })
      .returning({ id: categories.id });
    const [foreignCategory] = await database
      .insert(categories)
      .values({ userId: otherUserId, name: 'Foreign category' })
      .returning({ id: categories.id });
    if (!category || !foreignCategory)
      throw new Error('Category fixture failed.');

    const daily = await habitCommandService().create(userId, {
      name: '  Daily habit  ',
      categoryId: category.id,
      frequencyType: 'daily',
      startDate: '2026-01-01',
      weekdays: [1, 2],
    });
    const weekly = await habitCommandService().create(userId, {
      name: 'Weekly habit',
      frequencyType: 'weekly',
      startDate: '2026-01-01',
      weekdays: [5, 1, 3],
    });
    const custom = await habitCommandService().create(userId, {
      name: 'Custom habit',
      frequencyType: 'custom',
      startDate: '2026-01-01',
      weekdays: [4, 2],
      isActive: false,
    });

    expect(daily).toMatchObject({
      name: 'Daily habit',
      categoryId: category.id,
      weekdays: [],
      targetCount: 1,
      isActive: true,
    });
    expect(weekly.weekdays).toEqual([1, 3, 5]);
    expect(custom).toMatchObject({ weekdays: [2, 4], isActive: false });
    expect(
      await database.$count(
        habitSchedules,
        eq(habitSchedules.habitId, daily.id),
      ),
    ).toBe(0);

    await expect(
      habitCommandService().create(userId, {
        name: 'Leaking category',
        categoryId: foreignCategory.id,
        frequencyType: 'daily',
        startDate: '2026-01-01',
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('updates mutable fields and replaces schedules transactionally', async () => {
    const userId = await createTestUser();
    const otherUserId = await createTestUser();
    const created = await habitCommandService().create(userId, {
      name: 'Original',
      frequencyType: 'weekly',
      startDate: '2026-01-01',
      weekdays: [1, 3],
    });

    const partial = await habitCommandService().update(userId, created.id, {
      name: '  Updated  ',
    });
    const custom = await habitCommandService().update(userId, created.id, {
      frequencyType: 'custom',
      weekdays: [6, 2],
    });
    const daily = await habitCommandService().update(userId, created.id, {
      frequencyType: 'daily',
    });

    expect(partial).toMatchObject({ name: 'Updated', weekdays: [1, 3] });
    expect(custom).toMatchObject({
      frequencyType: 'custom',
      weekdays: [2, 6],
    });
    expect(daily).toMatchObject({ frequencyType: 'daily', weekdays: [] });
    expect(
      await database.$count(
        habitSchedules,
        eq(habitSchedules.habitId, created.id),
      ),
    ).toBe(0);
    await expect(
      habitCommandService().update(otherUserId, created.id, { name: 'Nope' }),
    ).rejects.toMatchObject({ statusCode: 404 });

    await database
      .update(habits)
      .set({ deletedAt: new Date() })
      .where(eq(habits.id, created.id));
    await expect(
      habitCommandService().update(userId, created.id, { name: 'Nope' }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('soft deletes once and removes the habit from public reads', async () => {
    const userId = await createTestUser();
    const created = await habitCommandService().create(userId, {
      name: 'Delete me',
      frequencyType: 'weekly',
      startDate: '2026-01-01',
      weekdays: [1],
    });

    await habitCommandService().softDelete(userId, created.id);
    const collection = await habitService().list(
      { userId },
      {
        view: 'all',
        date: '2026-07-27',
        search: '',
        sort: 'position',
        order: 'asc',
        page: 1,
        limit: 20,
      },
    );

    expect(collection.items).toEqual([]);
    expect(
      await database.$count(
        habitSchedules,
        eq(habitSchedules.habitId, created.id),
      ),
    ).toBe(1);
    await expect(
      habitCommandService().softDelete(userId, created.id),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('activates and deactivates with conflict and ownership protection', async () => {
    const userId = await createTestUser();
    const otherUserId = await createTestUser();
    const created = await habitCommandService().create(userId, {
      name: 'Stateful',
      frequencyType: 'daily',
      startDate: '2026-01-01',
      isActive: false,
    });

    expect(await habitCommandService().activate(userId, created.id)).toEqual({
      id: created.id,
      isActive: true,
    });
    await expect(
      habitCommandService().activate(userId, created.id),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(await habitCommandService().deactivate(userId, created.id)).toEqual({
      id: created.id,
      isActive: false,
    });
    await expect(
      habitCommandService().deactivate(userId, created.id),
    ).rejects.toMatchObject({ statusCode: 409 });
    await expect(
      habitCommandService().activate(otherUserId, created.id),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('rolls back the habit insert when schedule persistence fails', async () => {
    const userId = await createTestUser();
    const repository = createHabitCommandRepository(database);

    await expect(
      repository.createAtomic(userId, {
        name: 'Rollback habit',
        description: null,
        categoryId: null,
        frequencyType: 'weekly',
        targetCount: 1,
        startDate: '2026-01-01',
        endDate: null,
        isActive: true,
        weekdays: [8],
      }),
    ).rejects.toBeDefined();

    expect(
      await database.$count(
        habits,
        and(eq(habits.userId, userId), eq(habits.name, 'Rollback habit')),
      ),
    ).toBe(0);
  });
});
