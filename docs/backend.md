# Backend foundation

The read-only Habit module follows repository → service → controller → route
separation. Its authenticated contracts and query semantics are documented in
[`habits.md`](./habits.md).

The Trackly backend is a Fastify application assembled in `src/app.ts`.
`buildApp()` configures the application without opening a network port, which
keeps startup separate from composition and allows deterministic injection
tests. `src/server.ts` owns listening and graceful process shutdown.

## Plugin architecture

Infrastructure is registered as encapsulated Fastify plugins:

- `request-context.ts` propagates or generates request IDs.
- `error-handler.ts` owns error and not-found serialization.
- `cors.ts` enforces the configured credentialed origin allowlist.
- `security.ts` applies standard security headers.
- `swagger.ts` configures OpenAPI and Swagger UI.
- `database.ts` verifies PostgreSQL and manages connection shutdown.
- `auth.ts` delegates `/api/auth/*` to Better Auth without changing its
  response or cookie contract.

Plugins and routes do not contain domain behavior. Future modules should keep
transport logic in controllers, application logic in services, and persistence
behind repositories.

## Runtime lifecycle

`src/server.ts` owns the HTTP process lifecycle. `SIGINT` and `SIGTERM` stop
Fastify from accepting new work and run Fastify close hooks; the database
plugin then closes the PostgreSQL client pool. Repeated shutdown requests share
one promise, so owned resources close once.

Shutdown has a ten-second deadline. A clean signal exits with code 0, while
startup errors, unhandled rejections, and uncaught exceptions close resources
and retain a non-zero exit code. If an owned close hook hangs or fails, the
process logs `server_shutdown_failed` and forces termination. Containers should
send `SIGTERM` and provide a grace period longer than ten seconds.

The Reminder scheduler is a separate process and owns its own loop, active
tick, provider composition, and database shutdown. Stopping the HTTP API does
not attempt to control that process or change scheduler delivery semantics.

## API versioning

All public application routes must be registered beneath `/api/v1`. Health,
readiness, and Swagger are infrastructure endpoints and remain unversioned.
Better Auth infrastructure routes remain at `/api/auth/*`.

The temporary `POST /api/v1/diagnostics/validation` endpoint demonstrates the
Zod validation pipeline and contains no business behavior. It can be removed
after real versioned modules provide equivalent validation coverage.

## Health and readiness

`GET /health` confirms only that the API process can respond. It deliberately
does not query PostgreSQL.

`GET /ready` queries PostgreSQL. It returns HTTP 200 while dependencies are
available and a sanitized HTTP 503 response when PostgreSQL cannot be reached.
Neither endpoint returns connection details.

## Response and error conventions

Successful responses use:

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

`meta` is optional. Errors use:

```json
{
  "success": false,
  "error": {
    "code": "STABLE_ERROR_CODE",
    "message": "Human-readable public message",
    "details": {}
  }
}
```

`details` is optional and must contain only safe, actionable public
information. Controllers use the response helpers in `src/http/responses.ts`.
Application services should throw `AppError` for expected failures. The global
handler normalizes Zod errors, Fastify validation errors, malformed JSON,
unknown routes, application errors, and unexpected errors.

Unexpected errors are logged internally and exposed as a generic HTTP 500
response. Stack traces and internal exception messages must never be copied
into public responses.

## Validation

Use `validateRequest()` for params, query strings, and request bodies. It parses
inputs with Zod before controllers run. Invalid requests return the standard
HTTP 400 response.

## Logging and request IDs

Fastify and Pino emit readable single-line logs in development and structured
JSON in test and production. `LOG_LEVEL` controls verbosity. Each completed
request emits `event=http.request.completed` with:

- `time` and numeric `level`;
- `requestId`, `method`, and query-free `path`;
- HTTP `status` and `durationMs`;
- authenticated `userId` when a session was resolved.

The backend accepts an `x-request-id` containing 1–128 safe ASCII identifier
characters. Invalid or missing values are replaced with a UUID. Every response
returns the effective ID in the `x-request-id` header. Send the same ID on
related inbound/internal HTTP calls to preserve correlation. Database,
repository, service, controller, error, and audit logs use the request logger
and therefore retain that correlation ID.

Authorization headers, cookies, set-cookie headers, passwords, tokens, and
secrets are redacted. Request bodies and query strings are not logged by
default. Internal error events use `event=http.request.error`, stable error
codes, request context, and a server-only stack. Known database, auth, and VAPID
secret values are removed from error messages and stacks before logging. Public
error responses are unchanged.

### Audit events

Important state changes emit `event=audit.event`. The nested `audit` object has
the stable shape:

```json
{
  "actorId": "authenticated-user-id",
  "action": "habit.update",
  "resourceType": "habit",
  "resourceId": "resource-id",
  "timestamp": "2026-07-29T00:00:00.000Z",
  "outcome": "success",
  "requestId": "request-id"
}
```

Failed events additionally include a stable `errorCode`. Unknown authentication
actors are represented as `null`. Audit events cover registration, login,
logout, account/profile changes, Habit writes and check-ins, Goal writes,
Reminder writes, and preference updates. They record identifiers and outcomes,
never request payloads, email addresses, credentials, cookies, tokens, push
subscription material, or verification links.

Audit logs are operational records, not a persisted domain model. They inherit
the active Pino destination and retention policy; Trackly does not introduce an
external logging service or database audit table.

### Troubleshooting

