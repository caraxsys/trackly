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

`GET /api/v1/analytics/history` returns a gap-free daily series ending on the
authenticated user's local current date. `period` accepts `7d`, `30d`, or
`90d` and defaults to `30d`; `granularity` currently accepts only `day` and
defaults accordingly. Every calendar date is returned even when it has no
scheduled occurrences.

History summary averages are arithmetic means of the returned daily rates,
including zero-activity dates. Counts and target totals are summed across the
complete range. The history query reuses the summary repository and does not
persist derived data.

`GET /api/v1/analytics/insights` accepts the same `7d`, `30d`, or `90d`
period, defaulting to `30d`. It derives deterministic observations from the
existing history aggregation, so timezone, scheduling, completion, ownership,
and capped-progress rules are not duplicated.

Insight calculations exclude dates without scheduled occurrences:

- Best and lowest days use completion rate; ties select the most recent date.
- Strongest weekday averages active-day completion rates and resolves equal
  averages in Monday-to-Sunday order.
- A fully completed day has every scheduled occurrence completed.
- Consistency is fully completed active days divided by all active days.
- Trend uses equal calendar windows: 3 recent versus 3 previous days for 7D,
  7 versus 7 for 30D, and 30 versus 30 for 90D. Each window must contain at
  least one active day.
- Trend averages only active days. Change is current minus previous percentage
  points, rounded to two places; a rounded zero is `flat`.

No activity produces `hasActivity=false` and nullable insight values. Activity
with an incomplete comparison window produces `insufficient-data` with null
change and a nullable missing-window average.

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

The authenticated `/analytics` Server Component uses uncached internal API
requests for both summary and history. Existing `period` and `date` parameters
continue to control the summary, while `historyPeriod` preserves the 7D, 30D,
or 90D trend selection without changing the summary URL contract.

Responsive Recharts line visualizations display Completion Rate and Progress
Rate. Their source values come directly from the backend; a screen-reader-only
table exposes every date and both rates without relying on the visual chart.
Historical summary cards and a dedicated no-activity state accompany the
trends. The Insights section is fetched server-side for the same
`historyPeriod` and presents Best Day, Strongest Weekday, Consistency, and
Recent Trend as primary cards; Lowest Day remains supporting text. No domain
insight calculation occurs in the frontend.

Custom ranges, weekly/monthly history granularity, category or goal
analytics, exports, forecasting, and persisted analytics remain out of scope.

## Contribution heatmap

`GET /api/v1/analytics/heatmap?period=365d` accepts `90d`, `180d`, or `365d`
and defaults to `365d`. The inclusive range ends on authenticated user-local
today, returns every calendar date, and ignores future dates. It reuses the
same read-only daily occurrence aggregation as history; no heatmap values are
stored.

Levels are deterministic: `0` represents no schedule or no completion, `1`
means greater than zero but below 25%, `2` is 25%–below 50%, `3` is
50%–below 100%, and `4` is 100%. Boundaries are selected from integer
occurrence counts before the displayed rate is rounded. `completedDays` counts
active days at 100%, while `averageCompletionRate` is the arithmetic average
over active days only.

The server-rendered Analytics page keeps the independent selection in
`heatmapPeriod`. Its Monday-first, horizontally scrollable contribution grid
includes month labels, weekday guidance, a level legend, distinct unscheduled
cells, keyboard focus, and per-day accessible date/count/rate descriptions.

## Advanced rankings

`GET /api/v1/analytics/categories` and `GET /api/v1/analytics/habits` accept
the shared `7d`, `30d`, or `90d` period and default to `30d`. Both end on
authenticated user-local today, remain ownership-scoped and read-only, and
exclude entries with no scheduled occurrence. Inactive habits remain included
when their dated schedule intersects the range; soft-deleted habits remain
excluded.

Habit metrics reuse the same occurrence completion and capped progress
definitions as summary/history. Streak values reuse the existing streak engine
over the batched habit projection, avoiding per-habit database reads. Category
totals roll up their qualifying habits and `activeHabitCount` counts those
habits. Results sort by completion rate descending, progress rate descending,
name ascending, then ID for a stable tie-breaker.

The Analytics page fetches both rankings server-side using `historyPeriod`.
Category cards show percentages alongside volumes and active-habit counts.
Habit cards use neutral language and expose category, completion/progress
values, occurrence counts, and both streaks through semantic headings and
definition lists.

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

Known limitations are deliberate: history always ends on the user-local current
date, averages include zero-activity calendar days, and the page does not cache
user analytics. A total backend outage follows the existing protected-route
behavior because session resolution occurs before the Analytics request; the
dedicated retryable Analytics error boundary remains covered by frontend tests.
