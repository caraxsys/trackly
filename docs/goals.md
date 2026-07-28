# Goals

A Goal is a fixed local-calendar date range in which one authenticated user
accumulates progress from exactly one owned Habit. Habits describe recurring
behavior; Goals describe a finite target for that behavior. A Habit may support
multiple Goals, but a Goal never spans multiple Habits and cannot be checked in
directly.

The foundational fields are `id`, `userId`, `habitId`, `name`, `targetCount`,
`startDate`, `endDate`, `status`, `createdAt`, and `updatedAt`. Targets must be
positive and the inclusive end date cannot precede the start date. Status moves
between `active`, `completed`, and `cancelled`; completion automation is not
part of this milestone.

Progress will be derived from owned Habit check-ins within the Goal range. No
current progress, percentage, or aggregate check-in value is persisted.

Milestone 5.0 provides the database constraints, ownership-scoped read
repository, future input validation, reusable OpenAPI schemas, status/Habit/
overlap filters, and deterministic ordering. It deliberately exposes no public
routes or mutation commands and adds no frontend. Milestone 5.1 is expected to
add authenticated Goal CRUD; later milestones may add derived progress and
presentation without changing the accumulation model.
