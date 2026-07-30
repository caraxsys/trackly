import postgres from 'postgres';

import {
  demoIds,
  docsDatabaseUrl,
  docsTimezone,
  docsUserEmail,
} from './constants';

function calendarDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return calendarDate(value);
}

function localToday(timezone: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function verifySafety() {
  const emailDomain = docsUserEmail.toLowerCase().endsWith('@trackly.local');
  if (!emailDomain) {
    throw new Error(
      'DOCS_USER_EMAIL must use the reserved @trackly.local domain.',
    );
  }

  const hostname = new URL(docsDatabaseUrl).hostname;
  const localDatabase = ['localhost', '127.0.0.1', '::1'].includes(hostname);
  if (
    !localDatabase &&
    process.env.DOCS_ALLOW_DATABASE_RESET?.toLowerCase() !== 'true'
  ) {
    throw new Error(
      'Refusing a non-local DOCS_DATABASE_URL. Set DOCS_ALLOW_DATABASE_RESET=true only for an isolated documentation database.',
    );
  }
}

export async function seedDocumentationData() {
  verifySafety();
  const sql = postgres(docsDatabaseUrl, {
    max: 1,
    connect_timeout: 10,
    idle_timeout: 2,
  });

  try {
    const users = await sql<{ id: string }[]>`
      select id
      from "user"
      where lower(email) = lower(${docsUserEmail})
      limit 1
    `;
    const userId = users[0]?.id;
    if (!userId) {
      throw new Error(
        `Documentation user ${docsUserEmail} does not exist. Authenticate through the registration flow first.`,
      );
    }

    const today = localToday(docsTimezone);
    const startDate = addDays(today, -120);
    const goalEndDate = addDays(today, 180);
    const categoryRows = [
      [demoIds.categories.health, 'Health', '#16a34a', 'heart-pulse'],
      [demoIds.categories.learning, 'Learning', '#2563eb', 'book-open'],
      [demoIds.categories.productivity, 'Productivity', '#9333ea', 'sparkles'],
    ] as const;
    const habitRows = [
      [
        demoIds.habits.morningRun,
        demoIds.categories.health,
        'Morning Run',
        'Start the day with an energizing outdoor run.',
        1,
        0,
      ],
      [
        demoIds.habits.readPages,
        demoIds.categories.learning,
        'Read 20 Pages',
        'Make steady progress through the current reading list.',
        20,
        1,
      ],
      [
        demoIds.habits.drinkWater,
        demoIds.categories.health,
        'Drink Water',
        'Stay hydrated with eight glasses throughout the day.',
        8,
        2,
      ],
      [
        demoIds.habits.planTomorrow,
        demoIds.categories.productivity,
        'Plan Tomorrow',
        'Close the day by choosing tomorrow’s three priorities.',
        1,
        3,
      ],
    ] as const;

    await sql.begin(async (transaction) => {
      await transaction`
        update user_preferences
        set timezone = ${docsTimezone},
            week_starts_on = 1,
            date_format = 'dd/MM/yyyy',
            time_format = '24h',
            theme = 'light',
            updated_at = now()
        where user_id = ${userId}
      `;

      for (const [id, name, color, icon] of categoryRows) {
        await transaction`
          insert into categories (id, user_id, name, color, icon)
          values (${id}, ${userId}, ${name}, ${color}, ${icon})
          on conflict (id) do update
          set user_id = excluded.user_id,
              name = excluded.name,
              color = excluded.color,
              icon = excluded.icon,
              deleted_at = null,
              updated_at = now()
        `;
      }

      for (const [
        id,
        categoryId,
        name,
        description,
        targetCount,
        position,
      ] of habitRows) {
        await transaction`
          insert into habits (
            id, user_id, category_id, name, description, frequency_type,
            target_count, start_date, is_active, position
          )
          values (
            ${id}, ${userId}, ${categoryId}, ${name}, ${description}, 'daily',
            ${targetCount}, ${startDate}, true, ${position}
          )
          on conflict (id) do update
          set user_id = excluded.user_id,
              category_id = excluded.category_id,
              name = excluded.name,
              description = excluded.description,
              frequency_type = excluded.frequency_type,
              target_count = excluded.target_count,
              start_date = excluded.start_date,
              end_date = null,
              is_active = true,
              position = excluded.position,
              deleted_at = null,
              updated_at = now()
        `;
      }

      await transaction`
        delete from habit_check_ins
        where user_id = ${userId}
          and habit_id = any(${[
            demoIds.habits.morningRun,
            demoIds.habits.readPages,
            demoIds.habits.drinkWater,
            demoIds.habits.planTomorrow,
          ]}::uuid[])
      `;

      for (let offset = -89; offset <= 0; offset += 1) {
        const date = addDays(today, offset);
        const ordinal = offset + 89;
        const progress = [
          [demoIds.habits.morningRun, ordinal % 6 === 0 ? 0 : 1],
          [demoIds.habits.readPages, ordinal % 4 === 0 ? 12 : 20],
          [demoIds.habits.drinkWater, 4 + (ordinal % 5)],
          [demoIds.habits.planTomorrow, ordinal % 3 === 0 ? 0 : 1],
        ] as const;

        for (const [habitId, completedCount] of progress) {
          if (completedCount === 0) continue;
          await transaction`
            insert into habit_check_ins (
              habit_id, user_id, check_in_date, completed_count
            )
            values (${habitId}, ${userId}, ${date}, ${completedCount})
          `;
        }
      }

      await transaction`
        insert into goals (
          id, user_id, habit_id, name, title, description, target_count,
          start_date, end_date, target_date, category_id, status, position
        )
        values (
          ${demoIds.goals.workouts}, ${userId}, ${demoIds.habits.morningRun},
          'Complete 100 Workouts', 'Complete 100 Workouts',
          'Build a sustainable year-round training routine.', 100,
          ${startDate}, ${goalEndDate}, ${goalEndDate},
          ${demoIds.categories.health}, 'active', 0
        )
        on conflict (id) do update
        set user_id = excluded.user_id,
            habit_id = excluded.habit_id,
            name = excluded.name,
            title = excluded.title,
            description = excluded.description,
            target_count = excluded.target_count,
            start_date = excluded.start_date,
            end_date = excluded.end_date,
            target_date = excluded.target_date,
            category_id = excluded.category_id,
            status = 'active',
            position = excluded.position,
            completed_at = null,
            deleted_at = null,
            updated_at = now()
      `;
      await transaction`
        insert into goals (
          id, user_id, habit_id, name, title, description, target_count,
          start_date, end_date, target_date, category_id, status, position
        )
        values (
          ${demoIds.goals.books}, ${userId}, ${demoIds.habits.readPages},
          'Read 12 Books', 'Read 12 Books',
          'Finish a balanced collection of twelve books.', 1800,
          ${startDate}, ${goalEndDate}, ${goalEndDate},
          ${demoIds.categories.learning}, 'active', 1
        )
        on conflict (id) do update
        set user_id = excluded.user_id,
            habit_id = excluded.habit_id,
            name = excluded.name,
            title = excluded.title,
            description = excluded.description,
            target_count = excluded.target_count,
            start_date = excluded.start_date,
            end_date = excluded.end_date,
            target_date = excluded.target_date,
            category_id = excluded.category_id,
            status = 'active',
            position = excluded.position,
            completed_at = null,
            deleted_at = null,
            updated_at = now()
      `;

      const goalStepRows = [
        [
          demoIds.goalSteps.workoutPlan,
          demoIds.goals.workouts,
          'Choose weekly training days',
          true,
          0,
        ],
        [
          demoIds.goalSteps.firstWorkouts,
          demoIds.goals.workouts,
          'Complete the first 25 workouts',
          true,
          1,
        ],
        [
          demoIds.goalSteps.recoveryReview,
          demoIds.goals.workouts,
          'Review the recovery plan',
          false,
          2,
        ],
        [
          demoIds.goalSteps.readingList,
          demoIds.goals.books,
          'Build the reading list',
          true,
          0,
        ],
        [
          demoIds.goalSteps.firstBooks,
          demoIds.goals.books,
          'Finish the first four books',
          true,
          1,
        ],
        [
          demoIds.goalSteps.readingNotes,
          demoIds.goals.books,
          'Publish the reading notes',
          false,
          2,
        ],
      ] as const;

      for (const [id, goalId, title, isCompleted, position] of goalStepRows) {
        await transaction`
          insert into goal_steps (
            id, goal_id, title, is_completed, completed_at, position
          )
          values (
            ${id}, ${goalId}, ${title}, ${isCompleted},
            ${isCompleted ? new Date() : null}, ${position}
          )
          on conflict (id) do update
          set goal_id = excluded.goal_id,
              title = excluded.title,
              is_completed = excluded.is_completed,
              completed_at = excluded.completed_at,
              position = excluded.position,
              updated_at = now()
        `;
      }

      await transaction`
        insert into reminders (
          id, user_id, habit_id, time_of_day, is_enabled
        )
        values (
          ${demoIds.reminders.morningRun}, ${userId},
          ${demoIds.habits.morningRun}, '06:30:00', true
        )
        on conflict (id) do update
        set user_id = excluded.user_id,
            habit_id = excluded.habit_id,
            time_of_day = excluded.time_of_day,
            is_enabled = true,
            deleted_at = null,
            updated_at = now()
      `;
      await transaction`
        insert into reminders (
          id, user_id, habit_id, time_of_day, is_enabled
        )
        values (
          ${demoIds.reminders.readPages}, ${userId},
          ${demoIds.habits.readPages}, '20:00:00', true
        )
        on conflict (id) do update
        set user_id = excluded.user_id,
            habit_id = excluded.habit_id,
            time_of_day = excluded.time_of_day,
            is_enabled = true,
            deleted_at = null,
            updated_at = now()
      `;
    });

    console.info(
      `Prepared deterministic documentation data for ${docsUserEmail} (${today}, ${docsTimezone}).`,
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}
