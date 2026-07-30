# Trackly Repository Structure

## Purpose

This document maps the checked-in Trackly repository and explains its important
source, test, database, documentation, container, and configuration boundaries.

## Status

Completed

## Scope

Generated dependencies, build output, caches, and Git internals are omitted.

## Repository Tree

```text
Trackely/
├── backend/
│   ├── src/
│   │   ├── audit/
│   │   ├── auth/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── db/
│   │   │   ├── migrations/
│   │   │   ├── schema/
│   │   │   └── seed/
│   │   ├── errors/
│   │   ├── http/
│   │   ├── lib/
│   │   ├── modules/
│   │   │   ├── analytics/
│   │   │   ├── categories/
│   │   │   ├── goals/
│   │   │   ├── habits/
│   │   │   ├── notifications/
│   │   │   ├── preferences/
│   │   │   ├── push-subscriptions/
│   │   │   ├── reminders/
│   │   │   ├── shared/
│   │   │   ├── tasks/
│   │   │   └── today/
│   │   ├── plugins/
│   │   ├── routes/
│   │   │   └── v1/
│   │   ├── runtime/
│   │   ├── scheduler/
│   │   ├── validation/
│   │   ├── app.ts
│   │   └── server.ts
│   ├── tests/
│   │   └── database/
│   ├── Dockerfile
│   ├── drizzle.config.ts
│   ├── package.json
│   └── tsconfig.json
├── docs/
│   ├── 00-overview/
│   ├── 01-design/
│   ├── 02-features/
│   ├── 03-development/
│   ├── 04-deployment/
│   ├── 05-reference/
│   ├── README.md
│   └── quality-baseline.md
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── config/
│   │   ├── features/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── services/
│   │   ├── styles/
│   │   └── types/
│   ├── tests/
│   ├── Dockerfile
│   ├── components.json
│   ├── next.config.ts
│   ├── package.json
│   └── tsconfig.json
├── .editorconfig
├── .env.example
├── .gitignore
├── .prettierignore
├── .prettierrc.json
├── AGENTS.md
├── CHANGELOG.md
├── CONTRIBUTING.md
├── README.md
├── docker-compose.yml
├── package.json
├── pnpm-lock.yaml
└── pnpm-workspace.yaml
```

## Applications and Packages

Trackly does not use `apps/` or `packages/` directories. Its two workspace
applications are the top-level `frontend/` and `backend/` packages, included
directly by `pnpm-workspace.yaml`.

## Frontend

| Directory                  | Purpose                                                                    |
| -------------------------- | -------------------------------------------------------------------------- |
| `frontend/public/`         | Static browser assets, including the Web Push service worker               |
| `frontend/src/app/`        | App Router segments, layouts, pages, loading, and error states             |
| `frontend/src/components/` | Feature components, layout/navigation, feedback, themes, and UI primitives |
| `frontend/src/config/`     | Validated frontend runtime configuration                                   |
| `frontend/src/features/`   | Feature-specific client services, schemas, and types                       |
| `frontend/src/hooks/`      | Reusable React hooks                                                       |
| `frontend/src/lib/`        | Shared frontend infrastructure and utilities                               |
| `frontend/src/services/`   | Central API access and server request services                             |
| `frontend/src/styles/`     | Global styling entry points                                                |
| `frontend/src/types/`      | Shared frontend types                                                      |
| `frontend/tests/`          | Vitest, Testing Library, browser-API, and service-worker tests             |

`frontend/components.json` configures shadcn/ui. Next.js, TypeScript, ESLint,
PostCSS, and Vitest configuration files define the frontend toolchain.

## Backend

| Directory                  | Purpose                                                                                 |
| -------------------------- | --------------------------------------------------------------------------------------- |
| `backend/src/audit/`       | Structured audit event contracts and logging                                            |
| `backend/src/auth/`        | Better Auth configuration and application integration                                   |
| `backend/src/config/`      | Typed environment validation                                                            |
| `backend/src/controllers/` | Infrastructure controllers such as health/readiness                                     |
| `backend/src/db/`          | Drizzle client, schema, migrations, runner, and seed infrastructure                     |
| `backend/src/errors/`      | Application errors and stable error codes                                               |
| `backend/src/http/`        | Standard response helpers and schemas                                                   |
| `backend/src/lib/`         | Shared backend utilities                                                                |
| `backend/src/modules/`     | Domain controllers, services, repositories, routes, schemas, and tests                  |
| `backend/src/plugins/`     | Fastify auth, CORS, database, error, rate-limit, context, security, and Swagger plugins |
| `backend/src/routes/`      | Infrastructure routes and `/api/v1` composition                                         |
| `backend/src/runtime/`     | Owned-resource lifecycle and graceful shutdown                                          |
| `backend/src/scheduler/`   | Reminder scheduler composition and execution                                            |
| `backend/src/validation/`  | Shared Zod request parsing                                                              |
| `backend/tests/database/`  | PostgreSQL schema, repository, ownership, and integration tests                         |

`backend/src/app.ts` constructs Fastify without listening, while
`backend/src/server.ts` owns HTTP startup and shutdown.

## Database

There is no root `database/` directory. Database assets live under the backend:

- `backend/src/db/schema/` contains Drizzle tables and relations.
- `backend/src/db/migrations/` contains forward SQL migrations and metadata.
- `backend/src/db/seed/` contains seed infrastructure.
- `backend/drizzle.config.ts` defines the dialect, schema, and migration paths.
- `backend/tests/database/` verifies real PostgreSQL behavior.

Better Auth owns its user, session, account, and verification tables.

## Documentation

The numbered `docs/` folders separate overview, design, feature, development,
deployment, and reference material. Milestone-era technical documents also
remain at the `docs/` root, including `quality-baseline.md`. Markdown is the
source of truth.

## Docker

There is no root `docker/` directory. Docker assets are the root
`docker-compose.yml`, each application's `Dockerfile`, and the root
`.dockerignore`. Compose defines PostgreSQL, backend, and frontend development
services, health dependencies, networking, and volumes.

## Scripts

There is no checked-in root `scripts/` directory. Commands live in root and
package `package.json` files. TypeScript entry points under `backend/src/db/`
and `backend/src/scheduler/` implement migration, seed, and scheduler commands.

## Configuration

| File                                         | Purpose                                     |
| -------------------------------------------- | ------------------------------------------- |
| `.env.example`                               | Non-secret environment template             |
| `.editorconfig`                              | Editor defaults                             |
| `.prettierrc.json`, `.prettierignore`        | Repository formatting policy                |
| `AGENTS.md`                                  | Durable engineering and architecture rules  |
| `pnpm-workspace.yaml`                        | Workspace membership                        |
| `pnpm-lock.yaml`                             | Reproducible dependency resolution          |
| `docker-compose.yml`                         | Local multi-service runtime                 |
| Package TypeScript, ESLint, and Vitest files | Package-specific compilation and validation |

## Related Documents

- [Project Overview](./01-project-overview.md)
- [System Architecture](./02-system-architecture.md)
- [Technology Stack](./03-technology-stack.md)
- [Development Workflow](./05-development-workflow.md)
