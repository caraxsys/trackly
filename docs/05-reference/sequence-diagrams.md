# Trackly Sequence Diagrams

## Purpose

Provide a compact interaction reference for the repository's implemented
request, authentication, mutation, analytics, scheduling, and notification
flows.

## Status

Completed

## Authenticated API Request

```mermaid
sequenceDiagram
    autonumber
    participant Browser
    participant Fastify
    participant RequestContext as Request context
    participant BetterAuth as Better Auth
    participant Controller
    participant Service
    participant Repository
    participant PostgreSQL

    Browser->>Fastify: Request with session cookie and optional x-request-id
    Fastify->>RequestContext: Validate or generate request ID
    RequestContext-->>Browser: x-request-id response header
    Fastify->>BetterAuth: Resolve session through server API
    alt Valid session
        BetterAuth-->>Fastify: Authenticated user
        Fastify->>Controller: Validated request
        Controller->>Service: Typed command or query
        Service->>Repository: User-scoped operation
        Repository->>PostgreSQL: SQL scoped by user_id
        PostgreSQL-->>Repository: Rows
        Repository-->>Service: Domain data
        Service-->>Controller: Public result
        Controller-->>Browser: Standard success envelope
    else No valid session
        BetterAuth-->>Fastify: Unauthenticated
        Fastify-->>Browser: Standard 401 error envelope
    else Session dependency failure
        BetterAuth--xFastify: Internal failure
        Fastify-->>Browser: Standard 500 error envelope
    end
```

## Frontend Server-Rendered Read

```mermaid
sequenceDiagram
    participant Browser
    participant Next as Next.js Server Component
    participant API as Fastify API
    participant DB as PostgreSQL

    Browser->>Next: Navigate to protected page
    Next->>API: Authenticated no-store request
    API->>DB: User-scoped query
    DB-->>API: Data
    API-->>Next: Success envelope
    Next-->>Browser: Server-rendered HTML
```

Interactive Client Components submit mutations through the central Axios
client, then update focused UI state or refresh server-rendered data according
to the feature's existing behavior.

## Habit Check-in

```mermaid
sequenceDiagram
    participant User
    participant Control as HabitCheckInControl
    participant API as POST /api/v1/habits/:id/check-in
    participant Service as Habit command service
    participant DB as PostgreSQL

    User->>Control: Set absolute completed count
    Control->>API: habit ID, logical date, completedCount
    API->>Service: Authenticated and validated command
    Service->>DB: Verify owned habit and schedule
    alt completedCount > 0
        Service->>DB: Upsert habit_check_ins row
    else completedCount = 0
        Service->>DB: Delete existing check-in row
    end
    DB-->>Service: Durable state
    Service-->>Control: Count, target and derived completion
    Control-->>User: Updated progress and accessible status
```

## Analytics Dashboard Composition

```mermaid
sequenceDiagram
    participant Browser
    participant Page as Analytics Server Component
    participant Service as Frontend analytics service
    participant API as Analytics route
    participant Query as Analytics query service
    participant Repository
    participant DB as PostgreSQL

    Browser->>Page: /analytics with URL periods/date
    Page->>Service: Request dashboard composition
    Service->>API: Authenticated no-store GET
    API->>Query: Resolve user timezone and ranges
    Query->>Repository: Bounded source-data query
    Repository->>DB: User-scoped scheduled habits/check-ins
    DB-->>Repository: Source rows
    Repository-->>Query: Shared aggregation input
    Query-->>API: Summary/history/insight projections
    API-->>Service: Standard success envelope
    Service-->>Page: Typed analytics data
    Page-->>Browser: Cards, trends and accessible states
```

## Reminder Scheduling and Delivery

```mermaid
sequenceDiagram
    autonumber
    participant Runtime as Scheduler runtime
    participant Eligibility as Eligibility engine
    participant DB as PostgreSQL
    participant Coordinator as Delivery coordinator
    participant Dispatcher as Provider dispatcher
    participant Provider as noop or web_push
    participant Push as Browser push service

    Runtime->>DB: Verify database connectivity
    loop Each scheduler tick
        Runtime->>Eligibility: Find due reminder occurrences
        Eligibility->>DB: Read user-scoped schedules and state
        DB-->>Eligibility: Eligible occurrences
        loop Sequential occurrence processing
            Runtime->>Coordinator: Deliver occurrence
            Coordinator->>DB: Atomically claim or detect duplicate
            alt Newly claimed
                Coordinator->>Dispatcher: Dispatch provider-neutral payload
                Dispatcher->>Provider: Explicit provider selection
                opt Web Push provider
                    Provider->>DB: Load active device subscriptions
                    Provider->>Push: Send independently per subscription
                    Provider->>DB: Record success/failure or invalidate 404/410
                end
                Provider-->>Coordinator: delivered, failed, or skipped
                Coordinator->>DB: Persist final delivery lifecycle
            else Duplicate occurrence
                Coordinator-->>Runtime: Do not send again
            end
        end
    end
```

## Browser Web Push Subscription

```mermaid
sequenceDiagram
    participant User
    participant Settings
    participant Client as Notification client service
    participant SW as Service worker / PushManager
    participant API as Push subscription API
    participant DB as PostgreSQL

    User->>Settings: Select Enable notifications
    Settings->>Client: Explicit enable action
    Client->>SW: Register /sw.js
    Client->>User: Browser permission prompt
    alt Permission granted
        Client->>SW: Read or create subscription with public VAPID key
        SW-->>Client: Browser subscription
        Client->>API: Synchronize endpoint and keys
        API->>DB: Create, update, or reactivate owned subscription
        DB-->>API: Safe public metadata
        API-->>Settings: Enabled on this device
    else Permission denied
        Client-->>Settings: Blocked guidance
    end
```

## Graceful Shutdown

```mermaid
sequenceDiagram
    participant OS as Container runtime / OS
    participant Server as Fastify server
    participant Scheduler
    participant DB as PostgreSQL pool
    participant Logs as Pino destination

    OS->>Server: SIGTERM or SIGINT
    Server->>Server: Run idempotent shutdown once
    Server->>Server: Stop accepting HTTP work
    Server->>DB: Close owned pool
    Server->>Logs: Flush logs within shutdown deadline

    OS->>Scheduler: SIGTERM or SIGINT
    Scheduler->>Scheduler: Abort loop and await active tick
    Scheduler->>DB: Close owned pool
    Scheduler->>Logs: Flush logs
```

## Related Documentation

- [Architecture diagrams](../01-design/architecture-diagram.md)
- [Authentication flow](../01-design/authentication-flow.md)
- [Backend architecture](../01-design/backend-architecture.md)
- [API reference](./api-reference.md)
- [Monitoring and incident response](../04-deployment/monitoring.md)
