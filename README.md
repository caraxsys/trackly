# Trackly

Trackly is a modern personal productivity platform designed to combine habit
tracking, task management, goal tracking, and analytics. This repository
currently contains the production-oriented foundation and secure
email/password authentication. Product modules remain intentionally unimplemented.

The read-only Habit foundation provides authenticated list and detail pages at
`/habits`, with URL-based views, dates, search, sorting, and pagination. See
[`docs/habits.md`](docs/habits.md).

## Tech stack

- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui-ready
  configuration, React Hook Form, Zod, Axios, Lucide React, and Recharts
- Backend: Fastify, TypeScript, Swagger, Drizzle ORM, PostgreSQL, Zod, and a
  Better Auth 1.6.25
- Infrastructure: Docker, Docker Compose, and pnpm workspaces

## Getting started

1. Copy `.env.example` to `.env`.
2. Populate the values. A local development example is:

   ```dotenv
   DATABASE_URL=postgresql://trackly:trackly@postgres:5432/trackly
   POSTGRES_DB=trackly
   POSTGRES_USER=trackly
   POSTGRES_PASSWORD=trackly
   POSTGRES_PORT=5432
   BACKEND_PORT=4000
   FRONTEND_PORT=3000
   BETTER_AUTH_SECRET=replace-with-at-least-32-random-characters
   BETTER_AUTH_URL=http://localhost:4000
   BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:3000
   NEXT_PUBLIC_AUTH_URL=http://localhost:4000
   INTERNAL_API_URL=http://backend:4000
   ```

3. Start the complete development stack:

   ```bash
   docker compose up --build
   ```

The frontend is available at `http://localhost:3000`, the backend health check
at `http://localhost:4000/health`, and Swagger UI at
`http://localhost:4000/docs`.

For development outside Docker, enable Corepack, install dependencies, and run:

```bash
corepack enable
pnpm install
pnpm dev
```

When running the backend directly on the host, use `localhost` rather than
`postgres` in `DATABASE_URL`.

## Database setup

PostgreSQL runs through Docker Compose with data persisted in the
`postgres_data` volume. `DATABASE_URL` is required by the backend and every
Drizzle command. The backend rejects missing, malformed, and non-PostgreSQL
connection URLs with a clear startup error.

Start PostgreSQL and the backend with:

```bash
docker compose up --build postgres backend
```

When commands run on the host, set `DATABASE_URL` with `localhost` as the host.
When they run inside the backend container, use `postgres`.

### Drizzle commands

Run these commands from the repository root:

```bash
pnpm db:generate  # Generate a migration from schema changes
pnpm db:migrate   # Apply committed migrations
pnpm db:push      # Push schema directly (local development only)
pnpm db:studio    # Open Drizzle Studio
pnpm db:seed      # Verify the seed connection and run future seed routines
```

The first migration is intentionally empty and establishes migration
bookkeeping without creating business tables. The seed infrastructure verifies
connectivity but inserts no data. Database naming conventions and migration
policy are documented in
[`docs/database.md`](docs/database.md).

The core domain schema is introduced by
`0001_core-domain-schema.sql`. Apply committed migrations with:

```bash
pnpm db:migrate
```

After intentionally changing a Drizzle schema, generate and inspect a migration:

```bash
pnpm db:generate
```

Run the isolated PostgreSQL constraint and relationship suite with:

```bash
pnpm test:database
```

Do not use `db:push` as a production migration mechanism. Domain relationships,
the logical Better Auth ownership boundary, the ERD, and development recovery
instructions are documented in
[`docs/database-domain.md`](docs/database-domain.md).

## Repository structure

```text
.
├── frontend/          Next.js web application
├── backend/           Fastify API
├── docs/              Architecture and project documentation
├── docker-compose.yml Development container orchestration
├── .env.example       Environment variable template
└── AGENTS.md          Engineering rules for contributors and agents
```

Both applications provide dedicated `lint`, `typecheck`, and `build` scripts.
Run them across the workspace with `pnpm lint`, `pnpm typecheck`, and
`pnpm build`.

## Backend API foundation

Application endpoints are versioned under `/api/v1`. Infrastructure endpoints
remain separate:

