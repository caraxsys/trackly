# Today query layer

Milestone 2.0 provides authenticated, read-only query foundations for the
future Today Dashboard. It does not implement dashboard UI or domain writes.

## Request flow

`GET /api/v1/today` passes through four layers:

1. The route validates the optional `date` query with Zod.
2. The controller obtains the Better Auth user ID and formats the standard
   response envelope.
3. The service resolves timezone/date semantics and creates the summary.
4. Repositories perform user-scoped Drizzle queries.

Routes and controllers contain no database queries. The Today service runs one
preferences lookup followed by three parallel, bounded queries for habits,
tasks, and goals. Category metadata is joined into those queries. There are no
per-record lookups.

## Authentication and ownership

The user ID always comes from `requireUserId()`. It is never accepted from
request input. Every base query includes a direct `user_id` predicate.
Check-ins and category joins include their own ownership predicates as defense
in depth. Soft-deleted records are excluded, and soft-deleted categories appear
as `null`.

`GET /api/v1/categories` returns only the authenticated user's non-deleted
categories, sorted by name, creation time, and ID.

## Date and timezone semantics

When `date` is absent, Today loads `user_preferences.timezone` and calculates
the user's local date. Missing preferences fall back to UTC. Invalid stored
IANA identifiers are logged without exposing the invalid value and also fall
back to UTC.

The optional date must be a real `YYYY-MM-DD` calendar date. Timestamps,
shortened formats, and impossible dates are rejected.

PostgreSQL `date` columns represent logical calendar dates and are compared
directly. `due_at` and `completed_at` are timezone-aware instants. The query
layer converts the requested local calendar day to a half-open instant range:

```text
[local midnight, next local midnight)
```

The boundaries are DST-aware and do not assume every day is 24 hours.

## Habit semantics

A habit is included when it is owned, active, not deleted, inside its date
range, and scheduled:

- `daily`: every in-range day;
- `weekly`: a matching ISO weekday schedule row exists;
- `custom`: the same weekday schedule semantics for this milestone.

The unique check-in for the date is left-joined. A missing check-in produces
`completedCount = 0`. `isCompleted` is derived as
`completedCount >= targetCount`. Results sort by position, creation time, then
ID.

## Task groups

Groups are mutually exclusive:

- `overdue`: incomplete, non-cancelled tasks due before local-day start;
- `dueToday`: incomplete, non-cancelled tasks due inside the local day;
- `completedToday`: completed tasks whose `completed_at` is inside the day.

A task completed today is placed only in `completedToday`, even if its due time
was earlier. Overdue sorts by due time, explicit priority rank, position, then
ID. Due-today sorts by priority, due time, position, then ID. Completed tasks
sort by completion time descending.

## Goal semantics

Only owned, active, non-deleted goals that have started are returned. Goal-step
counts are aggregated in SQL. `progressPercentage` is rounded from completed
steps divided by total steps and is zero for goals without steps. Goals with a
target date sort first by target date, then position, creation time, and ID.

## Summary

Goals do not participate in daily completion. Overdue tasks do count as daily
actionable items.

```text
completedItems = completed habits + tasks completed today
totalItems = scheduled habits + overdue tasks + due-today tasks
             + tasks completed today
completionPercentage = round(completedItems / totalItems * 100)
```

An empty account returns HTTP 200 with valid date/timezone values, empty
collections, and zero totals.

## API example

```http
GET /api/v1/today?date=2026-07-27
Cookie: better-auth.session_token=...
```

```json
{
  "success": true,
  "data": {
    "date": "2026-07-27",
    "timezone": "Asia/Jakarta",
    "habits": [],
    "tasks": {
      "overdue": [],
      "dueToday": [],
      "completedToday": []
    },
    "goals": [],
    "summary": {
      "habitsTotal": 0,
      "habitsCompleted": 0,
      "tasksDueToday": 0,
      "tasksCompletedToday": 0,
      "overdueTasks": 0,
      "activeGoals": 0,
      "completedItems": 0,
      "totalItems": 0,
      "completionPercentage": 0
    }
  }
}
```

## Performance and future frontend use

The realistic integration fixture contains 50 habits, 200 check-ins, 100
tasks, 20 goals, and 100 goal steps. Response construction remains a fixed
number of queries and selects only response fields. No benchmark data is placed
in seed files.

The frontend has only a typed response contract and `todayService.getToday()`.
Future dashboard widgets should consume that service rather than reproduce
schedule, timezone, or summary logic.
