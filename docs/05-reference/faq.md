# Trackly Frequently Asked Questions

## Purpose

Answer recurring questions using the behavior implemented in the current
repository.

## Status

Completed

## Product

### Which product areas are implemented?

Trackly currently implements authentication, Today, habits, categories, goals,
analytics, preferences, reminders, notification delivery, and browser Web Push
subscription management. Tasks and the standalone Insights route remain
reserved placeholders. See the [feature summary](../02-features/feature-summary.md).

### Is analytics data stored?

No. Analytics, completion percentages, streaks, and goal progress are derived
from schedules, check-ins, and source records. Trackly does not persist those
aggregates.

### What does “today” mean?

It is the current logical calendar date in the authenticated user's stored
timezone. It is not the backend host's local date.

### Why can a zero check-in disappear from the database?

Habit progress uses an absolute count. A positive value is upserted; a value of
zero removes the check-in row so zero-progress records are not retained.

## Development

### What is the supported package manager?

The workspace declares pnpm 10.13.1 through the `packageManager` field. Use
Corepack and run commands from the repository root unless a guide says
otherwise.

### Can the full stack run without Docker?

Yes, if PostgreSQL and the required environment are available. `pnpm dev` runs
the frontend and backend in parallel. Docker Compose is the documented
repeatable development topology.

### Which validation command should contributors run?

Run:

```bash
pnpm validate
pnpm test:database
docker compose config --quiet
git diff --check
```

The database suite requires PostgreSQL and is intentionally separate from
`pnpm validate`.

### Should `db:push` be used in production?

No. Generate and review a migration, commit the migration artifacts, and apply
them with `pnpm db:migrate` from a suitable migration environment.

### Where are API and database contracts documented?

Use the [API reference](./api-reference.md) and
[database schema](./database-schema.md).

## Authentication and Security

### Who owns authentication tables and cookies?

Better Auth owns users, accounts, sessions, verification records, password
handling, cookies, and `/api/auth/*`. Application code must use Better Auth's
server API rather than decoding cookies.

### Can clients send a user ID to scope requests?

No. User ownership always comes from the authenticated session. Repositories
scope reads and mutations by that user ID.

### Can production use HTTP?

Current production environment validation requires HTTPS authentication and
trusted origins. TLS termination is not implemented in this repository and
must be supplied by the deployment environment.

### Are secrets safe to put in `NEXT_PUBLIC_*` variables?

No. Next.js exposes those variables to the browser. The Web Push public VAPID
key is intentionally public; private VAPID keys, database credentials, and
Better Auth secrets must remain server-only.

## Operations

### What is the difference between `/health` and `/ready`?

`/health` confirms the backend process is running and does not query the
database. `/ready` checks PostgreSQL connectivity and returns HTTP 503 when the
backend is not ready for database-dependent traffic.

### Does starting the backend also start reminders?

No. The reminder scheduler is a separate runtime built from the backend. It
must be deployed and supervised separately.

### Can multiple recurring schedulers run?

The repository does not implement distributed scheduler leadership. A
production deployment should assign a single recurring scheduler owner to avoid
competing runtime work.

### Does Trackly provide database backups?

No automated backup or restore system is included. The Compose PostgreSQL
volume preserves local container data but is not a backup. See
[backup and recovery](../04-deployment/backup.md).

### Does Trackly include production monitoring?

It emits structured logs, request IDs, audit events, health, and readiness
signals. It does not include external log storage, metrics, tracing, dashboards,
or alerts.

### Is Swagger always public?

No. It is convenient in development and controlled by environment settings.
Production deployment should keep it restricted according to the implemented
exposure policy.

## Notifications

### Does Trackly use Firebase Cloud Messaging?

No. It uses the standard browser Web Push protocol with VAPID.

### Why are notifications shown as disabled when another device is subscribed?

The settings UI represents the current browser/device. It does not treat
another device's backend subscription as this device's local subscription.

### Can Trackly ask for notification permission automatically?

No. Permission is requested only after an explicit user action. A denied
permission must be changed manually in browser or site settings.

### Are failed notifications retried automatically?

No automatic retry queue is implemented. Expired subscriptions reported with
HTTP 404/410 are invalidated, while transient failures update failure metadata.

## Documentation

### What is the documentation source of truth?

Markdown in `docs/` and the root project guides is the maintained source.
PDF/DOCX editions may be generated from it, but generated editions must not
replace the Markdown source.

### How should an incorrect document be fixed?

Verify the implementation first, update the smallest authoritative document,
repair affected cross-links, and run the documentation checks described in
[CONTRIBUTING.md](../../CONTRIBUTING.md).

## More Help

See [Troubleshooting](./troubleshooting.md) for diagnostics and
[Glossary](./glossary.md) for shared terminology.
