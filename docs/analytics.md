# Analytics foundation

Milestone 4.0 adds a read-only, derived Habit analytics summary. It does not
persist percentages, completion totals, or other aggregates.

## Endpoint

`GET /api/v1/analytics/summary` requires an authenticated session. The required
`period` query is `day`, `week`, or `month`; optional `date=YYYY-MM-DD`
defaults to the authenticated user's local today.

The response contains the resolved inclusive `startDate` and `endDate`, plus
`scheduledCount`, `completedCount`, `completionRate`, `totalTargetCount`,
`totalCompletedCount`, and `progressRate`. Invalid queries return HTTP 400,
unauthenticated requests return HTTP 401, and unexpected failures use the
sanitized standard HTTP 500 response.

## Metrics

Each scheduled Habit/date pair is one occurrence:

- `scheduledCount` counts scheduled occurrences in the inclusive range.
- `completedCount` counts occurrences whose progress meets their target.
- `completionRate = completedCount / scheduledCount × 100`.
- `totalTargetCount` sums the target for every occurrence.
- `totalCompletedCount` sums progress capped at each occurrence's target.
- `progressRate = totalCompletedCount / totalTargetCount × 100`.

Rates are zero when their denominator is zero and otherwise rounded to two
decimal places.

## Date and ownership rules

The stored IANA timezone resolves the default date; invalid or absent stored
timezones use the existing UTC fallback. Day ranges contain one date, weeks run
Monday through Sunday, and months run from their first through last calendar
day, including leap-year February.

The repository performs three fixed, bounded, user-scoped queries for active,
non-deleted Habits, weekday schedules, and in-range check-ins. Query count does
not grow with Habit or occurrence count. The service expands logical dates and
applies recurrence plus inclusive Habit start/end dates. Historical and future
ranges are supported.

## Frontend and exclusions

The authenticated `/analytics` Server Component uses an uncached internal API
request. URL query state controls period and selected date. Accessible links,
a native date form, an inclusive range heading, six semantic definition-list
cards, and a zero-occurrence state provide the responsive summary.

Charts, heatmaps, streaks, insights, achievements, reminders, tasks, goals, and
broader analytics are explicitly deferred.

## Integration validation

Milestone 4.0B validated the complete `/analytics` flow against the Dockerized
frontend, Fastify API, and PostgreSQL database. Seeded day, Monday–Sunday week,
calendar-month, and zero-occurrence ranges matched the stored schedules and
check-ins, including different completion and capped multi-target progress
rates. Direct URLs, preserved date parameters, browser back/forward history,
navigation, cross-user isolation, and the unchanged Insights placeholder were
verified.

Browser checks covered the loading skeleton, invalid-query and authentication
behavior, desktop and approximately 390px layouts, horizontal overflow,
keyboard focus visibility, semantic forms/headings/definition lists, two-place
percentage formatting, light/dark/system themes, and console/hydration
cleanliness. Docker checks covered PostgreSQL readiness, backend health and
readiness, frontend responses, CORS-backed requests, Drizzle schema parity,
and the published OpenAPI contract.

Known limitations are deliberate: the page has summary cards only, does not
cache user analytics, and exposes no charts, exports, streaks, or non-Habit
metrics. A total backend outage follows the existing protected-route behavior
because session resolution occurs before the Analytics request; the dedicated
retryable Analytics error boundary remains covered by frontend tests.
