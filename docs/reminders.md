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
delivery, delivery history, or `nextRunAt`.

## Eligibility engine

The internal eligibility engine evaluates Reminders for one explicitly supplied
instant. It does not call `Date.now()` and does not expose a public HTTP route.
An eligible Reminder must satisfy every condition:

- the Reminder is enabled and not soft-deleted;
- its parent Habit is active and not soft-deleted;
- the Habit is scheduled on the resolved local calendar date;
- its `time_of_day` exactly matches the resolved local `HH:mm`.

Habit recurrence remains the only recurrence source. The engine reuses the
canonical Habit date-range, frequency, and weekday evaluator, so non-scheduled
dates never qualify. Archiving excludes the Habit immediately; restoring it
allows its preserved Reminders to qualify again under the normal rules.

### Local wall-clock and timezone semantics

`time_of_day` is a local wall-clock value, not UTC. At the same instant,
`08:00` can match one user while another user's local date and time differ.
Each candidate uses the timezone stored in User Preferences. Missing or invalid
legacy values use the existing UTC fallback.

The runtime's `Intl.DateTimeFormat` IANA timezone data defines daylight-saving
behavior. A spring-forward time that does not occur cannot match a scheduler
tick. A repeated fall-back time can match twice because eligibility is evaluated
independently for each instant.

### Candidate query strategy

Eligibility uses two set-based reads:

1. Resolve the distinct stored timezone groups, always including UTC fallback.
2. Query enabled, non-deleted Reminders joined to active, non-deleted Habits and
   User Preferences, restricted to the relevant local `HH:mm` values.

Habit weekdays are aggregated in the candidate query, avoiding per-Habit or
per-user lookups and preventing duplicate results from schedule joins.
Candidates have deterministic ordering, then undergo pure schedule evaluation
in application code.

### Delivery boundary

Eligibility is not delivery and does not guarantee exactly-once behavior. A
future delivery milestone must define repeated tick handling, overlapping
workers, DST repeated-hour deduplication, retry safety, delivery records, and
at-least-once or exactly-once semantics. This engine adds no sent markers,
locks, leases, queue abstractions, provider integrations, cron deployment, or
worker process.

## Scheduler runtime

The dedicated Reminder scheduler process executes the eligibility engine without
starting the HTTP server:

```bash
pnpm --filter backend scheduler:reminders
```

A shared one-shot mode runs one normalized tick, reports aggregate results,
closes the database connection, and exits:

```bash
pnpm --filter backend scheduler:reminders:once
```

Production build equivalents use `scheduler:reminders:start` and
`scheduler:reminders:start:once`.

### One-tick contract

The runner accepts an explicit instant, normalizes seconds and milliseconds to
zero, delegates to the existing eligibility service, and returns:

- start and completion timestamps;
- the normalized tick instant;
- duration;
- status;
- eligible count;
- eligible internal records.

Eligible records are returned only to internal runtime code. Logs contain
aggregate counts and duration, not Reminder payloads, user IDs, email addresses,
or preference data.

### Recurring loop

The first tick is scheduled for the next real minute boundary. After each timer
fires, the next boundary is recalculated instead of maintaining an interval
relative to process startup. A tick evaluates only its normalized minute
instant; it does not scan the prior minute and does not catch up missed ticks.

Only one tick may run at a time within a scheduler process. If the prior tick is
still running, the overlapping tick is skipped and an aggregate warning is
logged. This is in-process protection only: there is no distributed lock,
lease, leader election, or cross-process coordination.

An individual tick failure produces a sanitized failed result and log event.
The recurring loop continues at the next minute without an immediate retry or
persisted retry state.

SIGINT and SIGTERM stop future timers, allow the active tick to settle, close
the PostgreSQL connection, and emit shutdown events. Unrecoverable startup
failure closes initialized resources and exits non-zero.

Structured events are:

- `reminder_scheduler_started`
- `reminder_scheduler_tick_started`
- `reminder_scheduler_tick_completed`
- `reminder_scheduler_tick_failed`
- `reminder_scheduler_tick_skipped`
- `reminder_scheduler_stopping`
- `reminder_scheduler_stopped`
- `reminder_scheduler_startup_failed`

The scheduler currently determines which Reminders are eligible. It does not
send notifications. It provides no exactly-once guarantee, delivery retry,
history, or repeated-hour deduplication; those responsibilities remain in a
future delivery milestone.

## Notification delivery foundation

Eligible Reminder occurrences now enter a provider-neutral delivery pipeline:

```text
Scheduler runner
  → eligibility service
  → delivery coordinator
  → durable occurrence claim
  → dispatcher
  → Noop provider
  → terminal delivery status
```

The delivery layer does not own eligibility, Habit schedules, timezone
resolution, or scheduler timing. It receives the canonical eligible occurrence
produced by the scheduling domain.

### Occurrence identity and deduplication

An occurrence contains the Reminder ID, canonical timezone, local calendar
date, and canonical local `HH:mm`. Its versioned key is encoded as an
unambiguous JSON tuple:

```text
[1, reminderId, timezone, scheduledLocalDate, scheduledLocalTime]
```

The key contains no process ID, server timestamp, random value, provider, or
attempt number. PostgreSQL enforces a unique occurrence key. Atomic
`ON CONFLICT DO NOTHING` claims ensure that concurrent processes resolve the
same occurrence record and only the successful claimant can invoke a provider.
Process restarts and repeated ticks therefore do not create another record or
dispatch an already claimed occurrence.

The current schema models one delivery record per logical occurrence,
independent of provider. Multi-channel fan-out may later evolve toward a
separate occurrence record and channel-attempt records.

### Delivery lifecycle

Statuses are:

- `pending`: the occurrence is durably claimed;
- `processing`: provider invocation is being attempted;
- `delivered`: the provider contract returned success;
- `failed`: provider or orchestration execution failed;
- `skipped`: a claimed occurrence was intentionally not dispatched.

Allowed automatic transitions are `pending → processing`,
`processing → delivered`, `processing → failed`, and `pending → skipped`.
Conditional database updates prevent terminal `delivered` or `skipped` records
from returning to processing or being overwritten. Failed deliveries are not
automatically retried.

`attempt_count` starts at zero and increments when a pending record enters
processing. For the Noop provider, `delivered` means only that the provider
contract completed successfully.

### Provider and dispatcher boundary

Providers receive only delivery and occurrence identifiers, local scheduling
values, timezone, and minimal title/body content. The dispatcher uses an
explicit provider registry and never falls back for unsupported names.

`NoopNotificationProvider` is the only provider in this foundation. It performs
no network or external I/O, returns deterministic success, and logs no content
payload. The Noop provider performs no external delivery. A `delivered` Noop
record only confirms that the delivery pipeline and provider contract completed
successfully.

### Scheduler aggregation and failures

The scheduler processes eligible occurrences sequentially. Aggregate tick
results distinguish eligible, newly claimed, delivered, failed, duplicate, and
skipped counts. A claim or provider failure for one occurrence does not prevent
remaining occurrences from being processed. Eligibility-query failure still
fails the entire tick.

No automatic retry, retry backoff, delivery queue, dead-letter queue,
distributed lock, provider message ID, `delivered_at`, `read_at`, click
tracking, Web Push, subscription, service worker, or frontend notification flow
exists. Future milestones can add Web Push behind the dispatcher contract and
define retry and richer history semantics without moving eligibility logic into
the delivery domain.
