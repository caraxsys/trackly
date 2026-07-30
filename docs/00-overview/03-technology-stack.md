# Trackly Technology Stack

## Purpose

This document records the technologies declared and used by Trackly, their
roles, and the repository-specific reason each fits the implemented
architecture.

## Status

Completed

## Scope

Versions reflect checked-in package manifests and container definitions. See
[System Architecture](./02-system-architecture.md) for their interaction.

## Frontend

| Technology                | Purpose                                                               | Why chosen                                                             |
| ------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Next.js `^16.0.0`         | App Router, server rendering, routing, layouts, and production builds | Supports server-first authenticated pages with small client boundaries |
| React `19.2.0`            | Component rendering and client interaction                            | Underpins the Next.js UI and focused interactive controls              |
| TypeScript `^5`           | Static typing across frontend code and configuration                  | Shares explicit contracts and prevents JavaScript source               |
| Axios `^1.13.2`           | Authenticated browser and server API requests                         | Provides central HTTP handling                                         |
| React Hook Form `^7.66.0` | Client form state and submission                                      | Keeps form state local and integrates with schema validation           |
| next-themes `^0.4.6`      | Light, dark, and system themes                                        | Handles appearance without a general-purpose global store              |

## Backend

| Technology            | Purpose                                                            | Why chosen                                                |
| --------------------- | ------------------------------------------------------------------ | --------------------------------------------------------- |
| Fastify `^5.4.0`      | HTTP API, plugins, lifecycle, injection tests, and logging         | Provides a typed, plugin-oriented server                  |
| TypeScript `^5.9.3`   | Types for routes, services, repositories, configuration, and tests | Enforces the same language and contracts as the frontend  |
| Pino `^10.1.0`        | Structured application and request logs                            | Integrates with Fastify and emits machine-readable JSON   |
| pino-pretty `^13.1.3` | Readable development logs                                          | Improves local output while production remains structured |
| web-push `^3.6.7`     | Standards-based browser Push API delivery with VAPID               | Fits behind the provider-neutral notification contract    |

## Database

| Technology           | Purpose                               | Why chosen                                                                          |
| -------------------- | ------------------------------------- | ----------------------------------------------------------------------------------- |
| PostgreSQL 17 Alpine | Durable relational storage            | Supports constraints, transactions, date semantics, indexes, and relational queries |
| `postgres` `^3.4.7`  | PostgreSQL client and connection pool | Integrates with Drizzle and exposes lifecycle control                               |

## Authentication

| Technology           | Purpose                                                                      | Why chosen                                                                 |
| -------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Better Auth `^1.3.4` | Email/password authentication, sessions, cookies, accounts, and verification | Owns the authentication contract and schema while integrating with Drizzle |

## Validation

| Technology                     | Purpose                                             | Why chosen                                            |
| ------------------------------ | --------------------------------------------------- | ----------------------------------------------------- |
| Zod `^4.1.12`                  | Environment, request, form, and contract validation | Creates reusable TypeScript-aware boundary validation |
| `@hookform/resolvers` `^5.2.2` | Connects Zod to React Hook Form                     | Aligns client forms with explicit schemas             |

## ORM

| Technology            | Purpose                                                       | Why chosen                                         |
| --------------------- | ------------------------------------------------------------- | -------------------------------------------------- |
| Drizzle ORM `^0.45.2` | Typed PostgreSQL schema, queries, relations, and transactions | Keeps repository SQL explicit and type-safe        |
| Drizzle Kit `^0.31.8` | Migration generation/application, push, and Studio            | Provides the schema-change and inspection workflow |

## UI

| Technology                                     | Purpose                                            | Why chosen                                             |
| ---------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------ |
| Tailwind CSS `^4`                              | Utility styling and responsive layouts             | Supports the existing token-based component design     |
| shadcn/ui configuration and local primitives   | Reusable UI building blocks in `src/components/ui` | Keeps component source adaptable inside the repository |
| Radix Slot `^1.2.4`                            | Polymorphic UI composition                         | Supports reusable component APIs                       |
| Lucide React `^0.554.0`                        | Interface icons                                    | Provides a consistent SVG icon set                     |
| Recharts `^3.5.0`                              | Analytics trend visualizations                     | Supplies the existing responsive charting stack        |
| class-variance-authority, clsx, tailwind-merge | Component variants and class composition           | Keeps reusable styling predictable                     |

