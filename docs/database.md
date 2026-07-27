# Database foundation

Trackly uses PostgreSQL through Drizzle ORM and the `postgres` driver. One
shared Drizzle instance is exported by `backend/src/db/index.ts`. Fastify
verifies the connection during startup and closes the driver gracefully during
shutdown. Migration and seed processes use the same connection lifecycle.

## Naming conventions

All future database schemas must follow these conventions:

- Table names use `snake_case`.
- Column names use `snake_case`.
- Primary keys are named `id` and use PostgreSQL UUIDs.
- Foreign keys use `<entity>_id`.
- Timestamp columns use `created_at` and `updated_at`.
- Tables supporting soft deletion use a nullable `deleted_at`.

Drizzle is configured with `casing: 'snake_case'` for generated column names.
Schema authors remain responsible for declaring snake-case table names and the
standard identity and timestamp columns.

## Migration policy

Committed migrations in `backend/src/db/migrations` are the source of truth for
shared environments. Generate a migration after changing the schema, inspect
the generated SQL, and then apply it.

`db:push` directly synchronizes schema state and is intended only for disposable
local development databases. Do not use it as a replacement for reviewed
migrations in shared or production environments.

The initial `0000_database-foundation.sql` migration intentionally creates no
business tables. `0001_core-domain-schema.sql` creates the Milestone 0.5
application domain. See [`database-domain.md`](database-domain.md) for the
complete ownership, relationship, date, deletion, and derived-value rules.

`0002_authentication.sql` creates Better Auth 1.6.25's generated `user`,
`session`, `account`, and `verification` tables, indexes, and reviewed ownership
constraints. Regenerate the canonical auth schema with `pnpm auth:schema`.
Better Auth's output is the source of truth; never hand-author those tables.

Milestone 2.0 requires no schema migration. Existing indexes cover ownership,
active habit, task status/due time, goal status/target date, schedule, check-in,
and goal-step query paths. Drizzle schema generation must continue to report no
pending changes.
