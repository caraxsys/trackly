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

The repository now defines a deterministic `pnpm validate` workflow for
formatting, lint, type checks, unit tests, and production builds. Database
integration and Docker configuration checks remain explicit because they
require local infrastructure. The repository-wide Prettier baseline, including
Drizzle metadata, is normalized and `pnpm format:check` is clean. Browser E2E,
load testing, coverage thresholds, and production-container smoke automation
remain future work.

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

| Finding                                                              | Affected area              | Repository evidence                                                                                                                                                                                                                                         | Impact                                                                                                                                                                      | Recommended action                                                                                                                                                                           | Target |
| -------------------------------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Browser CSP and security headers established (resolved in 7.2)       | Frontend and HTTP security | Fastify Helmet and Next.js now emit tested CSP, framing, MIME, referrer, and capability policies; production removes development-only `unsafe-eval`, while narrowly scoped inline script/style allowances preserve Next.js and Swagger                      | Browser-enforced containment now covers the API documentation, authenticated UI, and service worker without wildcard source policies.                                       | Replace inline allowances with nonce-based policies only as a separately tested Next.js/Swagger integration change.                                                                          | 7.2    |
| Production email ownership policy enforced (resolved in 7.2)         | Authentication             | Better Auth reads `AUTH_REQUIRE_EMAIL_VERIFICATION`; development defaults false for local usability, production defaults true and rejects disabling it, and PostgreSQL integration tests cover blocked unverified versus accepted verified sign-in          | Production protected access cannot be obtained using an unverified registered email.                                                                                        | Configure transactional verification-email delivery before opening production registration; do not weaken the fail-closed access policy.                                                     | 7.2    |
| Production dependency audit reports unresolved transitive advisories | Dependency security        | `pnpm audit:security` reports high-severity advisories in Next.js-transitive Sharp/PostCSS and Swagger UI-transitive `@fastify/static`; the current direct Next release is already current and the available Swagger fix requires a major plugin upgrade    | Crafted image/CSS inputs or an exposed vulnerable static route could reach upstream defects; production Swagger is disabled by default, reducing the static-route exposure. | Track compatible upstream releases and apply security-only upgrades with image, CSS build, Swagger, and production-image regression coverage; do not force unsupported transitive overrides. | 7.4    |
| Analytics dashboard read consolidated (resolved in 7.4)              | Analytics performance      | `/analytics` now calls `/api/v1/analytics/dashboard`; the service resolves timezone once, performs one bounded repository load, and derives all existing response objects from the shared request-scoped records. Regression tests enforce one loader call. | The stable page budget falls from six repository loads and 18 SQL statements to one load and 3 SQL statements without caching or persisting user analytics.                 | Preserve the single-load assertion and existing endpoint contracts; use representative production data before setting latency SLOs.                                                          | 7.4    |

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
| HTTP process lifecycle hardened (resolved in 7.4)                    | Backend runtime                     | `server.ts` delegates to an idempotent shutdown manager with a ten-second deadline, Fastify/database close hooks, signal and fatal-error policies, and focused success/re-entry/deadline tests                                                                                   | Repeated signals close owned resources once; fatal failures retain non-zero exit status, and stuck close hooks cannot hang a container indefinitely.                                               | Keep resource ownership explicit and add new owned resources to Fastify close hooks; preserve the scheduler's independent shutdown lifecycle.                                                                       | 7.4    |
| No automated browser E2E, accessibility engine, or coverage baseline | Testing                             | Frontend uses jsdom/Testing Library only; package manifests contain no Playwright/Cypress/axe/coverage tooling or scripts                                                                                                                                                        | Service-worker behavior, hydration, responsive layout, real cookies, focus order, and browser permission integration are not continuously verified. Test breadth cannot be quantified by coverage. | Establish a small critical-path browser suite, automated accessibility checks, and coverage reporting with pragmatic thresholds.                                                                                    | 7.4    |
| Docker validation covers development topology, not production images | Production readiness                | `docker-compose.yml` builds development targets, bind-mounts source, installs dependencies at startup, and uses development defaults; production Dockerfile stages are not used by Compose                                                                                       | Passing Compose health checks does not prove that production images start, include migrations/static assets correctly, or work with production environment requirements.                           | Add documented production-image build and smoke commands, execute both non-root images, and verify health, Swagger policy, migrations, and frontend static assets. Do not add deployment infrastructure in Phase 7. | 7.4    |
| Primary documentation reconciled (resolved in 7.4)                   | Documentation                       | README and frontend/backend/analytics documentation now describe implemented routes, the dashboard read path, runtime ownership, formatting policy, and complete validation commands                                                                                             | Contributors have an accurate current architecture and validation entry point.                                                                                                                     | Update route and operational documentation in the same milestone as future behavior changes.                                                                                                                        | 7.4    |
| Repository formatting baseline enforced (resolved in 7.4)            | Code quality                        | Prettier was applied repository-wide, including source, documentation, configuration, and Drizzle metadata; only Next.js-owned `next-env.d.ts`, which Next rewrites during builds, is ignored; `pnpm format:check` passes before and after builds                                | Formatting regressions are distinguishable from new behavior and fail a deterministic validation command.                                                                                          | Keep formatting-only diffs mechanically isolated where practical and require `pnpm format:check`.                                                                                                                   | 7.4    |