- `GET /health` checks process health without querying PostgreSQL.
- `GET /ready` checks PostgreSQL connectivity and returns HTTP 503 when
  unavailable.
- `/docs` serves Swagger UI.

Responses, errors, validation, request IDs, CORS, security headers, and logging
are centralized through reusable Fastify plugins and helpers. Detailed
conventions are documented in [`docs/backend.md`](docs/backend.md).

Run the backend injection tests with:

```bash
pnpm test:backend
```

## Frontend foundation

The Next.js application uses a responsive shared shell. Desktop layouts have a
persistent sidebar; mobile layouts use bottom navigation with settings
available in the top bar. `/` redirects to `/today`, and the prepared
placeholder routes are `/today`, `/habits`, `/tasks`, `/goals`, `/insights`,
and `/settings`.

Light, dark, and system themes persist through `next-themes`. Public environment
variables are validated with Zod, and all API access must use the shared Axios
client. Set:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Run frontend tests with:

```bash
pnpm test:frontend
```

## Authentication

Better Auth owns `/api/auth/*`, password hashing, database sessions, and
HttpOnly cookies. Trackly's protected diagnostic endpoint is
`GET /api/v1/auth/me`. The browser uses `NEXT_PUBLIC_AUTH_URL`; Server
Components use `INTERNAL_API_URL` to check sessions before rendering protected
pages.

Registration at `/register` creates the user, session, and exactly one default
preferences row. `/login` is guest-only. `/today`, `/habits`, `/tasks`,
`/goals`, `/insights`, and `/settings` are protected. Logout invalidates the
database session and returns the user to `/login`.

`0002_authentication.sql` contains the official Better Auth 1.6.25 tables and
Trackly ownership foreign keys. After an intentional Better Auth
configuration/version change, run `pnpm auth:schema`, inspect the generated
schema, then run `pnpm db:generate` and review the migration.

For separate production frontend/backend domains, use HTTPS, list every
frontend origin in both CORS and `BETTER_AUTH_TRUSTED_ORIGINS`, and verify the
deployment's SameSite/domain requirements. Never expose `BETTER_AUTH_SECRET`
through a `NEXT_PUBLIC_*` variable.

See [`docs/frontend.md`](docs/frontend.md) for the route map, component
architecture, theme system, API client conventions, and Docker browser/server
URL behavior.

## Backend query layer

Authenticated read endpoints now include:

- `GET /api/v1/today`
- `GET /api/v1/today?date=YYYY-MM-DD`
- `GET /api/v1/categories`

Today returns real PostgreSQL habits, mutually exclusive task groups, active
goals with derived progress, and a daily summary based on the user's stored
timezone. The frontend includes only typed transport foundations; no dashboard
UI or write endpoints are part of this milestone.

See [`docs/today-query.md`](docs/today-query.md) for ownership, scheduling,
timezone, grouping, summary, and performance rules.

## Habit API

The authenticated Habit API supports user-scoped collection/detail reads and
backend mutations under `/api/v1/habits`. Milestone 3.1A adds create, partial
update, soft delete, activate, and deactivate commands while keeping the
frontend read-only. Milestone 3.2A adds absolute per-date progress through
`POST /api/v1/habits/:id/check-in`. Multi-table habit and schedule writes are
transactional; foreign, deleted, and missing resources use sanitized standard
errors.

See [`docs/habits.md`](docs/habits.md) for endpoint contracts, validation,
scheduling, ownership, and CQRS boundaries.

The frontend provides `/habits/new` and `/habits/[id]/edit`, plus explicit
Edit, Activate/Deactivate, and soft-delete actions on Habit details. The shared
React Hook Form and Zod form remains check-in-free; Habit Check-in is reserved
for a later frontend milestone.

The authenticated `/today` route now renders the real dashboard server-side.
It includes local-date greeting and navigation, daily progress, scheduled
habits, task attention/completion groups, active goals, and polished
loading/error/empty states. The dashboard is read-only until future mutation
milestones.

## Docker notes

Compose creates an internal bridge network for application traffic and stores
PostgreSQL data in the named `postgres_data` volume. Source directories are
mounted into the application containers for development, while anonymous
volumes keep container dependencies and build output isolated from the host.
