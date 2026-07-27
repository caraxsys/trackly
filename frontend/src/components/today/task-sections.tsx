import { CheckCircle2, Clock3, TriangleAlert } from 'lucide-react';

import { CategoryBadge } from './category-badge';
import { formatTimeInTimezone } from '@/lib/today-format';
import type { TodayResponseData, TodayTask } from '@/types/today';

const priorityLabel = {
  low: 'Low priority',
  medium: 'Medium priority',
  high: 'High priority',
} as const;

export function TaskSections({
  tasks,
  timezone,
}: {
  tasks: TodayResponseData['tasks'];
  timezone: string;
}) {
  return (
    <section
      aria-labelledby="tasks-title"
      className="border-border bg-surface rounded-xl border p-5 sm:p-6"
    >
      <h2 className="text-foreground text-lg font-semibold" id="tasks-title">
        Tasks
      </h2>
      <p className="text-muted-foreground mt-1 text-sm">
        What needs attention and what you finished.
      </p>

      <div className="mt-5 space-y-6">
        <TaskGroup
          emptyMessage="No overdue tasks."
          icon={<TriangleAlert aria-hidden="true" className="size-4" />}
          tasks={tasks.overdue}
          timezone={timezone}
          title="Needs attention"
          variant="overdue"
        />
        <TaskGroup
          emptyMessage="No tasks are due on this date."
          icon={<Clock3 aria-hidden="true" className="size-4" />}
          tasks={tasks.dueToday}
          timezone={timezone}
          title="Today's tasks"
          variant="due"
        />
        <TaskGroup
          emptyMessage="No tasks were completed on this date."
          icon={<CheckCircle2 aria-hidden="true" className="size-4" />}
          tasks={tasks.completedToday}
          timezone={timezone}
          title="Completed today"
          variant="completed"
        />
      </div>
    </section>
  );
}

function TaskGroup({
  emptyMessage,
  icon,
  tasks,
  timezone,
  title,
  variant,
}: {
  emptyMessage: string;
  icon: React.ReactNode;
  tasks: TodayTask[];
  timezone: string;
  title: string;
  variant: 'overdue' | 'due' | 'completed';
}) {
  return (
    <section aria-label={title}>
      <h3 className="text-foreground flex items-center gap-2 text-sm font-semibold">
        <span
          className={
            variant === 'overdue' ? 'text-destructive' : 'text-primary'
          }
        >
          {icon}
        </span>
        {title}
        {tasks.length ? (
          <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
            {tasks.length}
          </span>
        ) : null}
      </h3>
      {tasks.length ? (
        <ul className="mt-3 space-y-2">
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              timezone={timezone}
              variant={variant}
            />
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground mt-2 text-sm">{emptyMessage}</p>
      )}
    </section>
  );
}

function TaskItem({
  task,
  timezone,
  variant,
}: {
  task: TodayTask;
  timezone: string;
  variant: 'overdue' | 'due' | 'completed';
}) {
  const relevantTime = formatTimeInTimezone(
    variant === 'completed' ? task.completedAt : task.dueAt,
    timezone,
  );

  return (
    <li className="bg-background rounded-lg px-3.5 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p
          className={
            variant === 'completed'
              ? 'text-muted-foreground break-words text-sm line-through'
              : 'text-foreground break-words text-sm font-medium'
          }
        >
          {task.title}
        </p>
        {relevantTime ? (
          <span className="text-muted-foreground shrink-0 text-xs">
            {variant === 'completed' ? 'Completed' : 'Due'} {relevantTime}
          </span>
        ) : null}
      </div>
      {task.description ? (
        <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
          {task.description}
        </p>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-xs">
          {priorityLabel[task.priority]}
        </span>
        <CategoryBadge category={task.category} />
        <span className="sr-only">Status: {task.status}</span>
      </div>
    </li>
  );
}
