# Trackly quality baseline

This document records the repository state audited for Milestone 7.0 on the
`feature/milestone-7.0-quality-baseline` branch. It is an evidence-based
baseline for Phase 7, not a claim that Trackly is production-ready.

## Current architecture

Trackly is a pnpm workspace containing:

- a Next.js 16 and React 19 frontend using App Router Server Components by
  default, small client boundaries, a central Axios client, and server-side
  `fetch` services;
- a Fastify 5 API organized around validated routes, thin controllers,
  services, repositories, centralized error handling, Pino logging, Better
  Auth, Swagger, and Drizzle;
- PostgreSQL 17 with committed forward migrations, user-scoped domain tables,
  soft deletion, logical `date` values, and ownership/index constraints;
- a dedicated Reminder scheduler process with durable occurrence claims and
  explicit Noop and Web Push providers;
- development Docker Compose services for frontend, backend, and PostgreSQL.

Repository evidence:

- `frontend/src/app`, `frontend/src/components`, `frontend/src/services`
- `backend/src/app.ts`, `backend/src/modules`, `backend/src/plugins`
- `backend/src/db/schema`, `backend/src/db/migrations`
- `backend/src/scheduler`
- `docker-compose.yml`

## Validation baseline

The root workspace exposes formatting, lint, type-check, build, frontend test,
backend test, and PostgreSQL integration commands in `package.json`. Backend
HTTP tests use Fastify injection; frontend tests use Vitest, jsdom, and React
Testing Library; database tests create and migrate an isolated PostgreSQL
database.

Following the two focused 7.0 regression additions, the automated suites
contain 131 backend tests, 108 frontend tests, and 35 PostgreSQL integration
tests. The validation commands and their actual results are recorded in the
Milestone 7.0 final report.

The repository does not currently define a single full-validation script,
coverage command, browser E2E suite, load-test suite, or production-container
smoke-test workflow. The root formatting check currently reports 179 files,
including application sources, documentation, and generated Drizzle snapshots;
this is a baseline failure rather than a change introduced by 7.0.

Evidence:

- `package.json`
- `backend/package.json`
- `frontend/package.json`
- `backend/vitest.config.ts`
- `backend/vitest.database.config.ts`
- `frontend/vitest.config.ts`

## Confirmed strengths

1. **Clear backend boundaries.** Routes own validation and OpenAPI metadata,
   controllers resolve authenticated identity, services own domain behavior,
   and repositories own Drizzle queries. A repository search found no database
   operations in module route, controller, or service files.
2. **Ownership is consistently explicit.** User-owned repositories scope
   reads and mutations by `user_id`; integration tests cover cross-user access
   for core domains.
3. **Centralized transport conventions.** `backend/src/plugins/error-handler.ts`
   normalizes Zod, Fastify validation, malformed JSON, application errors,
   unknown routes, and unexpected failures into the standard envelope.
4. **Useful security foundations.** Better Auth owns sessions, cookies are
   secure in production, credentialed CORS uses an allowlist, Helmet is
   installed, authentication has targeted rate limits, and sensitive request
   headers are redacted.
5. **Timezone and logical-date discipline.** Domain code uses PostgreSQL
   `date`, user timezones, deterministic recurrence utilities, and documented
   UTC fallback behavior.
6. **Deterministic data access.** Collection queries use explicit ordering and
   stable ID tie-breakers; common list queries are paginated.
7. **No persisted derived analytics.** Analytics, streaks, and progress remain
   derived, consistent with `AGENTS.md`.
8. **Strong functional test breadth.** Current tests cover domain calculations,
   authentication, ownership, schema constraints, scheduler behavior,
   notification providers, component states, and accessible text/controls.
9. **Non-root production images.** Both production Dockerfiles create and run
   as dedicated unprivileged users.

## Findings

No Critical finding was confirmed during this audit. That does not eliminate
unknown risk; coverage and runtime gaps below limit the confidence of that
statement.

### High

