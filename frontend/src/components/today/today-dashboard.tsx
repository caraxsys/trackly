import { DailyProgress } from './daily-progress';
import { GoalList } from './goal-list';
import { HabitList } from './habit-list';
import { TaskSections } from './task-sections';
import { TodayEmptyState } from './today-empty-state';
import { TodayHeader } from './today-header';
import type { TodayResponseData } from '@/types/today';

export function TodayDashboard({
  data,
  hasExplicitDate,
  now,
  userName,
}: {
  data: TodayResponseData;
  hasExplicitDate: boolean;
  now: Date;
  userName: string;
}) {
  const isEmpty =
    data.habits.length === 0 &&
    data.tasks.overdue.length === 0 &&
    data.tasks.dueToday.length === 0 &&
    data.tasks.completedToday.length === 0 &&
    data.goals.length === 0;

  return (
    <div className="space-y-8">
      <TodayHeader
        date={data.date}
        hasExplicitDate={hasExplicitDate}
        now={now}
        timezone={data.timezone}
        userName={userName}
      />
      <DailyProgress summary={data.summary} />
      {isEmpty ? (
        <TodayEmptyState />
      ) : (
        <>
          <div className="grid gap-6 xl:grid-cols-2">
            <HabitList date={data.date} habits={data.habits} />
            <TaskSections tasks={data.tasks} timezone={data.timezone} />
          </div>
          <GoalList goals={data.goals} />
        </>
      )}
    </div>
  );
}
