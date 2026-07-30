# Trackly Architecture Diagrams

## Purpose

Provide visual and narrative maps of Trackly's implemented system boundaries,
dependencies, data flow, and request lifecycle.

## Status

Completed

## Scope

This document connects the browser, Next.js application, Fastify API, Better
Auth, PostgreSQL, reminder scheduler, and Web Push delivery path. Package and
tool details are available in
[Technology Stack](../00-overview/03-technology-stack.md).

## High-Level Architecture

Trackly is a two-application pnpm workspace. The Next.js frontend renders the
product interface and calls a Fastify backend. Fastify exposes infrastructure
routes, Better Auth's API, and versioned application APIs. PostgreSQL is the
durable system of record, accessed through Drizzle repositories or Better
Auth's Drizzle adapter.

Reminder scheduling is a second backend entry point. It reuses application
services and the provider-neutral notification pipeline rather than sending
notifications directly.

## Simplified Architecture

```mermaid
flowchart LR
    user["User browser"] --> frontend["Next.js frontend"]
    frontend --> backend["Fastify backend"]
    backend --> database[("PostgreSQL")]
    backend --> push["Browser push service"]
    push --> user
```

## Complete Architecture

```mermaid
flowchart TB
    subgraph Browser["Browser boundary"]
        User["User"]
        Pages["Rendered Trackly pages"]
        ClientUI["Focused Client Components"]
        ServiceWorker["/sw.js service worker"]
        PushManager["PushManager"]
        User --> Pages
        Pages --> ClientUI
        ServiceWorker --> Pages
        ClientUI --> PushManager
    end

    subgraph Frontend["Next.js frontend process"]
        AppRouter["App Router<br/>public, auth, and protected route groups"]
        RSC["React Server Components"]
        ServerServices["Server API services<br/>cookie forwarding, no-store, timeout"]
        ClientServices["Axios mutation services<br/>credentials, timeout, request ID"]
        Theme["Theme provider and persisted preference"]
        AppRouter --> RSC
        AppRouter --> Theme
        RSC --> ServerServices
        ClientUI --> ClientServices
    end

    subgraph Backend["Fastify backend process"]
        CrossCutting["Plugins<br/>request context, errors, CORS, Helmet,<br/>rate limits, Swagger, database, auth"]
        InfraRoutes["/health, /ready, /docs"]
        AuthRoutes["/api/auth/*"]
        V1Routes["/api/v1/*"]
        Controllers["Controllers"]
        Services["Query and command services"]
        Repositories["Repositories"]
        BetterAuth["Better Auth"]
        Delivery["Delivery coordinator"]
        Dispatcher["Provider dispatcher"]
        WebPushProvider["WebPushNotificationProvider"]

        CrossCutting --> InfraRoutes
        CrossCutting --> AuthRoutes
        CrossCutting --> V1Routes
        AuthRoutes --> BetterAuth
        V1Routes --> Controllers
        Controllers --> Services
        Services --> Repositories
        Services --> Delivery
        Delivery --> Dispatcher
        Dispatcher --> WebPushProvider
    end

    subgraph SchedulerProcess["Reminder scheduler process"]
        Loop["Scheduler loop or one-shot runner"]
        Eligibility["Eligibility service"]
        Loop --> Eligibility
    end

    Postgres[("PostgreSQL 17")]
    BrowserPush["External browser push service"]

    Pages --> AppRouter
    ServerServices --> InfraRoutes
    ServerServices --> AuthRoutes
    ServerServices --> V1Routes
    ClientServices --> AuthRoutes
    ClientServices --> V1Routes
    BetterAuth --> Postgres
    Repositories --> Postgres
    Eligibility --> Repositories
    Eligibility --> Delivery
    WebPushProvider --> Repositories
    WebPushProvider --> BrowserPush
    BrowserPush --> ServiceWorker
    PushManager --> ClientServices
```

## Main Components

