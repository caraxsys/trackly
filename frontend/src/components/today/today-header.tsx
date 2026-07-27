import { CalendarDays } from 'lucide-react';

import { DateNavigation } from './date-navigation';
import {
  formatDisplayDate,
  getDisplayName,
  getGreeting,
} from '@/lib/today-format';

export function TodayHeader({
  date,
  hasExplicitDate,
  now,
  timezone,
  userName,
}: {
  date: string;
  hasExplicitDate: boolean;
  now: Date;
  timezone: string;
  userName: string;
}) {
  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-foreground text-3xl font-semibold tracking-tight">
            {getGreeting(now, timezone)}, {getDisplayName(userName)}
          </h1>
          {hasExplicitDate ? (
            <span className="bg-primary-soft text-primary rounded-full px-2.5 py-1 text-xs font-medium">
              Viewing another date
            </span>
          ) : null}
        </div>
        <p className="text-muted-foreground mt-2 flex items-center gap-2 text-sm sm:text-base">
          <CalendarDays aria-hidden="true" className="size-4 shrink-0" />
          {formatDisplayDate(date)}
        </p>
      </div>
      <DateNavigation date={date} hasExplicitDate={hasExplicitDate} />
    </header>
  );
}
