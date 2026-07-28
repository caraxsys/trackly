'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { deleteGoal } from '@/services/goal-mutation-service';
export function GoalDeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      disabled={pending}
      className="border-destructive text-destructive focus-visible:ring-ring rounded-lg border px-4 py-2 outline-none focus-visible:ring-2"
      onClick={async () => {
        if (
          !window.confirm(
            'Delete this Goal? This action removes it from normal views.',
          )
        )
          return;
        setPending(true);
        try {
          await deleteGoal(id);
          router.push('/goals');
          router.refresh();
        } finally {
          setPending(false);
        }
      }}
    >
      {pending ? 'Deleting…' : 'Delete Goal'}
    </button>
  );
}
