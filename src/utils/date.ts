/**
 * Date/Time Utilities for Behav
 * Ensures consistent ISO 8601 storage and prevents timezone shifts.
 */

/**
 * Returns current ISO timestamp (e.g. 2026-10-25T10:45:00.000Z)
 */
export function getCurrentIsoTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Extracts standard YYYY-MM-DD day string from Date or ISO string
 */
export function toDayString(input?: Date | string): string {
  if (!input) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  if (typeof input === 'string') {
    // If already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      return input;
    }
    const parsed = new Date(input);
    if (!isNaN(parsed.getTime())) {
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const day = String(parsed.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    // Fallback: take first 10 characters if valid
    return input.slice(0, 10);
  }

  const year = input.getFullYear();
  const month = String(input.getMonth() + 1).padStart(2, '0');
  const day = String(input.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
