'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import type { NavigationItem } from '@/config/navigation';
import { cn } from '@/lib/utils';

interface NavigationLinkProps {
  item: NavigationItem;
  compact?: boolean;
}

export function NavigationLink({ item, compact = false }: NavigationLinkProps) {
  const pathname = usePathname();
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  return (
    <Link
      aria-current={active ? 'page' : undefined}
      className={cn(
        'focus-visible:ring-ring group flex rounded-lg text-sm font-medium outline-none transition-colors focus-visible:ring-2 motion-reduce:transition-none',
        compact
          ? 'min-w-0 flex-1 flex-col items-center gap-1 px-1 py-2 text-[0.6875rem]'
          : 'items-center gap-3 px-3 py-2.5',
        active
          ? 'bg-primary-soft text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
      href={item.href}
    >
      <Icon aria-hidden="true" className="size-5 shrink-0" />
      <span>{item.label}</span>
    </Link>
  );
}
