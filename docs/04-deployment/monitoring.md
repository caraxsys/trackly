# Monitoring and Incident Response

## Purpose

Document Trackly's existing operational signals and how operators can use them
without claiming an external monitoring platform that is not implemented.

## Status

Completed

## Current Monitoring Boundary

Trackly exposes health/readiness endpoints and structured logs. It does not
include Prometheus metrics, OpenTelemetry, distributed tracing, dashboards,
alerts, log shipping, uptime checks, or on-call integration.

Any external collection, retention, visualization, alerting, and ownership
model must be added by the deployment environment.

## Health and Readiness

| Signal        | Behavior                                                  | Intended use      |
| ------------- | --------------------------------------------------------- | ----------------- |
| `GET /health` | Returns 200 without querying PostgreSQL                   | Process liveness  |
| `GET /ready`  | Runs database `SELECT 1`; returns 200 or standardized 503 | Traffic readiness |

The development backend container uses `/ready`. PostgreSQL uses `pg_isready`.
The frontend has no dedicated health endpoint.

Monitor liveness and readiness independently. A healthy process can be unready
because its database is unavailable.

## Structured Logging

Backend production logs are Pino JSON. Development uses `pino-pretty`.
`LOG_LEVEL` controls fatal, error, warn, info, debug, trace, or silent output.

HTTP completion events include:

```json
{
  "event": "http.request.completed",
  "requestId": "correlation-id",
  "method": "GET",
  "path": "/api/v1/today",
  "status": 200,
  "durationMs": 12.34,
  "userId": "present-when-authenticated"
}
```

Paths omit query strings. Full request bodies are not logged.

## Request Correlation

Every Fastify request accepts a valid `x-request-id` or receives a generated
UUID. The same ID appears in:

- Response headers.
- Request completion logs.
- Structured error logs.
- Audit events.

The frontend Axios client generates an ID when browser crypto supports UUIDs.
A reverse proxy may propagate/generate a valid ID; see
[Reverse Proxy Requirements](./reverse-proxy.md).

## Error Logging

Expected validation and normal public application errors return standardized
responses. Server-side `AppError` values at 5xx log warning context. Unexpected
errors log at error level with request ID, method, path, status, stable error
code, authenticated user ID when available, and sanitized internal error data.

Startup, uncaught exception, and unhandled rejection paths emit structured
fatal/error events before graceful shutdown.

Sensitive values are redacted:

- Authorization and cookie headers.
- Set-Cookie.
- Passwords, tokens, secrets, and private keys.
- Web Push endpoints, `p256dh`, and auth values.

Do not configure external collectors to enrich logs with raw request bodies or
sensitive headers.

## Audit Events

Important auth, account/profile, habit, goal, reminder, and preference
mutations emit `audit.event` at info level:

```json
{
  "event": "audit.event",
  "audit": {
    "actorId": "user-id",
    "action": "habit.update",
    "resourceType": "habit",
    "resourceId": "resource-id",
    "timestamp": "2026-07-30T10:00:00.000Z",
    "outcome": "success",
    "requestId": "correlation-id"
  }
}
```

Failures may include a stable error code. Audit logs are not stored in a
database table and have no repository-defined retention.

## Scheduler Signals

The reminder scheduler emits:

- Process start/stop and shutdown-request events.
- Tick started/completed/failed events.
- Overlapping tick skipped warnings.
- Delivery summaries with eligible, claimed, delivered, failed, duplicate, and
  skipped counts.
- Individual orchestration failure events.
- Tick duration.

One-shot mode returns exit code 0 for completed and 1 for failed/partially
failed status. Recurring mode handles SIGINT/SIGTERM and waits for its current
tick.

The scheduler has no HTTP health endpoint or metrics endpoint. Process
supervision and missed-tick detection must be external.

## Application Lifecycle Signals

Fastify emits:

- `server_startup_failed`
- `server_fatal_error`
- `server_shutdown_started`
- `server_shutdown_completed`
- `server_shutdown_failed`

Shutdown is idempotent and has a ten-second deadline. A deadline failure forces
exit code 1.

## Monitoring Hooks

Available hooks for an external platform are:

- HTTP polling of `/health` and `/ready`.
- Container/process exit codes.
- Standard output JSON logs.
- Scheduler one-shot exit status.
- Database `pg_isready` at the database layer.
- HTTP response status, duration, and request IDs from logs.

No metrics scrape endpoint exists.

## Recommended Alert Inputs

These are recommendations based on existing signals, not checked-in alerts:

- Repeated `/ready` failures.
- Backend or scheduler restart loops/non-zero exits.
- `server_fatal_error` or `server_shutdown_failed`.
- Elevated HTTP 5xx or session-service 503 responses.
- Sustained latency growth in `durationMs`.
- Scheduler `tick_failed`, repeated `completed_with_failures`, or missed
  one-minute activity.
- Rising notification failed counts or zero claimed/delivered counts when
  eligible reminders are expected.
- Unexpected authentication failure/rate-limit patterns.

Thresholds and ownership are not defined by the repository and must be measured
before production.

## Performance Observability

Existing measurements include per-request duration and per-scheduler-tick
duration/counts. Analytics uses a consolidated bounded source read, and the
production PostgreSQL pool is capped at 20.

There is no query tracing, slow-query logger, percentile metric, production
latency budget, load generator, or database pool metric. Do not claim
performance compliance from build/test success alone.

## Operational Verification

After deployment:

```bash
curl https://api.example.invalid/health
curl https://api.example.invalid/ready
```

Replace the example host with the deployed API. Confirm:

- Responses contain `x-request-id`.
- Logs contain matching completion entries.
- Authenticated mutations generate audit events.
- Error tests produce safe public responses and sanitized internal logs.
- Scheduler one-shot emits a summary without real sends unless an approved test
  subscription exists.

## Incident Response Recommendations

1. Determine scope: frontend, API, auth, database, scheduler, or browser push.
2. Check liveness and readiness separately.
3. Capture the affected request ID and time window.
4. Query structured logs for request, error, and audit events.
5. Preserve logs before restarting processes.
6. Stop the scheduler if delivery duplication/data integrity is suspected.
7. Avoid printing or exporting sensitive records during investigation.
8. Follow the external database recovery plan for data incidents.
9. Verify service, authentication, ownership, and scheduler behavior after
   mitigation.
10. Record unresolved gaps and update operational runbooks.

## Operational Checklist

- [ ] Health/readiness polling configured externally.
- [ ] Backend, frontend, scheduler, and PostgreSQL process ownership assigned.
- [ ] JSON logs collected with retention/access controls.
- [ ] Request IDs searchable.
- [ ] Sensitive-field redaction verified.
- [ ] Scheduler failures/missed ticks observable.
- [ ] Database availability and storage capacity monitored externally.
- [ ] Incident escalation and backup restore owners identified.
- [ ] Production thresholds established from real measurements.

## Known Limitations

- No metrics, traces, dashboards, or alert definitions.
- No external log aggregation or retention.
- Audit records exist only in logs.
- No scheduler health endpoint/heartbeat storage.
- No frontend health endpoint.
- No slow-query or pool metrics.
- No production performance SLOs.
- No distributed correlation beyond propagated request IDs.

## Related Documentation

- [Production Deployment](./production.md)
- [Backup and Recovery](./backup.md)
- [Reverse Proxy Requirements](./reverse-proxy.md)
- [Debugging](../03-development/debugging.md)
- [Quality Baseline](../quality-baseline.md)
