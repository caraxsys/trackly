# Architecture

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
