import { CircleDashed } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="border-border bg-surface flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed px-6 py-12 text-center">
      <div className="bg-primary-soft text-primary flex size-10 items-center justify-center rounded-full">
        <CircleDashed aria-hidden="true" className="size-5" />
      </div>
      <h2 className="text-foreground mt-4 text-base font-semibold">{title}</h2>
      <p className="text-muted-foreground mt-2 max-w-md text-sm leading-6">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
