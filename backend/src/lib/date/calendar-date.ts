const isoDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/;

export interface CalendarDate {
  day: number;
  month: number;
  value: string;
  year: number;
}

function formatCalendarDate(year: number, month: number, day: number) {
  return `${year.toString().padStart(4, '0')}-${month
    .toString()
    .padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

export function parseCalendarDate(value: string): CalendarDate | null {
  const match = isoDatePattern.exec(value);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day, value };
}

export function addCalendarDays(value: string, days: number) {
  const parsed = parseCalendarDate(value);

  if (!parsed) {
    throw new Error('A valid calendar date is required.');
  }

  const date = new Date(
    Date.UTC(parsed.year, parsed.month - 1, parsed.day + days),
  );
  return formatCalendarDate(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  );
}

export function getIsoWeekday(value: string) {
  const parsed = parseCalendarDate(value);

  if (!parsed) {
    throw new Error('A valid calendar date is required.');
  }

  const weekday = new Date(
    Date.UTC(parsed.year, parsed.month - 1, parsed.day),
  ).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}