| Finding                                                                 | Affected area              | Repository evidence                                                                                                                                                                                                                                                                                                  | Impact                                                                                                                                                                                                | Recommended action                                                                                                                                                                           | Target |
| ----------------------------------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Browser CSP and security headers established (resolved in 7.2)          | Frontend and HTTP security | Fastify Helmet and Next.js now emit tested CSP, framing, MIME, referrer, and capability policies; production removes development-only `unsafe-eval`, while narrowly scoped inline script/style allowances preserve Next.js and Swagger                                                                               | Browser-enforced containment now covers the API documentation, authenticated UI, and service worker without wildcard source policies.                                                                 | Replace inline allowances with nonce-based policies only as a separately tested Next.js/Swagger integration change.                                                                          | 7.2    |
| Production email ownership policy enforced (resolved in 7.2)            | Authentication             | Better Auth reads `AUTH_REQUIRE_EMAIL_VERIFICATION`; development defaults false for local usability, production defaults true and rejects disabling it, and PostgreSQL integration tests cover blocked unverified versus accepted verified sign-in                                                                   | Production protected access cannot be obtained using an unverified registered email.                                                                                                                  | Configure transactional verification-email delivery before opening production registration; do not weaken the fail-closed access policy.                                                     | 7.2    |
| Production dependency audit reports unresolved transitive advisories    | Dependency security        | `pnpm audit:security` reports high-severity advisories in Next.js-transitive Sharp/PostCSS and Swagger UI-transitive `@fastify/static`; the current direct Next release is already current and the available Swagger fix requires a major plugin upgrade                                                             | Crafted image/CSS inputs or an exposed vulnerable static route could reach upstream defects; production Swagger is disabled by default, reducing the static-route exposure.                           | Track compatible upstream releases and apply security-only upgrades with image, CSS build, Swagger, and production-image regression coverage; do not force unsupported transitive overrides. | 7.4    |
| Analytics page multiplies database work across six independent requests | Analytics performance      | `frontend/src/app/(app)/analytics/page.tsx` concurrently requests summary, history, insights, heatmap, category rankings, and habit rankings; each backend path calls analytics repository aggregation, whose `listHabitRecords()` performs three queries in `backend/src/modules/analytics/analytics.repository.ts` | A single page view can execute approximately 18 overlapping analytics queries and repeatedly materialize the same habit, schedule, and check-in data. Cost grows with history length and habit count. | Measure with representative data, consolidate shared read work behind one request or request-scoped computation, and establish query/time budgets without persisting aggregates prematurely. | 7.4    |

### Medium

