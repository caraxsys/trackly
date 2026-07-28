import { redirect } from 'next/navigation';
import { GoalForm } from '@/components/goals/goal-form';
import { PageHeader } from '@/components/layout/page-header';
import { getServerSession } from '@/lib/auth-session';
import { getSelectableGoalHabits } from '@/services/goal-server-service';
export default async function NewGoalPage() {
  if (!(await getServerSession())) redirect('/login');
  const habits = (await getSelectableGoalHabits()).items;
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="space-y-6">
      <PageHeader
        title="New Goal"
        description="Create an accumulation target linked to one Habit."
      />
      <GoalForm
        mode="create"
        habits={habits}
        initialValues={{
          name: '',
          habitId: '',
          targetCount: 1,
          startDate: today,
          endDate: today,
          status: 'active',
        }}
      />
    </div>
  );
}
