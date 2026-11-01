/**
 * Authoritative Analytics Engine for Behav
 * 
 * Strict Business Rules:
 * 1. Behav tracks undesirable behaviors (e.g. Smoking, Fap).
 *    - 0 means behavior did not occur.
 *    - Positive quantity means behavior occurred.
 * 2. A day is GREEN if and only if:
 *    - Every tracked habit has a recorded quantity of zero.
 *    - The day has a valid daily record.
 *    A day without a record is UNKNOWN, not GREEN.
 * 3. Streaks:
 *    - Maximum streak is the longest sequence of consecutive calendar dates that qualify.
 *    - Missing dates break the streak (missing dates must NEVER be assumed green).
 *    - Non-qualifying days break the streak.
 * 4. Current streak:
 *    - The sequence of consecutive qualifying days ending on the latest valid recorded date.
 *    - Does not pretend unrecorded dates are green.
 * 5. Habit streaks are independent:
 *    - Smoke-free streak depends only on Smoking quantity === 0.
 *    - Fap-free streak depends only on Fap quantity === 0.
 * 6. Pure, deterministic functions with no UI dependencies or side effects.
 */

import { shiftDayString } from '../../utils/date';

export interface HabitDefinition {
  id: string;
  name: string;
  unit?: string;
  dailyLimit?: number | null;
}

export interface DayHabitValues {
  date: string; // YYYY-MM-DD
  habits: Record<string, number>; // habitId -> daily quantity (>= 0)
}

export interface StreakSpan {
  streak: number;
  startDate: string | null;
  endDate: string | null;
}

export interface HabitAnalytics {
  id: string;
  name: string;
  totalQuantity: number;
  recordedDays: number;
  zeroDays: number;
  activityDays: number;
  currentFreeStreak: number;
  currentFreeStreakStart: string | null;
  currentFreeStreakEnd: string | null;
  maxFreeStreak: number;
  maxFreeStreakStart: string | null;
  maxFreeStreakEnd: string | null;
}

export interface PeriodAnalyticsResult {
  period: {
    from: string;
    to: string;
  };
  dataQuality: {
    expectedDays: number;
    recordedDays: number;
    missingDays: number;
    invalidRecords: number;
    complete: boolean;
  };
  overview: {
    totalRecordedDays: number;
    greenDays: number;
    activityDays: number;
    unknownDays: number;
    currentGreenStreak: number;
    currentGreenStreakStart: string | null;
    currentGreenStreakEnd: string | null;
    maxGreenStreak: number;
    maxGreenStreakStart: string | null;
    maxGreenStreakEnd: string | null;
  };
  habits: Record<string, HabitAnalytics>;
  dayStatuses: {
    date: string;
    status: 'green' | 'activity' | 'unknown';
    totalVolume: number;
    habitValues: Record<string, number>;
  }[];
}

/**
 * Counts calendar days between two YYYY-MM-DD dates inclusive.
 */
