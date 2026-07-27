import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface SectionProps {
  children: ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

export function Section({
  children,
  title,
  description,
  className,
}: SectionProps) {
  return (
    <section className={cn('py-8', className)}>
      {(title || description) && (
        <div className="mb-4">
          {title && (
            <h2 className="text-foreground text-lg font-semibold">{title}</h2>
          )}
          {description && (
            <p className="text-muted-foreground mt-1 text-sm">{description}</p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
