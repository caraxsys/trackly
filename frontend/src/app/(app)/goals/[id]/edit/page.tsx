import { notFound, redirect } from 'next/navigation';
import { GoalForm } from '@/components/goals/goal-form';
import { PageHeader } from '@/components/layout/page-header';
import { getServerSession } from '@/lib/auth-session';
import {
  getSelectableGoalHabits,
  getServerGoal,
  GoalServerError,
} from '@/services/goal-server-service';
export default async function EditGoalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await getServerSession())) redirect('/login');
  const id = (await params).id;
  let goal;
  try {
    goal = await getServerGoal(id);
  } catch (error) {
    if (error instanceof GoalServerError && error.status === 404) notFound();
    throw error;
  }
  const items = (await getSelectableGoalHabits()).items;
  const habits = items.some((habit) => habit.id === goal.habitId)
    ? items
    : [{ id: goal.habitId, name: goal.habitName }, ...items];
  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Goal"
        description="Update the target without changing derived progress."
      />
      <GoalForm
        mode="edit"
        goalId={id}
        habits={habits}
        initialValues={{
          name: goal.name,
          habitId: goal.habitId,
          targetCount: goal.targetCount,
          startDate: goal.startDate,
          endDate: goal.endDate,
          status: goal.status,
        }}
      />
    </div>
  );
}
