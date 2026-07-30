# Trackly Glossary

## Purpose

Define the product, domain, API, database, and operational terms used throughout
the Trackly repository.

## Status

Completed

## Product and Domain Terms

| Term             | Definition                                                                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Active day       | A local calendar day with at least one scheduled habit occurrence. Analytics excludes days without scheduled occurrences from metrics that require activity. |
| Analytics        | Read-only, user-scoped metrics derived from habit schedules and check-ins. Trackly does not persist analytics aggregates.                                    |
| Category         | A user-owned classification that can organize habits.                                                                                                        |
| Check-in         | An absolute completed-count value for one habit on one logical date. A zero value removes the stored check-in row.                                           |
| Completion rate  | Completed scheduled occurrences divided by scheduled occurrences for the selected range.                                                                     |
| Goal             | A user-owned objective with progress derived from linked goal contributions and configured targets.                                                          |
| Habit            | A recurring, user-owned activity with a target count, schedule, lifecycle state, and optional category.                                                      |
| Habit occurrence | A scheduled instance of a habit on a logical calendar date. Occurrences are derived rather than stored as rows.                                              |
| Logical date     | A PostgreSQL `date` and `YYYY-MM-DD` value interpreted in the authenticated user's timezone, not as a timestamp.                                             |
| Progress rate    | Capped completed-count total divided by target-count total for scheduled occurrences.                                                                        |
| Reminder         | A user-owned schedule associated with a habit and evaluated in the user's timezone.                                                                          |
| Soft delete      | Lifecycle behavior that records `deleted_at` instead of immediately removing a row. Normal public queries exclude soft-deleted records.                      |
| Today            | The authenticated user's current logical date, calculated from their stored timezone with the documented fallback behavior.                                  |

## Authentication and Ownership

| Term            | Definition                                                                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Better Auth     | The authentication library that owns Trackly users, sessions, accounts, verification records, and the `/api/auth/*` contract.                           |
| Protected route | A frontend page or API endpoint that requires a valid Better Auth session.                                                                              |
| Session         | A database-backed Better Auth login session represented to the browser by an HttpOnly cookie.                                                           |
| User isolation  | The rule that every user-owned read and mutation is scoped by the authenticated `user_id`; ownership identifiers are never accepted from request input. |

## API Terms

| Term                    | Definition                                                                                                                   |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Application API         | Public Trackly endpoints under `/api/v1`.                                                                                    |
| Error code              | A stable machine-readable identifier in the standard error envelope.                                                         |
| Infrastructure endpoint | An unversioned operational endpoint such as `/health`, `/ready`, or conditionally exposed `/docs`.                           |
| Request ID              | A validated incoming or generated correlation identifier returned in `x-request-id` and included in structured request logs. |
| Success envelope        | The common `{ "success": true, "data": ..., "meta"?: ... }` response shape.                                                  |
| Error envelope          | The common `{ "success": false, "error": { "code", "message", "details"? } }` response shape.                                |

## Database and Scheduling Terms

| Term                   | Definition                                                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Drizzle ORM            | The TypeScript ORM and migration tooling used with PostgreSQL.                                                                                               |
| Forward-only migration | A reviewed SQL migration applied in order; the repository does not provide generated down migrations.                                                        |
| Eligible occurrence    | A scheduled, non-future habit occurrence that participates in progress, analytics, streak, or reminder rules.                                                |
| Idempotency            | Repeating an operation produces the same durable outcome. Check-ins use absolute values, and reminder delivery claims prevent duplicate occurrence delivery. |
| Scheduler              | A separate backend runtime that evaluates eligible reminders and coordinates provider-neutral notification delivery.                                         |
| UTC instant            | A timezone-aware timestamp used for events and audit metadata, distinct from logical calendar dates.                                                         |

## Notification Terms

| Term                  | Definition                                                                                                                       |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Delivery coordinator  | The provider-neutral component that claims notification occurrences and records delivery lifecycle outcomes.                     |
| Notification provider | An adapter selected by the dispatcher, currently including `noop` and `web_push`.                                                |
| Push subscription     | A user-owned browser endpoint and key set used by standard Web Push. Multiple active devices are supported.                      |
| VAPID                 | The public/private key mechanism used to authenticate Trackly's Web Push sender. Only the public key is exposed to the frontend. |
| Web Push              | Browser notification delivery through a browser push service, without Firebase Cloud Messaging.                                  |

## Runtime and Quality Terms

| Term             | Definition                                                                                                                                                       |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Health check     | `GET /health`; confirms that the backend process is running without querying PostgreSQL.                                                                         |
| Readiness check  | `GET /ready`; confirms PostgreSQL connectivity and returns HTTP 503 when the backend cannot serve database-dependent traffic.                                    |
| Audit event      | A structured log entry for an important authenticated action, containing actor, action, resource, outcome, timestamp, and request ID without sensitive payloads. |
| Redaction        | Removal of credentials, authorization headers, cookies, tokens, secrets, and sensitive fields from logs.                                                         |
| Server Component | The default Next.js component boundary used for authenticated reads and initial rendering.                                                                       |
| Client Component | A focused interactive boundary used only where browser state, events, or browser APIs are required.                                                              |

## Related References

- [API reference](./api-reference.md)
- [Database schema](./database-schema.md)
- [Sequence diagrams](./sequence-diagrams.md)
- [Troubleshooting](./troubleshooting.md)
- [Feature summary](../02-features/feature-summary.md)
