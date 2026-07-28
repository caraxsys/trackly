# User preferences

Trackly stores presentation and local-date preferences in the existing
one-to-one `user_preferences` table. Every row belongs to one Better Auth user,
`user_id` remains unique, and rows are removed through the existing cascading
user relationship. Preferences are deliberately limited to timezone, week
start, date format, time format, and theme.

## Defaults and provisioning

New registrations keep the established default-row provisioning hook. Existing
legacy users without a row require no backfill because reads also resolve
defaults lazily, and the first update uses an upsert. `GET
/api/v1/preferences` therefore always returns a complete object:

```json
{
  "timezone": "UTC",
  "weekStartsOn": "monday",
  "dateFormat": "yyyy-MM-dd",
  "timeFormat": "24h",
  "theme": "system",
  "createdAt": null,
  "updatedAt": null
}
```

The defaults preserve Trackly's existing UTC fallback, Monday-first Analytics,
ISO-style date display, 24-hour time display, and system theme. Invalid legacy
timezone or presentation values resolve safely to defaults without silently
rewriting stored data.

## API and validation

Authenticated `GET /api/v1/preferences` returns resolved preferences.
Authenticated `PATCH /api/v1/preferences` accepts a strict, non-empty partial
body and upserts one row for the authenticated user. It never accepts ownership
IDs, database IDs, or timestamps. Timezones must be supported IANA identifiers;
all other fields use documented finite values. Repeated updates preserve the
unique user row and omitted fields.

Timezone-aware Today, Habit, Goal, streak, and Analytics services continue to
read the same preferences repository and retain the established safe UTC
fallback. `weekStartsOn` is stored for future use; Analytics remains
Monday-first in Milestone 6.0, and Habit scheduling is unchanged.

## Frontend

`/settings/preferences` is authenticated and provides labelled controls for all
five fields, a runtime-supported IANA timezone selector, deterministic date and
time previews, pending/error feedback, and an accessible save announcement.
The existing `next-themes` provider applies persisted `system`, `light`, or
`dark` preferences across authenticated pages and follows the operating-system
preference in system mode.

Milestone 6.0 does not add notifications, reminders, localization, dashboard
layout settings, automatic device-location detection, or broad date-format
changes across existing product screens.