### Low

| Finding                                                        | Affected area              | Repository evidence                                                                                                                                                         | Impact                                                                                                                               | Recommended action                                                                                                               | Target |
| -------------------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Unknown-route responses reflected the raw query string         | API error handling/privacy | Prior behavior in `backend/src/plugins/error-handler.ts` used `request.url` in the public 404 message                                                                       | Tokens or sensitive query values could be reflected into clients and copied into downstream telemetry.                               | Completed in 7.0: return only the request path and protect it with an injection test.                                            | 7.1    |
| Sensitive-field redaction did not name Web Push material       | Logging/privacy            | Prior redaction paths in `backend/src/config/logger.ts` covered generic password/token/secret fields but not endpoint, `p256dh`, `auth`, or private-key names               | A future structured log expansion could accidentally include push endpoint/key material.                                             | Completed in 7.0: add explicit generic and request-body redaction paths. Verify redaction behavior as logging evolves.           | 7.3    |
| Deterministic aggregate validation added (resolved in 7.4)     | Developer experience       | Root `package.json` exposes `pnpm validate`; README separately names PostgreSQL, Docker, and diff checks that require infrastructure or Git                                 | Local and CI validation share one behavior-neutral core sequence while infrastructure prerequisites remain explicit.                 | Keep the aggregate script cross-platform and update it when workspace-wide mandatory checks change.                              | 7.4    |
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

## Final Phase 7 review

Resolved in Phase 7:

- JSON-safe public errors, session failure semantics, frontend server transport,
  and concurrent push-subscription registration (7.1);
- CSP/security headers, verified-email production policy, rate limiting,
  production diagnostics exposure, and configuration safeguards (7.2);
- correlated structured request/error logs and security-conscious audit events
  (7.3);
- the Analytics page query multiplier, HTTP lifecycle re-entry/deadline/fatal
  handling, repository formatting baseline, core validation script, and stale
  route/operational documentation (7.4).

Accepted or deferred:

- upstream transitive dependency advisories remain blocked on compatible
  releases or separately reviewed major upgrades;
- Web Push attempt/tick budgets remain deferred because changing provider
  timing can alter notification-delivery semantics;
- browser E2E, automated accessibility engines, coverage thresholds, and
  production-image smoke automation are deferred to Phase 8 rather than adding
  new test/deployment infrastructure here;
- representative production latency budgets for Today, collections, streaks,
  scheduler ticks, and Analytics remain deferred until production-shaped
  fixtures and runtime measurements exist;
- distributed rate limiting, external log retention, deployment topology,
  backups, migration rehearsal, and monitoring remain Phase 8 operational work.

No unresolved finding above is considered fixed merely because it was deferred.

## Scope boundary

Milestone 7.0 does not add a product feature, change an API contract or database
schema, redesign architecture, introduce deployment/monitoring infrastructure,
or alter Reminder and notification behavior. The only runtime fixes are the
public 404 query-string suppression and expanded logger redaction rules.
