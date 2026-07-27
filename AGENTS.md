# Trackly Engineering Rules

- Always use TypeScript.
- Never use JavaScript.
- Follow Clean Architecture.
- Never place business logic inside routes.
- Use the Service + Repository pattern.
- Validate every request using Zod.
- Keep components reusable.
- Keep functions small.
- Never generate duplicated code.
- Prefer composition over inheritance.
- Keep the folder structure consistent.
- Write readable code before clever code.
- Keep infrastructure concerns isolated from domain logic.
- Add tests alongside future business behavior.
- Never commit secrets or populated environment files.
- Place every public application endpoint under a versioned `/api/v1` prefix.
- Keep health, readiness, and documentation endpoints outside the application
  API namespace.
- Route all errors through the centralized error handler.
- Never expose stack traces or internal error details in API responses.
- Validate all request params, query strings, and bodies before use.
- Never log credentials, authentication headers, cookies, tokens, or secrets.
- Prefer React Server Components and add client boundaries only for required
  interactivity.
- Keep business logic and business data out of shared UI components.
- Validate every public frontend environment variable before use.
- Reuse the central frontend API client instead of creating new Axios
  instances.
- Preserve keyboard accessibility, visible focus, semantic landmarks, and
  responsive behavior in frontend changes.
- Never persist derived progress, completion percentages, streaks, or analytics
  aggregates.
- Scope every user-owned query and mutation by `user_id`.
- Use PostgreSQL `date` for logical calendar days and timezone-aware timestamps
  for instants and audit events.
- Every database schema change requires a reviewed migration.
- Better Auth owns users, sessions, accounts, and verification schema; never
  recreate those tables manually.
- Use Better Auth's server API for sessions; never decode auth cookies manually.
- Keep `/api/auth/*` outside `/api/v1` because Better Auth owns that contract.
- Never store session tokens in browser storage or expose authentication
  secrets to the frontend.
- Scope every user-owned read with the authenticated user ID; never accept
  ownership IDs from request input.
- Calculate Today from the user's stored timezone, never the backend server
  timezone.
- Keep database queries in repositories, never in routes or controllers.
- Exclude soft-deleted records from normal reads unless explicitly requested.
- Use deterministic sorting with a stable final tie-breaker.
