# Documentation Screenshot Assets

## Purpose

This directory contains publication-oriented screenshots generated from the
real Trackly frontend, authenticated API, and deterministic documentation data.
The PNG files are intended for later placement in Markdown-derived PDF and DOCX
publications.

## Status

Completed

## Screenshot Inventory

### Desktop — 1440 × 900 viewport

| File                                            | View                                     |
| ----------------------------------------------- | ---------------------------------------- |
| `screenshots/desktop/01-login.png`              | Public sign-in page                      |
| `screenshots/desktop/02-register.png`           | Public registration page                 |
| `screenshots/desktop/03-today-dashboard.png`    | Authenticated Today dashboard            |
| `screenshots/desktop/04-habits-list.png`        | All-habits collection                    |
| `screenshots/desktop/05-habit-create.png`       | New Habit form                           |
| `screenshots/desktop/06-habit-detail.png`       | Morning Run detail, progress, and streak |
| `screenshots/desktop/07-goals.png`              | Goal dashboard and collection            |
| `screenshots/desktop/08-reminders.png`          | Reminder section on Read 20 Pages        |
| `screenshots/desktop/09-analytics-overview.png` | Analytics summary and trend viewport     |
| `screenshots/desktop/10-analytics-heatmap.png`  | Contribution heatmap section             |
| `screenshots/desktop/11-preferences.png`        | Preferences and notification settings    |

Full-page capture is used for pages whose surrounding content remains useful.
Analytics overview uses a viewport capture, and reminders/heatmap use focused
component captures to remain legible in A4 output.

### Mobile — 390 × 844 viewport

| File                                          | View                                  |
| --------------------------------------------- | ------------------------------------- |
| `screenshots/mobile/01-mobile-today.png`      | Today at a realistic narrow viewport  |
| `screenshots/mobile/02-mobile-habits.png`     | Habit collection at a narrow viewport |
| `screenshots/mobile/03-mobile-navigation.png` | Focused mobile navigation             |

Tasks and standalone Insights are not captured because those routes are
placeholder-only.

## Regeneration

The workflow expects the supported development stack to be running:

```bash
docker compose up --build
pnpm exec playwright install chromium
pnpm docs:screenshots
```

It validates:

- Frontend at `DOCS_FRONTEND_URL`.
- Backend `/health` and `/ready` at `DOCS_BACKEND_URL`.
- PostgreSQL through `DOCS_DATABASE_URL`.

Host-side defaults use `localhost`. Compose-internal application connections
use service names such as `backend` and `postgres`; do not pass those internal
hostnames to a screenshot process running on the host.

## Environment Variables

| Variable                    | Default                                               | Purpose                                                               |
| --------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------- |
| `DOCS_FRONTEND_URL`         | `http://localhost:3000`                               | Browser-reachable frontend origin                                     |
| `DOCS_BACKEND_URL`          | `http://localhost:4000`                               | Host-reachable backend origin                                         |
| `DOCS_DATABASE_URL`         | `postgresql://trackly:trackly@localhost:5432/trackly` | Host-reachable documentation database                                 |
| `DOCS_USER_NAME`            | `Trackly Demo`                                        | Dedicated display name                                                |
| `DOCS_USER_EMAIL`           | `docs@trackly.local`                                  | Dedicated account; must use `@trackly.local`                          |
| `DOCS_USER_PASSWORD`        | `Trackly-Docs-2026!`                                  | Local-only documentation login                                        |
| `DOCS_TIMEZONE`             | `Asia/Jakarta`                                        | User timezone and browser emulation timezone                          |
| `DOCS_ALLOW_DATABASE_RESET` | unset                                                 | Required before targeting a non-local isolated documentation database |

The password default is local test data, not a production secret. Override it
when the dedicated local account already exists with another password. Do not
store production credentials in these variables or commit a populated
environment file.

## Deterministic Data

The browser first uses Trackly's real login flow. If the dedicated account does
not exist, it uses the real registration form. After authentication, the setup
creates or updates fixed-ID documentation records owned by that account:

- Categories: Health, Learning, and Productivity.
- Habits: Morning Run, Read 20 Pages, Drink Water, and Plan Tomorrow.
- Goals: Complete 100 Workouts and Read 12 Books.
- Reminders: Morning Run at 06:30 and Read 20 Pages at 20:00.
- Ninety logical dates of mixed habit progress.

The date range is anchored to the current logical date in `DOCS_TIMEZONE`.
Patterns are deterministic for each generated range and provide non-empty
Today, streak, goal, chart, ranking, and heatmap states.

## Database Safety

The workflow never resets a database and never deletes another user's data. It
requires the reserved `@trackly.local` account domain. It upserts fixed
documentation IDs and replaces check-ins only for the four fixed documentation
Habits owned by that user.

By default, only localhost database hosts are accepted. A non-local URL is
refused unless `DOCS_ALLOW_DATABASE_RESET=true`; use that override only for an
explicitly isolated documentation database. The variable name is intentionally
strong even though the script does not perform a whole-database reset.

Do not reuse `docs@trackly.local` for personal development data.

## Capture Stability

The workflow:

- Uses Chromium with light mode and reduced motion.
- Captures desktop at 1440 × 900 and mobile at 390 × 844.
- Waits for navigation, network idle, fonts, and two animation frames.
- Disables CSS animation and transition durations.
- Hides scrollbars, Next.js development indicators, and transient toaster
  containers.
- Uses accessible headings, labels, roles, and navigation names as selectors.
- Does not request browser notification permission.
- Removes and recreates only the generated screenshot directory.

## Troubleshooting

### A service is unavailable

Run:

```bash
docker compose ps
curl http://localhost:4000/health
curl http://localhost:4000/ready
```

Then start the stack with `docker compose up --build` or override the documented
host URLs.

### Chromium is missing

Run:

```bash
pnpm exec playwright install chromium
```

### Login fails

The workflow can reuse only an account whose password matches
`DOCS_USER_PASSWORD`. Remove the dedicated local account through an intentional
development database procedure or provide the correct password. It will not
take over an existing account.

### Database setup is refused

Use a localhost URL, or provision a separate documentation database and
explicitly set `DOCS_ALLOW_DATABASE_RESET=true`. Never point the script at
production.

### A selector or route fails

The run stops with the unavailable route or accessible element. Confirm that
the UI contract changed intentionally, then update the smallest relevant
capture step and this inventory.

## Adding Future Screenshots

1. Capture only an implemented, stable route or component.
2. Add deterministic data using fixed IDs owned by the documentation user.
3. Prefer accessible selectors over CSS classes.
4. Preserve viewport, light theme, typography, and settling behavior.
5. Avoid secrets, personal data, empty accidental states, browser prompts, and
   placeholder-only routes.
6. Use a numbered, descriptive filename.
7. Update this inventory and validate dimensions and duplicate names.
