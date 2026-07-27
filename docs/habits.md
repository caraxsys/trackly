# Habit module

Milestone 3.0 introduced Habit queries. Milestone 3.1A adds backend-only create,
update, activation, deactivation, and soft-delete commands. Milestone 3.2A adds
the backend check-in command, and Milestone 3.2B adds its focused frontend
controls.

## API and semantics

- `GET /api/v1/habits` returns an authenticated, user-scoped, paginated
  collection.
- `GET /api/v1/habits/:id` returns an authenticated, user-scoped detail.

Collection parameters are `view`, `date`, `search`, `sort`, `order`, `page`, and
`limit`. Defaults are `today`, the user's local date, empty search, `position`,
`asc`, page `1`, and limit `20`; maximum limit is `100`.

`today` applies active date-range and weekday scheduling. `all` includes active
and inactive non-deleted habits. `inactive` includes only inactive,
non-deleted habits. All views calculate the selected-date completion projection.
Soft-deleted and unowned records are always excluded.

Search is trimmed and runs case-insensitively against name and description in
PostgreSQL. Ordering is deterministic with explicit creation-time and/or ID
tie-breakers. Pagination and totals apply to the fully filtered SQL result.
Out-of-range pages return a valid empty collection.

## Scheduling, dates, and queries

Logical dates use PostgreSQL `date` values and never pass through timestamp
conversion. The module reuses the Today timezone/date utilities. Missing or
invalid preferences resolve to UTC; invalid stored timezones are logged safely.
ISO weekdays use Monday `1` through Sunday `7`. Completion is derived as
`completed_count >= target_count`.

Repositories own Drizzle queries; services resolve date/timezone and map
semantics; controllers derive Better Auth identity; routes own Zod validation
and OpenAPI. Collection uses one item query and one count query. Grouped schedule
projections avoid N+1 queries; detail uses one bounded query.

No migration was required. Existing indexes cover ownership, active state,
schedule lookup, and check-ins. No speculative search index was added.

## Mutation API

All mutation routes require a Better Auth session and derive ownership from the
authenticated user:

- `POST /api/v1/habits`
- `PATCH /api/v1/habits/:id`
- `DELETE /api/v1/habits/:id`
- `POST /api/v1/habits/:id/activate`
- `POST /api/v1/habits/:id/deactivate`

The existing query repository/service/controller path remains unchanged. Writes
use a separate command controller, command service, and command repository.
Controllers only authenticate and shape responses, the command service owns
business rules, and the repository owns Drizzle SQL.

Create and schedule-replacing updates use database transactions. Daily habits
persist no schedule rows. Weekly and custom habits require at least one unique
ISO weekday (`1` Monday through `7` Sunday), returned in ascending order. A
frequency change replaces the schedule atomically.

Names are trimmed and cannot be blank. Target counts must be positive, logical
end dates cannot precede start dates, and optional categories must be
non-deleted categories owned by the same user. Partial updates validate the
resulting aggregate, including its date range and schedule.

Delete sets `deleted_at` only. Schedule rows are retained, repeated deletion is
indistinguishable from a missing habit, and normal reads continue to exclude
deleted rows. Activating an active habit or deactivating an inactive habit
returns `409 CONFLICT`. Missing, foreign, and deleted resources return the same
sanitized `404 NOT_FOUND` contract.

No schema change or migration was required for Milestone 3.1A.

## Frontend

`/habits` and `/habits/[id]` are dynamic Server Components. Requests forward the
HTTP-only session cookie internally and use `cache: no-store`. View, date,
search, sort, order, and page live in shareable URL parameters. Native GET forms
handle search/sorting; semantic links handle views, dates, and pagination.

The vertical list, detail layout, common search input, pagination, and status
badge are responsive, themed, and read-only. Empty states distinguish Today,
All, Inactive, and search. Loading, error, validation, and not-found states
remain inside the app shell.

Milestone 3.1B adds `/habits/new` and `/habits/[id]/edit`. Both routes are
dynamic Server Components that verify the session and load owned categories;
edit also loads the current habit and uses the existing not-found behavior for
missing, deleted, or foreign records.

The reusable client-side `HabitForm` owns React Hook Form state, shared Zod
validation, weekday interaction, pending state, backend field errors, and
submission through the central Axios client. Daily frequency hides weekdays
and submits an empty schedule. Weekly and custom schedules require unique,
ascending ISO weekdays. Edit submissions omit `isActive` so they cannot
overwrite a concurrent lifecycle transition.

The detail page exposes Edit, Activate/Deactivate, and Delete actions.
Lifecycle changes use their dedicated endpoints and accessible, focus-managed
inline confirmation dialogs. Conflicts receive a safe refresh-oriented message.
Delete explains soft deletion and redirects to the collection; there is no
undo.

Dirty forms register `beforeunload` protection for refresh and close. Cancel
uses a native confirmation when dirty, then returns to the detail page for edit
or the collection for create. Successful create and edit operations redirect to
the detail page with accessible status feedback.

## Check-in API

`POST /api/v1/habits/:id/check-in` sets absolute progress for one logical
calendar date. The body requires an integer `completedCount` and accepts an
optional `date`; an omitted date resolves to the authenticated user's local
today with the existing safe UTC fallback.

The habit must be owned, active, non-deleted, within its date range, and
scheduled on the resolved ISO weekday. Counts range from zero through the
habit's target. Positive counts use the existing unique habit/date constraint
for an idempotent upsert. Zero deletes any stored row so zero-progress records
are not retained. Completion remains derived from
`completedCount >= targetCount`, and Today reads reflect writes immediately.

Missing, foreign, and deleted habits share the sanitized 404 response. Inactive
or unscheduled habits return a standardized 409 conflict.

The reusable frontend `HabitCheckInControl` appears only on Today habit items
and the habit detail local-date projection. Target-one habits toggle between
absolute counts zero and one; larger targets use bounded decrement/increment
buttons that send the resulting absolute value. Initial progress remains
server-rendered, successful responses update visible state, and route refresh
keeps server aggregates consistent. Inactive and unscheduled detail states are
read-only.

Milestone 3.2B intentionally adds no generic collection-row controls, optimistic
cache, global state, increment API, streak, insight, achievement, or reminder
behavior. Full Docker and browser validation remains Milestone 3.2C scope.
