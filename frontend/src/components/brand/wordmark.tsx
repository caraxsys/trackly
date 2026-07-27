import Link from 'next/link';

import { cn } from '@/lib/utils';

interface WordmarkProps {
  compact?: boolean;
  className?: string;
}

export function Wordmark({ compact = false, className }: WordmarkProps) {
  return (
    <Link
      className={cn(
        'focus-visible:ring-ring inline-flex flex-col rounded-sm outline-none focus-visible:ring-2',
        className,
      )}
      href="/today"
    >
      <span className="text-foreground text-lg font-semibold tracking-tight">
        Trackly
      </span>
      {!compact && (
        <span className="text-muted-foreground text-xs">
          Build consistency. Track progress.
        </span>
      )}
    </Link>
  );
}