## State Management

| Technology              | Purpose                                                | Why chosen                                                 |
| ----------------------- | ------------------------------------------------------ | ---------------------------------------------------------- |
| React Server Components | Initial authenticated data and page rendering          | Keeps server-fetched user data out of global browser state |
| URL query parameters    | Date, period, view, search, sort, and pagination state | Makes views refresh-safe and shareable                     |
| React local state       | Pending, feedback, and focused interaction state       | Keeps state close to its owner                             |
| React Hook Form         | Form-specific state                                    | Provides scoped input, error, and submission state         |
| next-themes             | Appearance state                                       | Handles the cross-page browser theme concern               |

The repository does not declare Redux, Zustand, React Query, or another
general-purpose client state/cache library.

## Testing

| Technology                   | Purpose                                                        | Why chosen                                             |
| ---------------------------- | -------------------------------------------------------------- | ------------------------------------------------------ |
| Vitest `^4`                  | Frontend/backend unit, route, lifecycle, and integration tests | Uses one TypeScript-native runner across packages      |
| Fastify injection            | Backend HTTP tests without a network port                      | Exercises the real request lifecycle deterministically |
| Testing Library              | Component behavior and accessible DOM queries                  | Tests user-observable behavior                         |
| jsdom `^27.2.0`              | Browser-like frontend test environment                         | Supports components and browser-API tests locally      |
| PostgreSQL integration suite | Schema, repository, ownership, and query verification          | Tests actual database semantics                        |

## Documentation

| Technology                           | Purpose                                       | Why chosen                                          |
| ------------------------------------ | --------------------------------------------- | --------------------------------------------------- |
| Markdown                             | Documentation source of truth                 | Renders on GitHub and remains reviewable with code  |
| Mermaid                              | Architecture, sequence, and workflow diagrams | Keeps diagrams text-based and version-controlled    |
| OpenAPI via `@fastify/swagger`       | Machine-readable API contract                 | Documents registered Fastify schemas                |
| Swagger UI via `@fastify/swagger-ui` | Interactive development API reference         | Makes the OpenAPI contract inspectable when enabled |

## Containerization

| Technology           | Purpose                                      | Why chosen                                                   |
| -------------------- | -------------------------------------------- | ------------------------------------------------------------ |
| Docker               | Reproducible frontend and backend images     | Provides development, build, and non-root production stages  |
| Docker Compose       | Local application and database orchestration | Encodes dependencies, health checks, networking, and volumes |
| Node.js 24 Alpine    | Container runtime/build baseline             | Keeps application stages consistent                          |
| PostgreSQL 17 Alpine | Local database image                         | Supplies the relational features used by Trackly             |

## Developer Tools

| Technology        | Purpose                                     | Why chosen                                              |
| ----------------- | ------------------------------------------- | ------------------------------------------------------- |
| pnpm `10.13.1`    | Workspace dependency management and scripts | Uses one lockfile and coordinated package commands      |
| ESLint `^9`       | Frontend and backend static analysis        | Enforces framework and TypeScript rules                 |
| Prettier `^3.6.2` | Repository-wide formatting                  | Provides one deterministic format baseline              |
| `tsx` `^4.21.0`   | Backend TypeScript development and scripts  | Runs server, seed, and scheduler entry points directly  |
| Corepack          | Activates the pinned pnpm version           | Aligns local package-manager behavior with the manifest |
| Drizzle Studio    | Local database inspection                   | Reuses the checked-in Drizzle configuration             |

## Related Documents

- [Project Overview](./01-project-overview.md)
- [System Architecture](./02-system-architecture.md)
- [Repository Structure](./04-repository-structure.md)
- [Development Workflow](./05-development-workflow.md)
