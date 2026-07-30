# Contributing to Trackly

## Purpose

Define the repository-backed workflow and quality expectations for Trackly
contributors.

## Status

Completed

## Before You Start

Read:

- [Engineering rules](./AGENTS.md)
- [Documentation index](./docs/README.md)
- [Development workflow](./docs/00-overview/05-development-workflow.md)
- [Local development](./docs/03-development/local-development.md)
- [Testing](./docs/03-development/testing.md)

Changes must preserve the established TypeScript, Clean Architecture,
Service/Repository, validation, ownership, security, and accessibility rules.
Do not add a product feature or broad refactor to an unrelated change.

## Prerequisites

- Git
- Node.js compatible with the checked-in Dockerfiles (Node 24)
- Corepack
- pnpm 10.13.1
- Docker with Docker Compose for the supported full-stack workflow

## Repository Setup

```bash
corepack enable
pnpm install
Copy-Item .env.example .env
docker compose up --build
```

On non-PowerShell shells, copy `.env.example` with the platform's equivalent
command. Fill local values without committing `.env`.

The development services are normally available at:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`
- Health: `http://localhost:4000/health`
- Readiness: `http://localhost:4000/ready`
- Swagger UI: `http://localhost:4000/docs` when enabled

## Branch and Change Scope

The repository does not define an automated branch or pull-request policy.
Use the branch assigned by the project owner and confirm release expectations
before committing or publishing work.

Keep each change focused:

1. Inspect the implementation and related documentation.
2. State the behavior and constraints being changed.
3. Add or update focused tests with behavior changes.
4. Avoid unrelated formatting or refactoring.
5. Update the authoritative documentation.
6. Run the relevant checks before requesting review.

Never commit secrets, populated environment files, generated credentials,
database dumps, or browser push subscription material.

## Architecture Expectations

- Put public application endpoints under `/api/v1`.
- Keep Better Auth routes under `/api/auth/*`.
- Keep health, readiness, and documentation endpoints outside `/api/v1`.
- Keep routes and controllers thin.
- Put business rules in services and database queries in repositories.
- Validate public inputs with Zod.
- Use the authenticated session for ownership; never accept `userId` from input.
- Exclude soft-deleted rows from normal public operations.
- Use deterministic ordering with a stable final tie-breaker.
- Use logical `date` values for calendar days and timezone-aware timestamps for
  instants.
- Do not persist derived progress, percentages, streaks, or analytics.
- Prefer React Server Components and use small Client Components for required
  interaction.
- Reuse the central frontend API client.
- Preserve semantic HTML, keyboard support, visible focus, and responsive
  behavior.

## Database Changes

Every schema change requires a reviewed migration.

```bash
pnpm db:generate
pnpm db:migrate
pnpm test:database
```

Review generated SQL and Drizzle metadata. Do not edit Better Auth-owned schema
without an intentional Better Auth configuration or version change. Do not use
`db:push` as the production migration mechanism.

See [database migrations](./docs/03-development/database-migrations.md) and the
[database reference](./docs/05-reference/database-schema.md).

## Tests and Validation

Run the smallest relevant tests while developing. Before review, run:

```bash
pnpm validate
pnpm test:database
docker compose config --quiet
git diff --check
```

The root validation script runs repository formatting checks, lint, type
checks, backend tests, frontend tests, and production builds. PostgreSQL
integration tests remain explicit because they require a running database.

Security-sensitive changes should also run:

```bash
pnpm audit:security
```

If a required check cannot run, report the exact command, failure, environment
constraint, and residual risk. Do not describe a skipped check as passing.

## Code Style

- Run `pnpm format` only for intentional formatting changes.
- Require `pnpm format:check` to pass repository-wide.
- Follow existing ESLint and TypeScript configurations.
- Keep functions small and names explicit.
- Prefer reusable composition to inheritance and duplication.
- Avoid comments that merely restate code.
- Do not manually edit generated files unless the owning tool requires it.

## Documentation Contributions

Markdown is the documentation source of truth. Generated PDF or DOCX output
must not replace it.

When editing documentation:

- Base statements on current source, configuration, migrations, or tests.
- Use relative links.
- Use consistent terms from the [glossary](./docs/05-reference/glossary.md).
- Give Mermaid nodes clear labels and keep diagrams consistent with prose.
- Distinguish implemented behavior from recommendations and limitations.
- Do not reconstruct release history without repository evidence.
- Run Prettier and the link audit described in the development documentation.

## Security and Privacy Review

Before review, confirm that the change does not:

- Return stack traces, raw database errors, or secrets.
- Log authorization headers, cookies, passwords, tokens, VAPID key material, or
  complete push subscription endpoints.
- Expose server-only values through `NEXT_PUBLIC_*`.
- Weaken CORS, CSP, cookie, trusted-origin, or production environment checks.
- Add an unscoped query for user-owned data.
- Trust arbitrary notification URLs.

Use sanitized, JSON-safe public error details and preserve the standard API
error envelope.

## Review Checklist

- [ ] Change is focused and follows `AGENTS.md`.
- [ ] Product behavior is documented and tested.
- [ ] Public input is validated.
- [ ] User-owned access is session-scoped.
- [ ] Error and logging behavior is safe.
- [ ] Database changes include reviewed migrations.
- [ ] Accessibility is preserved.
- [ ] Documentation and cross-links are current.
- [ ] Required validation commands pass.
- [ ] No secrets or populated environment files are included.

## Reporting Problems

Include reproduction steps, expected and actual behavior, environment, relevant
command output, and sanitized request IDs. Never attach credentials, cookies,
tokens, private keys, or production data. Consult
[Troubleshooting](./docs/05-reference/troubleshooting.md) first.
