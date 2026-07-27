import {
  BarChart3,
  CalendarDays,
  CheckSquare2,
  ListChecks,
  Settings,
  Target,
  type LucideIcon,
} from 'lucide-react';

export interface NavigationItem {
  label: string;
  href: string;
  icon: LucideIcon;
  mobile: boolean;
}

export const navigationItems: NavigationItem[] = [
  { label: 'Today', href: '/today', icon: CalendarDays, mobile: true },
  { label: 'Habits', href: '/habits', icon: ListChecks, mobile: true },
  { label: 'Tasks', href: '/tasks', icon: CheckSquare2, mobile: true },
  { label: 'Goals', href: '/goals', icon: Target, mobile: true },
  { label: 'Analytics', href: '/analytics', icon: BarChart3, mobile: true },
  { label: 'Settings', href: '/settings', icon: Settings, mobile: false },
];
