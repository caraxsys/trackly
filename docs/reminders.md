# Reminder backend foundation

Reminders are user-owned, local-time prompts nested under a Habit. A Habit can
have multiple reminders. Reminders follow the Habit schedule; they do not own
recurrence and do not store a next-run timestamp.

## Ownership and lifecycle

Every query and mutation is scoped by the authenticated `user_id`, `habit_id`,
and, for item operations, reminder `id`. Ownership identifiers are never
accepted from request bodies.

Archived Habits retain readable and editable reminders, but those reminders are
not eligible for future delivery. Reminders belonging to deleted or foreign
Habits are hidden behind the same safe `404` response.

Deleting a reminder sets `deleted_at`. It does not physically remove the row.
The same time can be recreated after deletion.

## Time and timezone

`timeOfDay` uses strict 24-hour `HH:mm` syntax, from `00:00` through `23:59`.
Values such as `24:00`, `12:60`, `8:30`, and `08:3` are invalid.

Reminder times are interpreted using the authenticated user's User Preferences
timezone. List responses return the resolved timezone once. Missing or invalid
legacy preference values use the existing safe UTC fallback.

## API

All routes require authentication:

- `GET /api/v1/habits/:habitId/reminders`
- `POST /api/v1/habits/:habitId/reminders`
- `PATCH /api/v1/habits/:habitId/reminders/:reminderId`
- `DELETE /api/v1/habits/:habitId/reminders/:reminderId`

List results are ordered by `timeOfDay ASC` with an ID tie-breaker. Creation
defaults `isEnabled` to `true`. Patch requests are partial but cannot be empty.
Unknown and ownership fields are rejected.

Only one non-deleted reminder may use a given
`(user_id, habit_id, time_of_day)` combination. Both service validation and a
PostgreSQL partial unique index enforce this rule; duplicate requests return
`409`.

## Future scope

This foundation does not include a scheduler, cron job, worker, notification
delivery, delivery history, `nextRunAt`, or frontend reminder interface. A
future milestone can evaluate enabled reminders against the Habit schedule and
the resolved user timezone without changing reminder recurrence ownership.
