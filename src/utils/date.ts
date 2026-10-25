/**
 * Date/Time Utilities for Behav
 * Ensures consistent ISO 8601 storage and prevents timezone shifts.
 */

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Returns a local-offset ISO 8601 string (e.g. 2026-10-25T16:45:00.000+05:30)
 * Preserves the exact local calendar date in the first 10 characters (YYYY-MM-DD).
 */
export function toLocalIsoString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  const ms = String(date.getMilliseconds()).padStart(3, '0');

  const tzOffset = -date.getTimezoneOffset();
  const diff = tzOffset >= 0 ? '+' : '-';
  const tzHours = pad(Math.floor(Math.abs(tzOffset) / 60));
  const tzMinutes = pad(Math.abs(tzOffset) % 60);

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}${diff}${tzHours}:${tzMinutes}`;
}

/**
 * Returns current timestamp in local ISO format
 */
export function getCurrentIsoTimestamp(): string {
  return toLocalIsoString(new Date());
}

/**
 * Extracts standard YYYY-MM-DD day string from Date or ISO string
 */
export function toDayString(input?: Date | string): string {
  if (!input) {
    const now = new Date();
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }

  if (typeof input === 'string') {
    // If already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      return input;
    }
    // If ISO string starting with YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}T/.test(input)) {
      return input.slice(0, 10);
    }
    const parsed = new Date(input);
    if (!isNaN(parsed.getTime())) {
      return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
    }
    return input.slice(0, 10);
  }

  return `${input.getFullYear()}-${pad(input.getMonth() + 1)}-${pad(input.getDate())}`;
}

/**
 * Shifts a YYYY-MM-DD day string by deltaDays (+1, -1, etc.) safely
 */
export function shiftDayString(dayString: string, deltaDays: number): string {
  const [y, m, d] = dayString.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + deltaDays);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Formats a YYYY-MM-DD day string for friendly section headers
 */
export function formatDayHeader(dayString: string): string {
  const today = toDayString();
  const yesterday = shiftDayString(today, -1);

  if (dayString === today) {
    return 'Today';
  }
  if (dayString === yesterday) {
    return 'Yesterday';
  }

  const [y, m, d] = dayString.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Formats time from an ISO timestamp (e.g. "09:30 AM")
 */
export function formatTimeFriendly(isoString: string): string {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Extracts 24h HH:mm string from an ISO timestamp
 */
export function extractTimeHHmm(isoString: string): string {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '12:00';
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Combines YYYY-MM-DD day string and HH:mm time string into a valid local ISO string
 */
export function combineDateAndTime(dayString: string, timeString: string): string {
  const [y, m, d] = dayString.split('-').map(Number);
  const [h, min] = timeString.split(':').map(Number);
  const date = new Date(y, m - 1, d, h || 0, min || 0, 0, 0);
  return toLocalIsoString(date);
}

/**
 * Validates if string is a valid ISO date
 */
export function isValidIsoDate(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  const d = new Date(value);
  return !isNaN(d.getTime());
}

/**
 * Formats a date string to a friendly human readable string
 */
export function formatFriendlyDate(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}