| Finding                                                              | Affected area                       | Repository evidence                                                                                                                                                                                                                                                              | Impact                                                                                                                                                                                             | Recommended action                                                                                                                                                                                                  | Target |
| -------------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| JSON-safe application error details enforced (resolved in 7.1)       | API error handling                  | `AppError.details` now uses the recursive `JsonValue` contract and defensively omits unsupported or circular runtime values; injection tests cover safe and unsafe serialization                                                                                                 | The centralized handler no longer returns arbitrary service objects, causes, or unsupported values as public error details.                                                                        | Keep new public details within `JsonValue`; introduce narrower per-error schemas when a domain requires a documented details contract.                                                                              | 7.1    |
| Shared server-side API handling introduced (resolved in 7.1)         | Frontend error handling             | Analytics, habits, Today, goals, reminders, and preferences now use `frontend/src/services/server-api.ts` for cookie forwarding, standard-envelope parsing, malformed-response handling, and a common abort timeout                                                              | Empty, HTML, proxy, timeout, and malformed responses now fail through predictable typed transport errors while existing page-specific error classes remain compatible.                             | Extend the helper only as new server-rendered API clients are added; request-ID display remains a future UX decision rather than part of this milestone.                                                            | 7.1    |
| Session dependency failures distinguished (resolved in 7.1)          | Frontend and backend authentication | Backend session lookup rejections become a sanitized `SERVICE_UNAVAILABLE` error, while the frontend returns `null` only for valid unauthenticated responses and throws for dependency or malformed-session failures                                                             | Backend incidents no longer masquerade as logged-out sessions or cause misleading login redirects.                                                                                                 | Preserve Better Auth's null/unauthenticated semantics and route dependency failures through established error boundaries.                                                                                           | 7.1    |
| Concurrent subscription registration handled (resolved in 7.1)       | Push subscription API               | The repository catches PostgreSQL unique conflicts, reloads the committed active endpoint, preserves ownership, and deterministically updates same-owner registrations; PostgreSQL integration coverage exercises the race                                                       | Concurrent same-device registration is idempotent and foreign ownership remains a stable conflict instead of an unexpected HTTP 500.                                                               | Retain the active-endpoint unique index and concurrency regression test when modifying subscription persistence.                                                                                                    | 7.1    |
| Application abuse controls established (resolved in 7.2)             | API security                        | The Fastify rate-limit plugin applies configurable per-IP read and mutation budgets to `/api/v1`, returns the standard `RATE_LIMIT_EXCEEDED` 429 envelope, excludes health/internal/auth-owned flows, and uses forwarded addresses only when `TRUST_PROXY` is explicitly enabled | Automated clients can no longer exercise application reads and mutations without bounded request budgets.                                                                                          | Tune limits from measured production traffic in 7.3/7.4; keep proxy trust aligned with deployment topology.                                                                                                         | 7.2    |
| Production documentation exposure gated (resolved in 7.2)            | API attack surface                  | Swagger defaults off in production unless explicitly enabled, temporary diagnostics default off and are forbidden in production, while both remain convenient in development                                                                                                     | Production no longer exposes internal discovery or temporary validation surface unintentionally.                                                                                                   | Remove the diagnostic route entirely when its remaining validation coverage is moved to direct tests.                                                                                                               | 7.2    |
| Web Push external calls have no Trackly-owned timeout/budget         | Scheduler reliability               | `WebPushNotificationProvider.send()` awaits each `webPush.sendNotification()` sequentially in `backend/src/modules/notifications/web-push.provider.ts`; the scheduler also processes occurrences sequentially                                                                    | A slow provider or many device subscriptions can delay the entire scheduler tick and later reminders.                                                                                              | Establish per-attempt timeout and tick budgets, measure expected fan-out, and retain bounded failure isolation without adding a queue prematurely.                                                                  | 7.4    |
| Structured audit events established (resolved in 7.3)                | Auditability                        | The shared audit logger emits actor, action, resource type/ID, timestamp, outcome, error code, and request ID for authentication/account activity plus Habit, Goal, Reminder, and preference mutations; controllers never pass request payloads                                  | Operators can correlate important attempted and successful state changes without storing credentials or sensitive payloads.                                                                        | Preserve the stable audit envelope and extend coverage alongside future security-sensitive mutations; define external retention only when deployment infrastructure is selected.                                    | 7.3    |
| Request and error observability standardized (resolved in 7.3)       | Observability                       | Custom completion logs emit query-free path, method, status, duration, request/user IDs; internal errors emit sanitized structured context and server-only stacks; capture-based tests verify JSON shape, correlation, and secret removal                                        | Request latency, failures, and audit outcomes can be correlated using machine-readable local logs without changing public responses.                                                               | Establish metrics/SLOs only after representative runtime data exists; external collection and distributed tracing remain deliberately out of scope.                                                                 | 7.3    |
| Process-failure and shutdown behavior is only partially hardened     | Backend runtime                     | `backend/src/server.ts` has signal handlers but no re-entry guard or shutdown deadline and no explicit `unhandledRejection`/`uncaughtException` policy                                                                                                                           | Repeated signals or stuck shutdown hooks can leave termination behavior ambiguous; fatal asynchronous failures may not flush logs predictably.                                                     | Add idempotent shutdown, bounded termination, fatal-error policy, and focused process-level tests.                                                                                                                  | 7.3    |
| No automated browser E2E, accessibility engine, or coverage baseline | Testing                             | Frontend uses jsdom/Testing Library only; package manifests contain no Playwright/Cypress/axe/coverage tooling or scripts                                                                                                                                                        | Service-worker behavior, hydration, responsive layout, real cookies, focus order, and browser permission integration are not continuously verified. Test breadth cannot be quantified by coverage. | Establish a small critical-path browser suite, automated accessibility checks, and coverage reporting with pragmatic thresholds.                                                                                    | 7.4    |
| Docker validation covers development topology, not production images | Production readiness                | `docker-compose.yml` builds development targets, bind-mounts source, installs dependencies at startup, and uses development defaults; production Dockerfile stages are not used by Compose                                                                                       | Passing Compose health checks does not prove that production images start, include migrations/static assets correctly, or work with production environment requirements.                           | Add documented production-image build and smoke commands, execute both non-root images, and verify health, Swagger policy, migrations, and frontend static assets. Do not add deployment infrastructure in Phase 7. | 7.4    |
| Primary documentation is materially stale                            | Documentation                       | `README.md` says product modules remain unimplemented and describes goals/settings as placeholders; `docs/architecture.md` says future business capabilities remain out of scope; `docs/frontend.md` route map labels implemented routes as future placeholders                  | Contributors and operators can make incorrect assumptions about current capability and validation requirements.                                                                                    | Reconcile README, architecture, frontend, backend, and module documents against the current route/schema inventory; add a maintained validation matrix.                                                             | 7.4    |
| Repository formatting baseline is not enforceable                    | Code quality                        | `pnpm format:check` reports 179 files across backend, frontend, docs, and Drizzle metadata while lint and builds use the committed formatting as-is                                                                                                                              | The documented full workflow fails before a contributor changes code, obscuring new formatting regressions and encouraging broad noisy rewrites.                                                   | Agree on line-ending/generated-file policy, configure Prettier ignores/overrides, normalize the repository in one reviewed mechanical change, and enforce the clean baseline afterward.                             | 7.4    |

### Low