export function countCalendarDaysInclusive(from: string, to: string): number {
  if (from > to) return 0;
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  const fromUtc = Date.UTC(fy, fm - 1, fd);
  const toUtc = Date.UTC(ty, tm - 1, td);
  const diffMs = toUtc - fromUtc;
  return Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Checks if a given day record is green.
 * Rule: Every tracked habit must have a recorded quantity of exactly zero.
 * If habits list is empty, returns false.
 */
export function isDayRecordGreen(
  dayRecord: DayHabitValues,
  trackedHabitIds: string[]
): boolean {
  if (!trackedHabitIds || trackedHabitIds.length === 0) {
    return false;
  }
  for (const habitId of trackedHabitIds) {
    const qty = dayRecord.habits[habitId];
    if (typeof qty !== 'number' || isNaN(qty) || qty > 0) {
      return false;
    }
  }
  return true;
}

/**
 * Calculates max streak and current streak with exact calendar date boundaries.
 * 
 * Rules:
 * - Streaks require strict consecutive calendar continuity (`nextDate === prevDate + 1 day`).
 * - Missing dates immediately break the streak.
 * - Non-qualifying dates immediately break the streak.
 * - Current streak counts consecutive qualifying days ending on the latest recorded date.
 */
export function calculateStreakSeries(
  chronologicalRecords: { date: string; qualifies: boolean }[],
  referenceAnchorDate?: string
): {
  maxStreak: number;
  maxStreakStart: string | null;
  maxStreakEnd: string | null;
  currentStreak: number;
  currentStreakStart: string | null;
  currentStreakEnd: string | null;
} {
  if (!chronologicalRecords || chronologicalRecords.length === 0) {
    return {
      maxStreak: 0,
      maxStreakStart: null,
      maxStreakEnd: null,
      currentStreak: 0,
      currentStreakStart: null,
      currentStreakEnd: null,
    };
  }

  let runningStreak = 0;
  let runningStart: string | null = null;
  let maxStreak = 0;
  let maxStart: string | null = null;
  let maxEnd: string | null = null;
  let prevDate: string | null = null;

  for (const record of chronologicalRecords) {
    if (record.qualifies) {
      if (prevDate === null || shiftDayString(prevDate, 1) !== record.date || runningStreak === 0) {
        runningStreak = 1;
        runningStart = record.date;
      } else {
        runningStreak += 1;
      }

      if (runningStreak > maxStreak) {
        maxStreak = runningStreak;
        maxStart = runningStart;
        maxEnd = record.date;
      }
    } else {
      runningStreak = 0;
      runningStart = null;
    }

    prevDate = record.date;
  }

  // Calculate current streak from the tail of the chronological sequence
  let currentStreak = 0;
  let currentStart: string | null = null;
  let currentEnd: string | null = null;

  const lastIndex = chronologicalRecords.length - 1;
  const lastRecord = chronologicalRecords[lastIndex];

  // If a referenceAnchorDate is provided and the latest recorded date is older than referenceAnchorDate,
  // ensure we do not fabricate streak across unrecorded days.
  if (lastRecord && lastRecord.qualifies) {
    currentEnd = lastRecord.date;
    currentStart = lastRecord.date;
    currentStreak = 1;

    for (let i = lastIndex - 1; i >= 0; i--) {
      const prev = chronologicalRecords[i];
      const nextExpected = shiftDayString(prev.date, 1);
      if (nextExpected === currentStart && prev.qualifies) {
        currentStreak += 1;
        currentStart = prev.date;
      } else {
        break; // Missing date or non-qualifying day breaks current streak
      }
    }
  }

  return {
    maxStreak,
    maxStreakStart: maxStart,
    maxStreakEnd: maxEnd,
    currentStreak,
    currentStreakStart: currentStreak > 0 ? currentStart : null,
    currentStreakEnd: currentStreak > 0 ? currentEnd : null,
  };
}

/**
 * The Authoritative Analytics Calculation Engine.
 * 
 * Computes all metrics deterministically from verified daily records without fabricating data.
 */
export function computeAnalytics(
  habits: HabitDefinition[],
  dailyRecords: DayHabitValues[],
  options?: {
    fromDate?: string;
    toDate?: string;
    referenceDate?: string;
  }
): PeriodAnalyticsResult {
  const trackedHabitIds = habits.map((h) => h.id);
  const habitMap = new Map(habits.map((h) => [h.id, h]));

  // Deduplicate and sort records chronologically by calendar date
  const recordsByDate = new Map<string, DayHabitValues>();
  let invalidRecords = 0;

  for (const rec of dailyRecords) {
    if (!rec || !rec.date || !/^\d{4}-\d{2}-\d{2}$/.test(rec.date)) {
      invalidRecords++;
      continue;
    }
    recordsByDate.set(rec.date, rec);
  }

  const sortedDates = Array.from(recordsByDate.keys()).sort();

  const effectiveFrom = options?.fromDate || (sortedDates.length > 0 ? sortedDates[0] : '2026-01-01');
  const effectiveTo = options?.toDate || (sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : effectiveFrom);

  const expectedDays = countCalendarDaysInclusive(effectiveFrom, effectiveTo);

  // Filter records within the requested period
  const periodDates = sortedDates.filter((d) => d >= effectiveFrom && d <= effectiveTo);
  const recordedDays = periodDates.length;
  const missingDays = Math.max(0, expectedDays - recordedDays);

  let greenDaysCount = 0;
  let activityDaysCount = 0;

  // Track habit sums
  const habitTotals: Record<string, number> = {};
  const habitZeroDays: Record<string, number> = {};
  const habitActivityDays: Record<string, number> = {};
  for (const h of habits) {
    habitTotals[h.id] = 0;
    habitZeroDays[h.id] = 0;
    habitActivityDays[h.id] = 0;
  }

  // Build daily statuses for overview
  const dayStatuses: PeriodAnalyticsResult['dayStatuses'] = [];

  for (const dateStr of periodDates) {
    const dayRec = recordsByDate.get(dateStr)!;
    const isGreen = isDayRecordGreen(dayRec, trackedHabitIds);

    let dayTotalVolume = 0;
    for (const h of habits) {
      const val = dayRec.habits[h.id] || 0;
      dayTotalVolume += val;
      habitTotals[h.id] += val;
      if (val === 0) {
        habitZeroDays[h.id] += 1;
      } else {
        habitActivityDays[h.id] += 1;
      }
    }

    if (isGreen) {
      greenDaysCount++;
    } else {
      activityDaysCount++;
    }

    dayStatuses.push({
      date: dateStr,
      status: isGreen ? 'green' : 'activity',
      totalVolume: dayTotalVolume,
      habitValues: dayRec.habits,
    });
  }

  // 1. Overall Green Streak calculation (consecutive green calendar days)
  const greenChronological = periodDates.map((dateStr) => {
    const dayRec = recordsByDate.get(dateStr)!;
    return {
      date: dateStr,
      qualifies: isDayRecordGreen(dayRec, trackedHabitIds),
    };
  });

  const greenStreaks = calculateStreakSeries(greenChronological, options?.referenceDate);

  // 2. Per-Habit Streaks (clean/zero habit quantity)
  const habitAnalyticsMap: Record<string, HabitAnalytics> = {};

  for (const h of habits) {
    const habitChronological = periodDates.map((dateStr) => {
      const dayRec = recordsByDate.get(dateStr)!;
      const qty = dayRec.habits[h.id] || 0;
      return {
        date: dateStr,
        qualifies: qty === 0,
      };
    });

    const hStreaks = calculateStreakSeries(habitChronological, options?.referenceDate);

    habitAnalyticsMap[h.id] = {
      id: h.id,
      name: h.name,
      totalQuantity: Math.round((habitTotals[h.id] || 0) * 10000) / 10000,
      recordedDays,
      zeroDays: habitZeroDays[h.id] || 0,
      activityDays: habitActivityDays[h.id] || 0,
      currentFreeStreak: hStreaks.currentStreak,
      currentFreeStreakStart: hStreaks.currentStreakStart,
      currentFreeStreakEnd: hStreaks.currentStreakEnd,
      maxFreeStreak: hStreaks.maxStreak,
      maxFreeStreakStart: hStreaks.maxStreakStart,
      maxFreeStreakEnd: hStreaks.maxStreakEnd,
    };
  }

  return {
    period: {
      from: effectiveFrom,
      to: effectiveTo,
    },
    dataQuality: {
      expectedDays,
      recordedDays,
      missingDays,
      invalidRecords,
      complete: missingDays === 0,
    },
    overview: {
      totalRecordedDays: recordedDays,
      greenDays: greenDaysCount,
      activityDays: activityDaysCount,
      unknownDays: missingDays,
      currentGreenStreak: greenStreaks.currentStreak,
      currentGreenStreakStart: greenStreaks.currentStreakStart,
      currentGreenStreakEnd: greenStreaks.currentStreakEnd,
      maxGreenStreak: greenStreaks.maxStreak,
      maxGreenStreakStart: greenStreaks.maxStreakStart,
      maxGreenStreakEnd: greenStreaks.maxStreakEnd,
    },
    habits: habitAnalyticsMap,
    dayStatuses,
  };
}