| Component             | Boundary and responsibility                                                                                |
| --------------------- | ---------------------------------------------------------------------------------------------------------- |
| Browser UI            | Displays server-rendered pages and runs only the client interactions that need browser APIs or local state |
| Next.js App Router    | Defines root, authentication, and protected application layouts plus route-level loading/error states      |
| Frontend services     | Separate server-side cookie-forwarding reads from credentialed Axios mutations                             |
| Fastify application   | Composes plugins and routes without opening a port, enabling injection tests                               |
| Better Auth           | Owns email/password authentication, session cookies, and authentication tables                             |
| Domain modules        | Group routes, controllers, services, repositories, schemas, and tests by application area                  |
| Drizzle/PostgreSQL    | Provide typed relational persistence, constraints, transactions, and migrations                            |
| Scheduler             | Resolves eligible reminder occurrences sequentially and invokes provider-neutral delivery                  |
| Notification pipeline | Claims durable occurrences, deduplicates delivery, dispatches an explicit provider, and records outcomes   |
| Web Push provider     | Loads active subscriptions, sends sanitized payloads, and updates subscription delivery state              |

## Data Flow

Server-rendered reads forward the incoming cookie from Next.js to the internal
backend URL and disable shared caching. Client mutations use one Axios instance
with credentials, a ten-second timeout, and generated request IDs. Backend
controllers obtain the authenticated identity from the session, services apply
domain rules, and repositories execute user-scoped queries.

The backend returns standard success or error envelopes. Frontend server
services validate the envelope shape before returning data to pages; client
services normalize Axios failures into safe application errors.

## Request Lifecycle

```mermaid
sequenceDiagram
    actor User
    participant Next as Next.js page or client component
    participant Fastify
    participant Plugin as Fastify hooks/plugins
    participant Auth as Better Auth session API
    participant Controller
    participant Service
    participant Repository
    participant DB as PostgreSQL

    User->>Next: Navigate or submit an action
    Next->>Fastify: HTTP request with session cookie
    Fastify->>Plugin: Assign/propagate request ID
    Plugin->>Plugin: Apply CORS, security, and rate limits
    Fastify->>Controller: Validated route handler
    Controller->>Auth: Require authenticated session
    Auth->>DB: Resolve session
    DB-->>Auth: User and session
    Auth-->>Controller: Authenticated user ID
    Controller->>Service: Typed input plus user ID
    Service->>Repository: Domain-specific operation
    Repository->>DB: User-scoped SQL
    DB-->>Repository: Rows/result
    Repository-->>Service: Persistence result
    Service-->>Controller: Response model
    Controller-->>Fastify: Standard success response
    Fastify-->>Next: JSON plus x-request-id
    Next-->>User: Rendered state or feedback
```

Validation or application failures are routed through the centralized error
handler. Unexpected errors are logged internally and mapped to a generic public
500 response.

## Service Boundaries and Repository Layers

Routes own registration, schema validation, rate-limit configuration, and
OpenAPI metadata. Controllers translate HTTP input and session context. Services
own business, schedule, date, timezone, aggregation, and orchestration rules.
Repositories own Drizzle/SQL access and always scope user-owned operations by
the authenticated user ID.

Cross-cutting infrastructure lives in Fastify plugins rather than domain
modules. Provider-specific Web Push behavior remains behind the notification
provider contract; the scheduler and delivery coordinator do not import Web
Push implementation details.

## External Dependencies

The production runtime depends on:

- PostgreSQL for durable application and authentication data.
- A browser push service when the `web_push` provider sends notifications.
- Browser support for service workers, notifications, and PushManager for the
  Web Push frontend.

No external queue, distributed cache, observability platform, or identity
provider is configured.

## Related Documents

- [Frontend Architecture](./frontend-architecture.md)
- [Backend Architecture](./backend-architecture.md)
- [Authentication Flow](./authentication-flow.md)
- [Docker Architecture](./docker-architecture.md)
- [Database Design](./database-design.md)
- [API Design](./api-design.md)
