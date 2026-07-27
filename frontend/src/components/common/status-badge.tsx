import type { ReactNode } from 'react';

interface StatusBadgeProps {
  children: ReactNode;
  muted?: boolean;
}

export function StatusBadge({ children, muted = false }: StatusBadgeProps) {
  return (
    <span
      className={
        muted
          ? 'bg-muted text-muted-foreground inline-flex rounded-full px-2.5 py-1 text-xs font-medium'
          : 'bg-primary-soft text-foreground inline-flex rounded-full px-2.5 py-1 text-xs font-medium'
      }
    >
      {children}
    </span>
  );
}