1. Start with the client-visible `x-request-id`.
2. Find `http.request.completed` for status and latency.
3. Inspect a matching `http.request.error` for sanitized internal context.
4. Inspect matching `audit.event` entries to confirm attempted state changes and
   outcomes.
5. Use `/health` for process liveness and `/ready` for PostgreSQL readiness.

Temporary diagnostics and Swagger retain the production restrictions defined in
the security policy. Health responses do not expose configuration, credentials,
dependency addresses, or stack traces.

## CORS

`CORS_ORIGINS` is a comma-separated list of absolute allowed origins:

```dotenv
CORS_ORIGINS=http://localhost:3000,https://app.example.com
```

Credentials are enabled, so wildcard origins are not supported. Requests
without an Origin header are allowed for server-to-server and health-check
traffic. Browser requests from unlisted origins receive a sanitized HTTP 403
error.

## Tests

Run backend tests from the repository root:

```bash
pnpm test:backend
```

Tests use Fastify injection and a deterministic readiness dependency. The final
Docker validation separately verifies `/ready` against the real PostgreSQL
container.

## Habit command module

Habit writes use a lightweight CQRS split alongside the existing read path:

`HabitCommandController → HabitCommandService → HabitCommandRepository`

The command service enforces aggregate rules and ownership-safe category
validation. The repository contains all mutation SQL and uses Drizzle
transactions for habit/schedule writes. The public command routes are
`POST /api/v1/habits`, `PATCH` and `DELETE /api/v1/habits/:id`, plus the
`activate`, `deactivate`, and `check-in` subresources. Check-in accepts absolute
progress for one logical date, resolves omitted dates in the user's timezone,
upserts positive progress, and deletes zero progress. All commands are
session-protected, Zod validated, documented in OpenAPI, and normalized by the
centralized error handler.

See [`habits.md`](habits.md) for mutation contracts and schedule semantics.

## Analytics query module

The read-only CQRS path is
`AnalyticsQueryController → AnalyticsQueryService → AnalyticsQueryRepository`.
`GET /api/v1/analytics/summary` derives day, Monday–Sunday week, or calendar
month Habit metrics. The repository performs a bounded user-scoped read with
correlated schedule and check-in projections; the service owns timezone and
date-range resolution, recurrence evaluation, capping, aggregation, and
rounding. Three fixed queries avoid N+1 behavior; no derived analytics are
persisted.

The Analytics page uses the request-scoped `/api/v1/analytics/dashboard`
composition endpoint. It resolves timezone and loads one bounded shared record
set, then derives the existing analytics contracts from that set. Standalone
analytics endpoints remain supported. The page-level SQL statement budget is
therefore three instead of eighteen.

See [`analytics.md`](analytics.md) for the endpoint contract and formulas.
Milestone 4.0B also verified the OpenAPI schema and live endpoint registration
against the Dockerized Fastify service, with PostgreSQL-backed integration
fixtures confirming ownership and aggregate correctness.

## Authentication

`src/auth/auth.ts` is the single Better Auth configuration. It uses the shared
Drizzle client, PostgreSQL adapter, email/password authentication, 8–128
character passwords, database sessions, trusted origins, configurable expiry,
and built-in rate limits. Production enables secure cookies; localhost
development permits HTTP cookies.

Email verification is disabled by default in development so local registration
remains self-contained. Production configuration defaults to requiring a
verified email and rejects attempts to disable that policy. Until a transactional
email adapter is configured, production accounts must not be opened for public
registration; verification delivery is intentionally not emulated or logged.

`src/auth/session.ts` converts Node headers with Better Auth's official helper,
caches one lookup per Fastify request, and exposes `requireSession()` and
`requireUserId()`. Unauthenticated Trackly routes receive the centralized
`UNAUTHORIZED` error. `GET /api/v1/auth/me` exposes only safe user fields and
session expiry.

## Security policy

Fastify Helmet applies a restrictive Content Security Policy and complementary
browser headers. Swagger requires narrowly scoped inline script/style allowances;
wildcard, object, and frame sources remain forbidden. The Next.js frontend sends
its own CSP, permits only the configured API origin, limits browser capabilities,
and allows `unsafe-eval` only for the development toolchain.

Trackly API reads are limited to 120 requests per IP and endpoint per minute and
mutations to 30 requests per IP and endpoint per minute by default. Better Auth retains its tighter
sign-in/sign-up limits. Health, readiness, authentication-owned routes, Swagger,
and development diagnostics are not counted by the application limiter.
Exceeded limits return the standard `RATE_LIMIT_EXCEEDED` HTTP 429 envelope.
Enable `TRUST_PROXY` only behind a trusted proxy that overwrites forwarded IP
headers.

Swagger and the temporary validation diagnostic are enabled by default only
outside production. Production may explicitly expose Swagger with
`EXPOSE_API_DOCS=true`; temporary diagnostics cannot be enabled in production.
Production also requires HTTPS auth/CORS origins, secure cookies, verified email
access, non-placeholder auth secrets, and complete VAPID configuration.

Run `pnpm audit:security` for a production-dependency audit. The lockfile remains
the source of reproducible dependency resolution; dependency upgrades require a
separate reviewed change.

## Authenticated query modules

Read modules live under `src/modules`. Repositories own Drizzle queries,
services interpret and aggregate results, controllers handle authentication
and response envelopes, and routes own validation/OpenAPI metadata.

The Today module performs one preferences query followed by three parallel
repository queries. All reads are authenticated and user-scoped. See
[`today-query.md`](today-query.md) for the stable contract and semantics.