| Finding                                                        | Affected area              | Repository evidence                                                                                                                                                         | Impact                                                                                                                               | Recommended action                                                                                                               | Target |
| -------------------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Unknown-route responses reflected the raw query string         | API error handling/privacy | Prior behavior in `backend/src/plugins/error-handler.ts` used `request.url` in the public 404 message                                                                       | Tokens or sensitive query values could be reflected into clients and copied into downstream telemetry.                               | Completed in 7.0: return only the request path and protect it with an injection test.                                            | 7.1    |
| Sensitive-field redaction did not name Web Push material       | Logging/privacy            | Prior redaction paths in `backend/src/config/logger.ts` covered generic password/token/secret fields but not endpoint, `p256dh`, `auth`, or private-key names               | A future structured log expansion could accidentally include push endpoint/key material.                                             | Completed in 7.0: add explicit generic and request-body redaction paths. Verify redaction behavior as logging evolves.           | 7.3    |
| Full validation requires several manually ordered commands     | Developer experience       | Root `package.json` has separate scripts but no aggregate validation command                                                                                                | Local validation can omit database tests, builds, or diff checks, producing inconsistent handoffs.                                   | Add a documented, cross-platform aggregate command after Phase 7 decides which checks require Docker/PostgreSQL.                 | 7.4    |
| Dependency audit policy documented (partially resolved in 7.2) | Dependency governance      | `pnpm audit:security` now audits production dependencies at high severity, and backend security documentation identifies the lockfile as the reproducible resolution source | Auditable high-severity findings have a standard local check, while broad manifest ranges still require disciplined lockfile review. | Retain frozen-lockfile installs; evaluate automated dependency update governance separately without bundling unrelated upgrades. | 7.2    |

### Informational

| Finding                                                                                  | Affected area        | Repository evidence                                                                                                                    | Impact                                                                                                           | Recommended action                                                                                                                         | Target |
| ---------------------------------------------------------------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| Development Compose intentionally uses predictable defaults and published database ports | Local infrastructure | `docker-compose.yml` defaults PostgreSQL credentials, Better Auth secret, and publishes port 5432 while setting `NODE_ENV=development` | Appropriate for local onboarding but unsafe if the development topology is mistaken for a production deployment. | Keep the distinction explicit in production-readiness documentation and smoke-test production images separately.                           | 7.4    |
| Forward migrations have no repository rollback workflow                                  | Database operations  | `backend/src/db/migrations` and `db:migrate` provide forward migration only                                                            | Rollback during an operational incident requires a deliberate forward-fix or manually reviewed procedure.        | Document the forward-fix policy and rehearsal expectations; do not invent automatic down migrations without reviewing data-loss semantics. | 7.4    |

## Phase 7 follow-up plan

### 7.1 Error Handling & API Refinement

1. Define JSON-safe public application error details and error factories.
2. Consolidate frontend server-side API transport and timeout behavior.
3. Separate unauthenticated sessions from backend/session-service failure.
4. Make push-subscription registration concurrency-safe and idempotent.
5. Review stable error codes, 404 behavior, request IDs, and OpenAPI examples.

Exit evidence should include injection tests, server-service tests, concurrent
PostgreSQL tests, and an OpenAPI regression.

### 7.2 Security Hardening

1. Add and test frontend/backend Content Security Policy and security headers.
2. Decide and implement email-verification policy.
3. Define application endpoint rate-limit classes and standardized 429 errors.
4. Gate Swagger and remove or protect temporary diagnostics in production.
5. Review cookies, trusted proxies, CORS/origin policy, dependency updates, and
   secret-handling documentation.

Exit evidence should include header tests, origin/rate-limit tests,
authentication integration tests, and production-environment checks.

### 7.3 Audit Logging & Observability

1. Define structured audit events for authentication and mutations.
2. Standardize log event fields, severity, request/actor correlation, and
   privacy rules.
3. Add instrumentation hooks for request latency, database work, scheduler
   outcomes, and Web Push outcomes without deploying monitoring systems.
4. Harden graceful shutdown and fatal-error handling.
5. Add tests that verify redaction and stable audit-event shape.

### 7.4 Performance, Tests & Documentation

1. Benchmark analytics with representative 7/30/90-day fixtures and eliminate
   repeated page-level aggregation.
2. Establish query and response-time budgets for Today, collections, analytics,
   streaks, and scheduler ticks.
3. Add critical-path browser E2E, automated accessibility, coverage reporting,
   and production-image smoke tests.
4. Reconcile stale repository documentation and publish a validation matrix.
5. Document forward migration recovery and production-image operation.
6. Add one reliable aggregate validation workflow after its database/Docker
   prerequisites are explicit.

## Scope boundary

Milestone 7.0 does not add a product feature, change an API contract or database
schema, redesign architecture, introduce deployment/monitoring infrastructure,
or alter Reminder and notification behavior. The only runtime fixes are the
public 404 query-string suppression and expanded logger redaction rules.
