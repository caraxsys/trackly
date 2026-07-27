const isoDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/;

function dateOnlyToUtc(value: string) {
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

  return date;
}

export function addDisplayDateDays(value: string, days: number) {
  const date = dateOnlyToUtc(value);

  if (!date) {
    return value;
  }

  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function formatDisplayDate(value: string, locale = 'en-US') {
  const date = dateOnlyToUtc(value);

  if (!date) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatShortDate(value: string, locale = 'en-US') {
  const date = dateOnlyToUtc(value);

  if (!date) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatTimeInTimezone(
  value: string | null,
  timezone: string,
  locale = 'en-US',
) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  try {
    return new Intl.DateTimeFormat(locale, {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat(locale, {
      timeZone: 'UTC',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }
}

export function getDisplayName(name: string | null | undefined) {
  const normalized = name?.trim();
  return normalized ? normalized.split(/\s+/)[0] : 'there';
}

export function getGreeting(instant: Date, timezone: string) {
  try {
    const hourPart = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hourCycle: 'h23',
    })
      .formatToParts(instant)
      .find((part) => part.type === 'hour');
    const hour = Number(hourPart?.value);

    if (hour < 12) {
      return 'Good morning';
    }
    if (hour < 18) {
      return 'Good afternoon';
    }
    return 'Good evening';
  } catch {
    return 'Hello';
  }
}
