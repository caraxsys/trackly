import {
  addCalendarDays,
  parseCalendarDate,
  type CalendarDate,
} from './calendar-date.js';

const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();

function formatter(timezone: string) {
  const cached = dateFormatterCache.get(timezone);

  if (cached) {
    return cached;
  }

  const created = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  dateFormatterCache.set(timezone, created);
  return created;
}

function zonedParts(instant: Date, timezone: string) {
  const values = Object.fromEntries(
    formatter(timezone)
      .formatToParts(instant)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    year: values.year ?? 0,
    month: values.month ?? 0,
    day: values.day ?? 0,
    hour: values.hour ?? 0,
    minute: values.minute ?? 0,
    second: values.second ?? 0,
  };
}

export function isValidTimezone(timezone: string) {
  try {
    formatter(timezone);
    return true;
  } catch {
    return false;
  }
}

export function resolveTimezone(timezone: string | null | undefined) {
  return timezone && isValidTimezone(timezone) ? timezone : 'UTC';
}

export function getLocalCalendarDate(instant: Date, timezone: string) {
  const parts = zonedParts(instant, timezone);
  return `${parts.year.toString().padStart(4, '0')}-${parts.month
    .toString()
    .padStart(2, '0')}-${parts.day.toString().padStart(2, '0')}`;
}

function localMidnightInstant(date: CalendarDate, timezone: string) {
  const desiredUtcValue = Date.UTC(date.year, date.month - 1, date.day);
  let candidate = desiredUtcValue;

  for (let iteration = 0; iteration < 4; iteration += 1) {
    const actual = zonedParts(new Date(candidate), timezone);
    const actualUtcValue = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second,
    );
    const adjustment = desiredUtcValue - actualUtcValue;
    candidate += adjustment;

    if (adjustment === 0) {
      break;
    }
  }

  return new Date(candidate);
}

export function getLocalDayBounds(dateValue: string, timezone: string) {
  const date = parseCalendarDate(dateValue);
  const nextDate = parseCalendarDate(addCalendarDays(dateValue, 1));

  if (!date || !nextDate) {
    throw new Error('A valid calendar date is required.');
  }

  return {
    start: localMidnightInstant(date, timezone),
    end: localMidnightInstant(nextDate, timezone),
  };
}
