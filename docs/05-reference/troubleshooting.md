# Trackly Troubleshooting

## Purpose

Provide safe, implementation-based diagnostics for local setup, Docker,
PostgreSQL, authentication, frontend requests, scheduling, Web Push, builds,
and tests.

## Status

Completed

## First Response Checklist

1. Capture the failing command, HTTP status, and `x-request-id`.
2. Run `docker compose ps` and inspect the affected service logs.
3. Check `GET http://localhost:4000/health`.
4. Check `GET http://localhost:4000/ready`.
5. Validate configuration with `docker compose config --quiet`.
6. Confirm `.env` contains local values and is not committed.
7. Reproduce with the smallest relevant test or package command.

Never paste session cookies, authorization headers, VAPID private keys,
passwords, subscription keys, or complete production environment files into an
issue.

## Docker Stack Does Not Start

### Symptoms

- A service exits immediately.
- Backend or frontend remains blocked by a dependency.
- A host port is already in use.

### Checks

```bash
docker compose config --quiet
docker compose ps
docker compose logs postgres
docker compose logs backend
docker compose logs frontend
```

Confirm that `POSTGRES_PORT`, `BACKEND_PORT`, and `FRONTEND_PORT` do not collide
with existing host processes. Compose service-to-service URLs must use service
names such as `postgres` and `backend`, not `localhost`.

Use `docker compose up --build` after Dockerfile or dependency changes. Do not
remove the PostgreSQL volume as a routine fix because that destroys local data.

## Backend Is Healthy but Not Ready

`/health` checks the Fastify process without querying PostgreSQL. `/ready`
executes a database connectivity check. A healthy response combined with HTTP
503 readiness normally indicates a database URL, startup, network, credential,
or migration problem.

```bash
curl http://localhost:4000/health
curl http://localhost:4000/ready
docker compose ps postgres
docker compose logs postgres
docker compose logs backend
```

When running the backend on the host, `DATABASE_URL` normally uses
`localhost`. Inside Compose it uses the `postgres` service hostname.

## Database Migration Problems

Run committed migrations from a workspace that contains
`backend/src/db/migrations`:

```bash
pnpm db:migrate
```

Do not use `pnpm db:push` as a production recovery shortcut. The current
production backend image does not copy the SQL migration directory and is not a
self-contained migration runner.

If integration tests fail to connect, verify the test database URL and start
PostgreSQL before running:

```bash
pnpm test:database
```

See [database migrations](../03-development/database-migrations.md) before
changing schema state.

## Authentication or Redirect Loops

Check:

- `BETTER_AUTH_URL` points to the browser-reachable backend origin.
- `NEXT_PUBLIC_AUTH_URL` matches the browser-facing auth origin.
- `INTERNAL_API_URL` is reachable from Next.js Server Components.
- The frontend origin appears in both `CORS_ORIGINS` and
  `BETTER_AUTH_TRUSTED_ORIGINS`.
- Browser cookies are permitted for the chosen origins and HTTPS policy.
- The production auth secret is non-placeholder and at least 32 characters.

Better Auth owns `/api/auth/*`. Do not decode cookies or manually edit session
rows to diagnose an authentication failure. An expired session should follow
the existing unauthenticated flow; an internal session-service failure should
remain a server error.

## Frontend Cannot Reach the Backend

The two relevant URLs serve different runtimes:

- `NEXT_PUBLIC_API_URL` is used by the browser.
- `INTERNAL_API_URL` is used by server-side frontend requests.

For Compose development, the browser URL normally uses
`http://localhost:4000`, while the internal URL uses
`http://backend:4000`. Check browser network responses and correlate them with
backend logs using `x-request-id`.

## CORS Rejection

CORS uses an explicit comma-separated `CORS_ORIGINS` allowlist and permits
credentials. Add the exact scheme, host, and port of the frontend. Do not use a
wildcard with credentials. In production, use HTTPS origins and keep Better
Auth's trusted-origin list aligned.

## Swagger Is Missing

Swagger UI is normally available at `/docs` in development when
`EXPOSE_API_DOCS=true`. Production defaults restrict documentation exposure.
If it is absent, inspect environment validation and deployment policy rather
than bypassing the restriction.

## Requests Return HTTP 429

Trackly applies process-local API and mutation limits. Wait for the configured
window, avoid duplicate submissions, and inspect:

- `API_RATE_LIMIT_MAX`
- `API_MUTATION_RATE_LIMIT_MAX`
- `API_RATE_LIMIT_WINDOW_MS`
- `TRUST_PROXY` when requests pass through a trusted reverse proxy

Do not raise limits blindly. Multiple backend replicas do not share counters.

## Request IDs Are Missing or Replaced

The backend accepts only valid incoming `x-request-id` values; otherwise it
generates one. Confirm the reverse proxy forwards `x-request-id` unchanged and
does not strip the response header. Use the returned value, not an untrusted
client assumption, when correlating logs.

## Reminder Scheduler Is Not Delivering

The scheduler is a separate runtime; starting only the HTTP backend does not
start reminder processing. Verify:

- The scheduler process is running.
- PostgreSQL is ready.
- Reminder, habit, and user timezone data make the occurrence eligible.
- Only one recurring scheduler instance owns the schedule.
- The selected provider is explicitly registered.
- Scheduler logs show tick completion, skips, or sanitized delivery failures.

There is no scheduler health endpoint or automatic retry queue. A failed
occurrence does not stop later occurrences.

## Web Push Is Unavailable

Backend production Web Push requires:

- `WEB_PUSH_VAPID_PUBLIC_KEY`
- `WEB_PUSH_VAPID_PRIVATE_KEY`
- `WEB_PUSH_SUBJECT`

The frontend requires only
`NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY`. Browser subscription requires a secure
context; localhost is the normal development exception. Permission is requested
only after an explicit user action.

If permission is denied, Trackly cannot reset it programmatically. Change the
browser's site permission manually. HTTP 404/410 responses from push services
invalidate expired subscriptions; transient failures record failure metadata
without automatic retry.

Never log or display subscription endpoints, subscription keys, or the VAPID
private key.

## Service Worker or Notification Click Problems

Confirm `/sw.js` is served from the frontend origin and registered with the
expected root scope. The worker accepts known Trackly notification data and
routes habit reminders to an internal Trackly page. Arbitrary payload URLs are
not trusted.

Clear or unregister a development service worker only when testing registration
state; doing so also affects the local browser subscription.

## Lint, Type, Formatting, or Build Failure

Run the repository checks independently to identify the failing layer:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:backend
pnpm test:frontend
pnpm build
git diff --check
```

`pnpm validate` combines formatting, linting, type checks, both unit suites,
and production builds. PostgreSQL integration tests remain separate.

Do not edit generated `frontend/next-env.d.ts` to fix an unrelated source
problem. Use the package-level error and its first actionable stack frame.

## Production Incident Triage

1. Preserve request IDs, timestamps, affected route, deployment version, and
   sanitized logs.
2. Determine whether the process is unhealthy, unready, or returning
   application errors.
3. Check database connectivity and recent migration execution.
4. Check scheduler state separately from HTTP availability.
5. Stop an unsafe rollout or duplicate scheduler before making data changes.
6. Restore data only from a verified backup and only through an approved
   recovery procedure.
7. Record the incident and follow-up actions outside sensitive logs.

Trackly does not include an external monitoring platform, automated backup, or
rollback system. See [monitoring](../04-deployment/monitoring.md),
[backup and recovery](../04-deployment/backup.md), and
[production deployment](../04-deployment/production.md).
