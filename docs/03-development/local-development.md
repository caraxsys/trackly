# Local Development

## Purpose

Guide contributors from a fresh checkout to a running and validated Trackly
workspace.

## Status

Completed

## Prerequisites

- Git.
- Node.js compatible with the repository toolchain; containers use Node.js 24
  Alpine.
- Corepack.
- pnpm `10.13.1`, pinned by the root `packageManager`.
- PostgreSQL 17 or Docker with Docker Compose.

Web Push development additionally needs a VAPID key pair and a browser with
service worker, Notification, and PushManager support. Notification permission
works only on HTTPS or localhost.

## Repository Setup

From the repository root:

```bash
corepack enable
pnpm install --frozen-lockfile
```

Copy `.env.example` to `.env`, then supply local values. Never commit `.env`.
See [Environment Variables](./environment-variables.md).

For host-run backend commands, `DATABASE_URL` must use `localhost`. Inside
Compose, the database hostname is `postgres`.

Apply committed migrations before starting feature work:

```bash
pnpm db:migrate
```

## pnpm Workspace

`pnpm-workspace.yaml` declares two packages:

```text
frontend/   @trackly/frontend
backend/    @trackly/backend
```

Root scripts coordinate both packages. Use a filter for focused work:

```bash
pnpm --filter @trackly/frontend dev
pnpm --filter @trackly/backend dev
pnpm --filter @trackly/frontend test
pnpm --filter @trackly/backend test
```

Keep `pnpm-lock.yaml` synchronized with manifest changes. Do not use npm or
yarn to add dependencies.

## Running PostgreSQL

Start only PostgreSQL through Docker:

```bash
docker compose up postgres
```

Then use a host database URL such as:

```dotenv
DATABASE_URL=postgresql://trackly:trackly@localhost:5432/trackly
```

PostgreSQL data persists in the `postgres_data` named volume.

## Running the Frontend

```bash
pnpm --filter @trackly/frontend dev
```

The default address is `http://localhost:3000`. The frontend needs:

- `NEXT_PUBLIC_API_URL` for browser application requests.
- `NEXT_PUBLIC_AUTH_URL` for Better Auth browser requests.
- `INTERNAL_API_URL` or `NEXT_PUBLIC_AUTH_URL` for Server Component requests.

The backend must be reachable for protected pages.

## Running the Backend

```bash
pnpm --filter @trackly/backend dev
```

The default address is `http://localhost:4000`. Fastify verifies PostgreSQL
during startup. Useful endpoints are:

- `GET /health`
- `GET /ready`
- `/docs` when enabled

Run the reminder scheduler separately when needed:

```bash
pnpm --filter @trackly/backend scheduler:reminders
pnpm --filter @trackly/backend scheduler:reminders:once
```

The scheduler is not automatically started by the normal backend development
script or Docker Compose.

## Running the Full Stack

Host processes:

```bash
pnpm dev
```

This runs frontend and backend scripts in parallel. PostgreSQL must already be
available.

Containerized development:

```bash
docker compose up --build
```

See [Docker Development](./docker.md) for topology and troubleshooting.

## Development Loop

```mermaid
flowchart LR
    Sync["Update branch"] --> Install["pnpm install --frozen-lockfile"]
    Install --> Migrate["pnpm db:migrate"]
    Migrate --> Develop["Run focused service(s)"]
    Develop --> Test["Run focused tests"]
    Test --> Quality["format, lint, typecheck"]
    Quality --> Build["Production build"]
    Build --> Review["Review diff and docs"]
```

Follow `AGENTS.md`: keep routes thin, validation in Zod, business rules in
services, SQL in repositories, and frontend client boundaries small.

## Code Style

- TypeScript only; `allowJs` is disabled.
- Use the `@/*` alias within each package.
- Prefer small functions and composition.
- Preserve Server Components unless browser interaction requires a Client
  Component.
- Keep user ownership predicates in every repository operation.
- Treat calendar dates separately from timestamps.

The root formatter uses semicolons, single quotes, trailing commas, and the
Tailwind class-order plugin. Editor defaults are UTF-8, LF, two spaces, final
newline, and trimmed trailing whitespace (except Markdown).

## Linting, Formatting, and Type Checking

```bash
pnpm format:check
pnpm lint
pnpm typecheck
```

Apply formatting with `pnpm format`. Frontend ESLint uses Next.js Core Web
Vitals and TypeScript rules. Backend ESLint uses type-aware recommended rules
plus consistent type imports and promise-safety checks.

Both packages use strict TypeScript. Backend additionally enables
`noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.

## Build Process

```bash
pnpm build
```

The frontend runs `next build` and produces standalone output. The backend
compiles `src/` to `backend/dist/` with declarations and source maps.

## Release Preparation

The repository has no automated release script. Before requesting review:

```bash
pnpm validate
pnpm test:database
docker compose config --quiet
git diff --check
```

`pnpm validate` runs formatting, lint, type checks, backend/frontend tests, and
both production builds. It does not run the PostgreSQL integration suite or
Docker validation.

Repository history uses milestone branches, Conventional Commit-style
messages, and semantic tags, but `CONTRIBUTING.md` and `CHANGELOG.md` remain
placeholders. Confirm commit/tag/release expectations with the project owner.

## Dependency Updates

There is no automated update workflow. For an intentional dependency change:

1. Update the relevant package manifest using pnpm.
2. Review manifest and lockfile changes.
3. Check production advisories:

   ```bash
   pnpm audit:security
   ```

4. Run focused tests, then the full release-preparation sequence.
5. For Better Auth version/configuration changes, regenerate and review its
   schema before creating a Drizzle migration.

Avoid unrelated major upgrades and never hand-edit resolved lockfile entries.

## Security Practices

- Never commit populated environment files or secrets.
- Never expose backend secrets with a `NEXT_PUBLIC_*` name.
- Do not log cookies, authorization headers, tokens, passwords, Web Push keys,
  or subscription endpoints.
- Use only configured credentialed origins.
- Preserve production environment validation, CSP, rate limits, and Swagger/
  diagnostic restrictions.
- Use Better Auth's server API; never decode cookies manually.

## Common Developer Mistakes

- Using `postgres` as the database hostname from a host process.
- Assuming `pnpm validate` includes PostgreSQL integration tests.
- Running `db:push` as a production migration mechanism.
- Starting Fastify without applying committed migrations.
- Adding a new Axios instance instead of the central client.
- Using server-local time for Today or schedule logic.
- Running the scheduler and assuming it is part of the API process.
- Editing generated `next-env.d.ts`; it is formatter-ignored.
- Treating placeholder Tasks/Insights pages as completed features.

## Useful Commands

| Command               | Purpose                                        |
| --------------------- | ---------------------------------------------- |
| `pnpm dev`            | Run frontend and backend                       |
| `pnpm build`          | Build both packages                            |
| `pnpm lint`           | Lint both packages                             |
| `pnpm typecheck`      | Type-check both packages                       |
| `pnpm format`         | Format the repository                          |
| `pnpm validate`       | Run the combined non-database quality workflow |
| `pnpm test:backend`   | Backend unit/route tests                       |
| `pnpm test:frontend`  | Frontend tests                                 |
| `pnpm test:database`  | PostgreSQL integration tests                   |
| `pnpm audit:security` | Audit production dependencies at high severity |

## Related Documentation

- [Environment Variables](./environment-variables.md)
- [Docker Development](./docker.md)
- [Database Migrations](./database-migrations.md)
- [Testing](./testing.md)
- [Debugging](./debugging.md)
- [Development Workflow Overview](../00-overview/05-development-workflow.md)
