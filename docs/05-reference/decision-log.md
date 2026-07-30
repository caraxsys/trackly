# Engineering Decision Log

## Purpose

Record architectural decisions that are verifiable in the current repository.
This is not a reconstructed project history: dates, authors, and rejected
alternatives are omitted when the repository does not establish them.

## Status

Completed

## Decision Record Format

Future records should contain:

- **Status:** Proposed, Accepted, Superseded, or Deprecated.
- **Context:** The problem and repository constraints.
- **Decision:** The selected implementation.
- **Consequences:** Benefits, costs, and operational effects.
- **Evidence:** Relevant source or maintained documentation.

## Current Decisions

### ADR-001: TypeScript Across Application Code

- **Status:** Accepted
- **Context:** The frontend and backend share contracts and require predictable
  validation and tooling.
- **Decision:** Application code uses TypeScript; JavaScript is limited to
  platform-required assets such as the browser service worker.
- **Consequences:** Both applications maintain TypeScript checks and production
  builds. Runtime input still requires Zod validation.
- **Evidence:** `AGENTS.md`, frontend and backend TypeScript configurations.

### ADR-002: Versioned Application API

- **Status:** Accepted
- **Context:** Product endpoints need an evolvable public contract while
  infrastructure and authentication have separate ownership.
- **Decision:** Trackly application endpoints live under `/api/v1`; `/health`,
  `/ready`, conditional Swagger UI, and Better Auth's `/api/auth/*` remain
  outside that namespace.
- **Consequences:** New application routes must be registered through the
  versioned router.
- **Evidence:** [API design](../01-design/api-design.md) and
  [API reference](./api-reference.md).

### ADR-003: Service and Repository Separation

- **Status:** Accepted
- **Context:** Domain rules, transport handling, and SQL require separate test
  and ownership boundaries.
- **Decision:** Controllers remain thin, services own business rules, and
  repositories own database queries. Read and write paths follow lightweight
  CQRS conventions where implemented.
- **Consequences:** Routes do not contain business logic or raw SQL.
- **Evidence:** [Backend architecture](../01-design/backend-architecture.md).

### ADR-004: PostgreSQL and Drizzle With Reviewed Migrations

- **Status:** Accepted
- **Context:** Trackly needs relational ownership constraints, logical dates,
  indexes, and TypeScript-compatible schema definitions.
- **Decision:** PostgreSQL is the database, Drizzle defines schema and relations,
  and reviewed forward-only migrations change deployed schema.
- **Consequences:** `db:push` is for local development, not production
  migration delivery. Down migrations are not generated.
- **Evidence:** [Database design](../01-design/database-design.md) and
  [database schema](./database-schema.md).

### ADR-005: Better Auth Owns Authentication Data

- **Status:** Accepted
- **Context:** Authentication tables and session semantics must remain
  compatible with the authentication provider.
- **Decision:** Better Auth owns users, accounts, sessions, verification data,
  cookies, and `/api/auth/*`. Trackly obtains sessions through Better Auth's
  server API.
- **Consequences:** Trackly must not recreate authentication tables or decode
  cookies manually.
- **Evidence:** [Authentication flow](../01-design/authentication-flow.md).

### ADR-006: User-Timezone Logical Dates

- **Status:** Accepted
- **Context:** Habits, reminders, Today, streaks, goals, and analytics depend on
  calendar days rather than server-local instants.
- **Decision:** Calendar values use PostgreSQL `date` and the authenticated
  user's timezone; instants use timezone-aware timestamps.
- **Consequences:** Date-only values are never interpreted as timestamps, and
  future/scheduled occurrence rules share timezone-aware utilities.
- **Evidence:** [Database schema](./database-schema.md) and feature documentation.

### ADR-007: Derived Metrics Are Not Persisted

- **Status:** Accepted
- **Context:** Progress, streaks, and analytics must reflect current schedules
  and check-ins without stale aggregate rows.
- **Decision:** Completion, percentages, streaks, analytics, and goal progress
  are calculated from source data.
- **Consequences:** Read paths perform bounded aggregation and require
  performance-aware queries; no aggregate cache invalidation is needed.
- **Evidence:** [Analytics feature](../02-features/phase-4-analytics.md).

### ADR-008: Server-Rendered Reads With Focused Client Boundaries

- **Status:** Accepted
- **Context:** Authenticated pages need server-side session-aware initial data
  while forms, check-ins, themes, and Web Push need browser interactivity.
- **Decision:** React Server Components are the default; Client Components are
  introduced only for required interaction.
- **Consequences:** User-specific responses use `no-store`, and browser APIs are
  isolated behind client services.
- **Evidence:** [Frontend architecture](../01-design/frontend-architecture.md).

### ADR-009: Provider-Neutral Notification Delivery

- **Status:** Accepted
- **Context:** Reminder eligibility and durable delivery must not depend on a
  specific delivery channel.
- **Decision:** Scheduler → coordinator → dispatcher → explicitly registered
  provider. `noop` and `web_push` are separate provider implementations.
- **Consequences:** No silent fallback occurs from Web Push to noop; provider
  outcomes map to delivered, failed, or skipped lifecycle states.
- **Evidence:** [Productivity feature](../02-features/phase-6-productivity.md).

### ADR-010: Structured Logs Instead of Persisted Audit Tables

- **Status:** Accepted
- **Context:** The repository needs request correlation and auditability without
  adding external infrastructure or another database lifecycle.
- **Decision:** Pino emits machine-readable production logs and structured audit
  events with redaction.
- **Consequences:** Durable retention, search, alerts, and access control depend
  on an external log platform that is not included.
- **Evidence:** [Monitoring](../04-deployment/monitoring.md).

### ADR-011: Development Compose, Production Image Targets

- **Status:** Accepted
- **Context:** Local development needs a repeatable stack, while production
  orchestration differs by hosting environment.
- **Decision:** The repository provides a development-oriented Compose topology
  and multi-stage production Docker targets, but no production orchestrator or
  reverse proxy.
- **Consequences:** Operators must supply TLS, secret management, migration
  execution, backups, monitoring, and scheduler ownership.
- **Evidence:** [Production deployment](../04-deployment/production.md).

## Maintaining This Log

Add a record when a durable architectural constraint changes. Do not record
routine implementation choices, speculative alternatives, or release history.
When a decision is replaced, keep the old record and mark it **Superseded** with
a link to the replacement.
