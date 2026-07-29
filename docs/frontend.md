# Frontend foundation

The Habits collection and detail pages are dynamic Server Components backed by
uncached internal API requests. Shareable collection state lives in the URL.
Reusable search, pagination, and status components form the initial common
collection UI foundation. See [`habits.md`](./habits.md).

Trackly uses the Next.js App Router with Server Components by default.
Interactive boundaries are limited to active navigation, theme control, and
global error recovery.

## Architecture

- `src/app` contains route composition, metadata, and router state files.
- `src/app/(app)` groups pages that share the application shell without adding
  a URL segment.
- `src/app/(auth)` contains the guest-only `/login` and `/register` shell.
- `src/features/auth` contains validation and safe auth error mapping.
- `src/components/layout` contains shell and page-composition primitives.
- `src/components/navigation` contains responsive navigation behavior.
- `src/components/feedback` contains loading, empty, and error states.
- `src/components/theme` contains the persisted theme provider and control.
- `src/config` contains static application configuration such as navigation.
- `src/services` contains the central HTTP client and infrastructure services.
- `src/types` contains shared transport types.
- `src/features` is reserved for future business-specific modules.

Shared components must remain free of business rules and business datasets.

The `/analytics` page is a dynamic Server Component using an uncached internal
API request. Period and selected logical date remain in the URL. Its summary
uses semantic navigation, a native GET date form, a definition list, and a
responsive card grid. It intentionally has no charts, heatmaps, streaks, or
client-side analytics cache.

Milestone 4.0B validated direct URL loading, preserved period/date state,
browser history, loading and safe invalid-query states, responsive desktop and
mobile layouts, focus visibility, theme modes, and console/hydration
cleanliness against the Dockerized API.

## Route map

| Route        | Purpose                                |
| ------------ | -------------------------------------- |
| `/`          | Redirects to `/today`                  |
| `/today`     | Authenticated daily dashboard          |
| `/habits`    | Authenticated Habit collection         |
| `/analytics` | Authenticated Habit analytics summary  |
| `/tasks`     | Future tasks module placeholder        |
| `/goals`     | Authenticated Goal collection          |
| `/insights`  | Reserved future insights placeholder   |
| `/settings`  | Authenticated settings and preferences |

Application-shell routes are protected; authentication routes are guest-only.
Implemented routes load authenticated user-owned data through their server
services; reserved placeholders do not.

## Application shell

Desktop layouts use a persistent left sidebar and compact top bar. Small
screens replace the sidebar with a five-item bottom navigation. Settings stays
available through the top bar on mobile. Active links use `aria-current="page"`
and all interactive elements retain visible keyboard focus.

## Theme and design tokens

Light, dark, and system modes are managed by `next-themes`. The selected mode
persists in the browser and the root document suppresses only the expected
theme-class hydration difference.

Color, surface, border, focus, destructive, and radius tokens live in
`src/styles/globals.css`. Both themes define deliberate values rather than
applying a blanket color inversion.

## Public environment

The browser API origin is required:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_AUTH_URL=http://localhost:4000
INTERNAL_API_URL=http://backend:4000
```

Public variables are validated with Zod in `src/lib/env.ts`. Missing or invalid
URLs fail clearly during startup/build. Never place secrets in a
`NEXT_PUBLIC_*` variable.

Browser calls use the public localhost URL with credentials. Server Components
forward the Cookie header to `INTERNAL_API_URL` and ask Better Auth for the
session before rendering. This prevents protected-content flashes without
middleware requests for static assets. Return destinations accept only
same-origin relative paths.

## API client

Use the exported Axios instance in `src/services/http-client.ts`. It provides:

- the validated API base URL;
- a ten-second timeout;
- JSON headers;
- generated request IDs;
- normalized backend errors through `ApiError`.

Do not create another Axios instance. `systemService` contains the only current
API methods (`/health` and `/ready`) and is intended for diagnostics and tests,
not persistent UI status indicators.

## Router states

The root route provides loading, global error, not-found, title-template,
description, viewport, and theme-color foundations. Public errors use friendly
messages and do not render raw exceptions or stack traces.

## Today dashboard

`/today` is a dynamic Server Component backed by the authenticated
`GET /api/v1/today` endpoint. The initial request forwards the incoming cookie
to `INTERNAL_API_URL`, uses `cache: no-store`, and renders the dashboard without
a duplicate browser fetch. React request memoization deduplicates the session
lookup shared by the protected layout and page.

The page is composed from focused `components/today` presentation components
for the header, URL-based date navigation, semantic progress, habits, task
groups, goals, and the cohesive empty state. Previous/next links use
`/today?date=YYYY-MM-DD`; returning to `/today` delegates current-local-date
resolution to the backend.

Date-only values are formatted as calendar values without timezone conversion.
Task timestamps are formatted with the timezone returned by the API. Greeting
selection happens only on the server, preventing clock-based hydration
differences.

The route has dashboard-shaped loading skeletons, a retryable route error, and
a friendly invalid-date state. Scheduled habit items render the focused
`HabitCheckInControl`; tasks and goals remain read-only. Responsive layout uses
one column on mobile and two primary columns at wide desktop sizes.

## Tests

Run the deterministic Vitest and React Testing Library suite from the
repository root:

```bash
pnpm test:frontend
```

The suite covers the root redirect, shell, expected navigation, active state,
accessible theme control, API error normalization, and environment validation.

## Habit CRUD

Habit create and edit pages use Server Components for authenticated habit and
category loading, with a focused client boundary around `HabitForm`.
`habit-mutation-service.ts` is the only browser mutation transport and reuses
the configured Axios client. Form validation mirrors the backend date, target,
name, category, frequency, and ISO-weekday contracts.

Activation, deactivation, and soft deletion remain explicit lifecycle actions
on the detail page rather than generic form edits. Pending controls are
disabled, conflicts are presented safely, and successful writes refresh or
redirect to authoritative server-rendered data. Dirty forms use
`beforeunload` plus native Cancel confirmation; no global navigation blocker,
autosave, optimistic state, or client cache is introduced.

## Habit check-in

`HabitCheckInControl` is a small Client Component embedded in server-rendered
Today habit items and the habit detail date projection. Initial count and
completion state come from the server; successful mutations update the visible
projection and refresh the route so aggregate server data follows.

Target-one habits expose a complete/reset action. Larger targets expose bounded
decrement and increment actions with textual `completed / target` progress.
Every interaction sends the final absolute `completedCount` through the central
Axios client, never an increment command.

Today passes its resolved URL/local date, while detail passes
`habit.today.date`. Inactive or unscheduled detail projections remain read-only.
Pending controls are disabled and announced; success uses a status region, and
safe conflict or request failures use an alert.

Milestone 3.2C validated both integration points in a real browser against the
Dockerized API and PostgreSQL database. Progress persisted after reload, Today
aggregates refreshed from authoritative server data, zero reset removed the
stored row, keyboard and focus behavior remained accessible, the narrow layout
had no horizontal overflow, light/dark/system themes rendered correctly, and
valid flows produced no console or hydration errors. Generic Habit collection
rows intentionally remain check-in-free because they do not represent a
specific logical date.
