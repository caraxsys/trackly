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

## CRUD

Milestone 5.1 exposes authenticated `/api/v1/goals` collection create/list
operations and `/api/v1/goals/:id` detail, partial update, and soft-delete
operations. Editable fields are the linked Habit, name, target count, inclusive
start/end dates, and explicit `active`, `completed`, or `cancelled` status.
Changing a Habit requires another selectable owned, active, non-deleted Habit.
Existing historical Goals may continue referencing inactive Habits.

Foreign, missing, deleted Goals and inaccessible Habits use the same safe 404
behavior. Deleted Goals are excluded from list and detail reads. Updates
preserve omitted values and reject empty bodies or an invalid merged date
range. Completion is never automated.

Authenticated frontend routes are `/goals`, `/goals/new`, `/goals/[id]`, and
`/goals/[id]/edit`. They provide filtering, canonical detail, accessible
create/edit forms, explicit delete confirmation, and safe empty/error states.
Goal progress calculation and display remain out of scope until Milestone 5.2.
