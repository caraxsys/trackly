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

The scheduler determines which Reminders are eligible and passes those
occurrences to the provider-neutral delivery pipeline. It does not contain
provider implementation details. Durable occurrence claims prevent duplicate
dispatch, but there is no automatic retry, distributed lock, or catch-up scan.

## Notification delivery foundation

Eligible Reminder occurrences now enter a provider-neutral delivery pipeline:

```text
Scheduler runner
  → eligibility service
  → delivery coordinator
  → durable occurrence claim
  → dispatcher
  → explicitly selected provider
      → Noop provider, or
      → Web Push provider
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
`processing → delivered`, `processing → failed`, and `processing → skipped`.
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

The dispatcher registers `noop` and `web_push` explicitly and never falls back
between them. `NoopNotificationProvider` performs no network or external I/O,
returns deterministic success, and logs no content payload. A `delivered` Noop
record only confirms that the provider contract completed successfully.

## Web Push backend

The Web Push provider implements the existing provider contract using standard
browser Web Push and VAPID:

```text
Delivery coordinator
  → provider dispatcher
  → WebPushNotificationProvider
  → active push subscriptions
  → browser push services
```

The scheduler, eligibility engine, and coordinator do not import Web Push
library types or subscription storage. When complete VAPID configuration is
available, scheduler composition registers both providers and explicitly
selects `web_push`. Without Web Push configuration, non-production scheduler
runs retain the Noop provider. Production environment validation requires all
Web Push configuration.

### VAPID configuration

Generate a VAPID key pair with the installed Web Push package:

```bash
pnpm --filter @trackly/backend exec web-push generate-vapid-keys
```

Configure:

```dotenv
WEB_PUSH_VAPID_PUBLIC_KEY=
WEB_PUSH_VAPID_PRIVATE_KEY=
WEB_PUSH_SUBJECT=mailto:admin@example.com
```

`WEB_PUSH_SUBJECT` accepts a `mailto:` contact or an HTTPS URL. Never commit the
private key or expose it through an API or log. Invalid key material fails Web
Push provider initialization with a public configuration error.

### Subscription API and lifecycle

All endpoints require the authenticated Better Auth session and are under
`/api/v1`:

- `POST /push-subscriptions` creates, updates, or reactivates an endpoint for
  the current user.
- `GET /push-subscriptions` lists only the current user's active subscriptions
  with a truncated endpoint identifier and safe metadata.
- `DELETE /push-subscriptions` idempotently soft-deletes the current user's
  matching endpoint.

The POST body contains an HTTPS `endpoint`, `keys.p256dh`, `keys.auth`, and an
optional bounded `userAgent`. User IDs are never accepted from clients. An
active endpoint owned by another user is not reassigned. Multiple endpoints are
supported per user, while a partial unique index prevents two active records
for the same endpoint.

Subscriptions track enabled state, last success and failure instants, and a
non-negative consecutive failure count. Successful delivery resets the failure
count. Transient failures increment it without automatic retry. HTTP 404 and
410 responses permanently invalidate and soft-delete the affected
subscription, preventing future attempts.

API responses never expose subscription key material or full endpoints.
Provider logs omit endpoints, subscription keys, payload bodies, upstream error
messages, and VAPID secrets.

### Multi-subscription delivery semantics

Each active subscription is attempted independently:

- `delivered`: at least one push service accepted the notification;
- `failed`: active subscriptions existed, but all attempts failed;
- `skipped`: no active subscriptions existed.

One failed endpoint does not block the remaining endpoints or later Reminder
occurrences. Duplicate occurrence claims never invoke Web Push again.

The JSON payload contains only a generic Trackly title/body and the notification
type, Habit ID, Reminder ID, scheduled local date, and scheduled local time. It
contains no email address, name, authentication data, subscription secrets, or
other sensitive user information.

### Scheduler aggregation and failures

The scheduler processes eligible occurrences sequentially. Aggregate tick
results distinguish eligible, newly claimed, delivered, failed, duplicate, and
skipped counts. A claim or provider failure for one occurrence does not prevent
remaining occurrences from being processed. Eligibility-query failure still
fails the entire tick.

No automatic retry, retry backoff, delivery queue, dead-letter queue,
distributed lock, provider message ID, `delivered_at`, `read_at`, click
tracking, notification history, or per-channel preference system exists.

## Frontend Web Push

The Preferences page contains a device-specific Notifications section:

```text
NotificationSettings
  → Web Push client service
  → service-worker registration
  → browser PushManager
  → authenticated push-subscription API
