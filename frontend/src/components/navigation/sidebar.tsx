'use client';

import { Wordmark } from '@/components/brand/wordmark';
import { NavigationLink } from '@/components/navigation/navigation-link';
import { navigationItems } from '@/config/navigation';

export function Sidebar() {
  return (
    <aside className="border-border bg-surface fixed inset-y-0 left-0 z-20 hidden w-64 border-r lg:flex lg:flex-col">
      <div className="px-6 py-6">
        <Wordmark />
      </div>
      <nav aria-label="Primary navigation" className="flex-1 px-3 py-3">
        <ul className="space-y-1">
          {navigationItems.map((item) => (
            <li key={item.href}>
              <NavigationLink item={item} />
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
