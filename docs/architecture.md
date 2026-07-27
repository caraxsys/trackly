# Architecture

Habit reads preserve the established boundaries: repositories own queries,
services own interpretation, controllers own authenticated identity, and routes
own validation/OpenAPI. Authenticated collection/detail pages use Server
Components and `no-store`.

Trackly is organized as independently deployable frontend and backend
applications in a pnpm workspace.

The frontend uses feature-oriented folders within the Next.js App Router. The
backend keeps transport, application, and persistence concerns separated.
Future business capabilities should enter through validated routes, delegate to
services, and use repositories for persistence. Business modules remain out of
scope.

Better Auth owns email/password authentication, database sessions, and
`/api/auth/*`. Trackly-owned protected endpoints remain under `/api/v1` and use
the shared server-side session helper.

Authenticated domain reads use repository/service/controller modules.
Repositories own Drizzle access, services own aggregation and interpretation,
and controllers contain no SQL. The Today aggregation intentionally has a
fixed query count rather than per-record data loading.

The Today page is the server-rendered frontend boundary for this aggregation.
User-specific responses are always fetched with `no-store` through the internal
backend URL and are never placed in shared static caches. URL query state makes
date navigation shareable and refresh-safe without a global client store.