```

Browser APIs are isolated in the Web Push client service. Page components
render state and initiate explicit actions; they do not directly register
workers, request permission, or serialize subscriptions.

### Frontend configuration

Only the public VAPID key is exposed to browser code:

```dotenv
NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY=
```

It must correspond to the backend VAPID public key. The private key remains
backend-only. Missing development configuration renders “Configuration
unavailable” rather than throwing or requesting permission.

Web Push requires a secure context. Production must use HTTPS; browsers
normally treat `localhost` as secure for local development.

### Permission lifecycle

Trackly never requests notification permission on page load:

- `default`: the Enable action requests permission after the user clicks it;
- `granted`: Trackly can create or synchronize this device's subscription;
- `denied`: Trackly shows blocked guidance and does not repeatedly request
  permission.

Browser permission cannot be reset programmatically. A user who denied
permission must update the browser or site permission settings manually and
then refresh Trackly's displayed status.

### Enable, disable, and reconciliation

Enabling performs these steps:

1. Validate browser support, secure context, and public-key configuration.
2. Register `/sw.js` with root scope.
3. Request permission only when its current state is `default`.
4. Reuse the existing PushManager subscription or create one with the
   configured application-server key.
5. Serialize the browser-provided endpoint and keys with
   `PushSubscription.toJSON()`.
6. Synchronize the subscription through the authenticated Axios client.
7. Show enabled only after backend synchronization succeeds.

Repeated actions are guarded against concurrent execution. Existing
subscriptions are synchronized instead of recreated.

Disabling first sends the endpoint to the authenticated DELETE API and then
unsubscribes locally. Backend deletion is idempotent. If backend deletion
succeeds but browser cleanup fails, the UI reports a safe partial-cleanup
message. An absent local subscription is already disabled.

When the settings UI opens, granted permission plus an existing local
subscription triggers a lightweight backend synchronization. Trackly does not
request permission or create a subscription during reconciliation. The status
describes only the current browser/device; subscriptions on other devices are
not displayed or deleted.

Expired sessions follow the existing frontend behavior and redirect to login.
No authentication token is stored in or sent to the service worker.

### Service worker behavior

`/sw.js` handles push display and notification clicks without adding Workbox,
offline caching, background sync, or PWA installation behavior.

Valid payloads display their title, body, and non-sensitive reminder data.
Malformed or absent payloads use a generic Trackly fallback. No icon or badge
is configured because the repository does not currently contain an appropriate
notification asset.

Click routing uses a fixed allowlist derived from known notification types.
Habit reminders and unknown payloads route to `/today`. Arbitrary URLs in push
data are ignored. The worker focuses and navigates an existing same-origin
Trackly window when possible or opens a new same-origin window.

### Manual local validation

1. Generate VAPID keys and configure both backend keys, the VAPID subject, and
   the matching frontend public key.
2. Start Trackly on `localhost` or HTTPS and sign in.
3. Open `/settings/preferences`.
4. Confirm no permission prompt appears before clicking Enable notifications.
5. Enable notifications and inspect that the browser creates one subscription
   and Trackly sends one authenticated POST.
6. Refresh the page and confirm the device remains enabled without creating a
   new subscription or prompting again.
7. Disable notifications and confirm the authenticated DELETE precedes local
   unsubscribe.
8. For notification-click testing, use browser developer tools or a controlled
   local push fixture and confirm navigation remains on the `/today` route.

Automated tests mock every PushManager and service-worker operation. They do not
contact a real browser push endpoint.

Browser behavior varies by engine and operating system, and private/incognito
contexts may discard subscriptions. iOS support depends on its installed web
application and browser-version requirements; Trackly does not add installation
UI in this milestone.
