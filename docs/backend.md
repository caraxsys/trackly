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

Fastify and Pino emit readable logs in development and structured JSON in
production. `LOG_LEVEL` controls verbosity. Fastify request completion logs
include the request ID, method, URL, status code, and response time.

The backend accepts an `x-request-id` containing 1–128 safe ASCII identifier
characters. Invalid or missing values are replaced with a UUID. Every response
returns the effective ID in the `x-request-id` header.

Authorization headers, cookies, set-cookie headers, passwords, tokens, and
secrets are redacted. Request bodies are not logged by default.

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
`activate` and `deactivate` subresources. All are session-protected, Zod
validated, documented in OpenAPI, and normalized by the centralized error
handler.

See [`habits.md`](habits.md) for mutation contracts and schedule semantics.

## Authentication

`src/auth/auth.ts` is the single Better Auth configuration. It uses the shared
Drizzle client, PostgreSQL adapter, email/password authentication, 8–128
character passwords, database sessions, trusted origins, configurable expiry,
and built-in rate limits. Production enables secure cookies; localhost
development permits HTTP cookies.

`src/auth/session.ts` converts Node headers with Better Auth's official helper,
caches one lookup per Fastify request, and exposes `requireSession()` and
`requireUserId()`. Unauthenticated Trackly routes receive the centralized
`UNAUTHORIZED` error. `GET /api/v1/auth/me` exposes only safe user fields and
session expiry.

## Authenticated query modules

Read modules live under `src/modules`. Repositories own Drizzle queries,
services interpret and aggregate results, controllers handle authentication
and response envelopes, and routes own validation/OpenAPI metadata.

The Today module performs one preferences query followed by three parallel
repository queries. All reads are authenticated and user-scoped. See
[`today-query.md`](today-query.md) for the stable contract and semantics.
