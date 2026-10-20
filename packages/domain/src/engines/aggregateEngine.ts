import { BehaviorEntry, DailyAggregate, DailyReview, DailyReviewStatus } from '../entities/types';

export interface AggregateCalculationInput {
  userId: string;
  behaviorId: string;
  localDate: string; // YYYY-MM-DD
  entries: BehaviorEntry[];
  review?: DailyReview | null;
  calculatedAt?: string;
}

/**
 * Deterministically computes the daily aggregate for a specific behavior and date.
 * Rules:
 * 1. An absence of entries NEVER implies confirmed zero activity.
 * 2. If entries exist, status is 'LOGGED'.
 * 3. If no entries exist, status is 'CONFIRMED_ZERO' only if explicitly confirmed via DailyReview.
 * 4. If no entries exist and no review exists, status is 'PENDING'.
 * 5. If review specifies 'EXCLUDED', status is 'EXCLUDED'.
 */
export function calculateDailyAggregate(input: AggregateCalculationInput): DailyAggregate {
  const { userId, behaviorId, localDate, entries, review } = input;
  const now = input.calculatedAt || new Date().toISOString();

  // Active entries only (non-deleted)
  const activeEntries = entries.filter((e) => !e.deletedAt);

  const occurrenceCount = activeEntries.length;
  const totalQuantity = activeEntries.reduce((sum, e) => sum + (Number(e.quantity) || 0), 0);

  let reviewStatus: DailyReviewStatus = 'PENDING';

  if (activeEntries.length > 0) {
    reviewStatus = 'LOGGED';
  } else if (review) {
    reviewStatus = review.status;
  } else {
    reviewStatus = 'PENDING';
  }

  return {
    userId,
    behaviorId,
    localDate,
    totalQuantity: Math.round(totalQuantity * 100) / 100, // standard 2 decimal precision
    occurrenceCount,
    reviewStatus,
    calculatedAt: now
  };
}

/**
 * Group entries by local date string based on their occurrence timestamp and timezone.
 */
export function groupEntriesByLocalDate(
  entries: BehaviorEntry[],
  fallbackTimezone: string = 'UTC'
): Map<string, BehaviorEntry[]> {
  const map = new Map<string, BehaviorEntry[]>();

  for (const entry of entries) {
    if (entry.deletedAt) continue;

    // Extract YYYY-MM-DD from occurredAt or format with timezone
    let localDate: string;
    try {
      const tz = entry.timezone || fallbackTimezone;
      const date = new Date(entry.occurredAt);
      // Format as YYYY-MM-DD in the entry's timezone
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      localDate = formatter.format(date); // en-CA gives YYYY-MM-DD
    } catch {
      // Fallback to ISO substring if timezone is invalid
      localDate = entry.occurredAt.substring(0, 10);
    }

    if (!map.has(localDate)) {
      map.set(localDate, []);
    }
    map.get(localDate)!.push(entry);
  }

  return map;
}
