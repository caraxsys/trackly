# Environment Variables

## Purpose

Document the checked-in Trackly environment contract and its validation rules.

## Status

Completed

## Configuration Loading

The root `.env.example` is the source template. Backend configuration loads
dotenv and validates with Zod during module initialization. Frontend public
configuration is explicitly selected and validated; server-only frontend
configuration is resolved separately.

Empty Web Push values are treated as absent. Production validation is stricter
than development/test.

## Database and Compose Variables

| Variable            | Required/default          | Consumer         | Description                                |
| ------------------- | ------------------------- | ---------------- | ------------------------------------------ |
| `DATABASE_URL`      | Required                  | Backend, Drizzle | Valid `postgresql://` or `postgres://` URL |
| `POSTGRES_DB`       | Compose default `trackly` | PostgreSQL       | Database name                              |
| `POSTGRES_USER`     | Compose default `trackly` | PostgreSQL       | Database role                              |
| `POSTGRES_PASSWORD` | Compose default `trackly` | PostgreSQL       | Local Compose password                     |
| `POSTGRES_PORT`     | `5432`                    | Compose          | Host-published database port               |

Use hostname `postgres` inside Compose and `localhost` for host-run commands.

## Backend Runtime

| Variable             | Default/validation                                    | Description                           |
| -------------------- | ----------------------------------------------------- | ------------------------------------- |
| `NODE_ENV`           | `development`; `development                           | test                                  | production`         | Runtime mode |
| `BACKEND_HOST`       | `0.0.0.0`, non-empty                                  | Listen address                        |
| `BACKEND_PORT`       | `4000`, integer 1–65535                               | HTTP port                             |
| `LOG_LEVEL`          | `info`; Pino fatal/error/warn/info/debug/trace/silent | Log threshold                         |
| `CORS_ORIGINS`       | `http://localhost:3000`; comma-separated URLs         | Credentialed browser origin allowlist |
| `TRUST_PROXY`        | `false`; `true                                        | false`                                | Fastify proxy trust |
| `EXPOSE_API_DOCS`    | Non-production true, production false unless set      | Swagger registration                  |
| `ENABLE_DIAGNOSTICS` | Non-production true, production false                 | Diagnostic route registration         |

`ENABLE_DIAGNOSTICS=true` is rejected in production.

## Frontend Runtime

| Variable                                | Required/default                     | Exposure    | Description                           |
| --------------------------------------- | ------------------------------------ | ----------- | ------------------------------------- |
| `FRONTEND_PORT`                         | `3000` in scripts/Compose            | Server      | Next.js port                          |
| `NEXT_PUBLIC_API_URL`                   | Required valid absolute URL          | Browser     | Fastify application API base          |
| `NEXT_PUBLIC_AUTH_URL`                  | Required valid absolute URL          | Browser     | Better Auth base URL                  |
| `INTERNAL_API_URL`                      | Falls back to `NEXT_PUBLIC_AUTH_URL` | Server-only | Backend URL used by Server Components |
| `NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY` | Optional non-empty string            | Browser     | Public application server key         |

Only the VAPID public key may use a public variable. Never expose
`BETTER_AUTH_SECRET` or the VAPID private key.

In Compose, browser URLs use `localhost`, while `INTERNAL_API_URL` defaults to
`http://backend:4000`.

## Authentication

| Variable                          | Default/validation                              | Description                         |
| --------------------------------- | ----------------------------------------------- | ----------------------------------- |
| `BETTER_AUTH_SECRET`              | Required, minimum 32 characters                 | Cookie/session signing secret       |
| `BETTER_AUTH_URL`                 | `http://localhost:4000`, valid URL              | Better Auth canonical backend URL   |
| `BETTER_AUTH_TRUSTED_ORIGINS`     | `http://localhost:3000`, comma-separated URLs   | Better Auth origin allowlist        |
| `AUTH_REQUIRE_EMAIL_VERIFICATION` | Production true; otherwise configurable boolean | Protected email-verification policy |
| `AUTH_SESSION_EXPIRES_IN`         | `604800`, positive integer seconds              | Session lifetime                    |
| `AUTH_SESSION_UPDATE_AGE`         | `86400`, non-negative integer seconds           | Session refresh age                 |

Production requires HTTPS auth URL/origins, email verification, and a secret
that does not match known development placeholders.

## Rate Limiting

| Variable                      | Default | Validation                              |
| ----------------------------- | ------- | --------------------------------------- |
| `API_RATE_LIMIT_MAX`          | `120`   | Positive integer read limit             |
| `API_MUTATION_RATE_LIMIT_MAX` | `30`    | Positive integer mutation limit         |
| `API_RATE_LIMIT_WINDOW_MS`    | `60000` | Positive integer window in milliseconds |

These limits apply to `/api/v1` except diagnostics. Better Auth has separate
limits in its configuration.

## Web Push

| Variable                                | Development                              | Production                 |
| --------------------------------------- | ---------------------------------------- | -------------------------- |
| `WEB_PUSH_VAPID_PUBLIC_KEY`             | Optional                                 | Required                   |
| `WEB_PUSH_VAPID_PRIVATE_KEY`            | Optional                                 | Required and secret        |
| `WEB_PUSH_SUBJECT`                      | Optional; `mailto:` or HTTPS URL         | Required                   |
| `NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY` | Optional; missing state is handled in UI | Supply matching public key |

The backend never logs the private key. Frontend notification settings show
“Configuration unavailable” when the public key is absent.

## Example Local Host Configuration

```dotenv
DATABASE_URL=postgresql://trackly:trackly@localhost:5432/trackly
POSTGRES_DB=trackly
POSTGRES_USER=trackly
POSTGRES_PASSWORD=trackly
POSTGRES_PORT=5432
BACKEND_HOST=0.0.0.0
BACKEND_PORT=4000
FRONTEND_PORT=3000
NODE_ENV=development
LOG_LEVEL=debug
CORS_ORIGINS=http://localhost:3000
BETTER_AUTH_SECRET=replace-with-at-least-32-random-characters
BETTER_AUTH_URL=http://localhost:4000
BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_AUTH_URL=http://localhost:4000
INTERNAL_API_URL=http://localhost:4000
```

This example intentionally omits Web Push keys. Do not reuse its secret in
production.

## Failure Behavior

- Invalid backend configuration throws `Invalid backend environment
configuration` before startup.
- Invalid database protocol produces a specific database configuration error.
- Missing/invalid public frontend URLs fail frontend configuration evaluation.
- Invalid server API URL fails the affected Server Component request.
- Production refuses HTTP auth/origin configuration, placeholder secrets,
  disabled email verification, enabled diagnostics, or missing VAPID values.

## Security Checklist

- Keep `.env` untracked.
- Rotate any secret that appears in logs, screenshots, or commits.
- Keep public and private VAPID values distinct.
- List every allowed frontend origin in both CORS and Better Auth trusted
  origins.
- Set `TRUST_PROXY` only for a deployment with a trusted proxy topology.
- Disable Swagger and diagnostics in production unless explicitly required.

## Related Documentation

- [Local Development](./local-development.md)
- [Docker Development](./docker.md)
- [Authentication Flow](../01-design/authentication-flow.md)
- [Notifications](../02-features/phase-6-productivity.md#notifications-and-web-push)
