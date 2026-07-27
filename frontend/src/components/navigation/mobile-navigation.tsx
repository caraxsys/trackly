'use client';

import { NavigationLink } from '@/components/navigation/navigation-link';
import { navigationItems } from '@/config/navigation';

export function MobileNavigation() {
  return (
    <nav
      aria-label="Mobile navigation"
      className="border-border bg-surface/95 fixed inset-x-0 bottom-0 z-30 border-t px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur lg:hidden"
    >
      <ul className="mx-auto flex max-w-xl justify-around">
        {navigationItems
          .filter((item) => item.mobile)
          .map((item) => (
            <li key={item.href} className="flex min-w-0 flex-1">
              <NavigationLink compact item={item} />
            </li>
          ))}
      </ul>
    </nav>
  );
}
