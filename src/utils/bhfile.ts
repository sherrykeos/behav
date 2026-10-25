/**
 * BHFile v1 Canonical Data Interchange & Streak Utility
 * Authoritative implementation of the locked BHFile v1 format.
 */

import { shiftDayString } from './date';
import { isDiscreteUnit } from './measurement';

export interface BHFileV1Habit {
  id: string;
  name: string;
  unit: string;
}

export interface BHFileV1Day {
  date: string;
  habits: Record<string, number>;
}

export interface BHFileV1HabitSummary {
  total: number;
}

export interface BHFileV1Summary {
  totalDays: number;
  greenDays: number;
  maxStreak: number;
  habits: Record<string, BHFileV1HabitSummary>;
}

export interface BHFileV1 {
  format: 'bhfile';
  version: 1;
  habits: BHFileV1Habit[];
  days: BHFileV1Day[];
  summary: BHFileV1Summary;
}

/**
 * Returns true if a calendar day record is green.
 * Rule: A day is green if and only if every habit quantity for that date equals zero.
 * If even one habit has a positive quantity, the day is not green.
 */
export function isDayGreen(day: BHFileV1Day): boolean {
  const values = Object.values(day.habits);
  if (values.length === 0) return false;
  return values.every((qty) => qty === 0);
}

/**
 * Calculates the total number of green days in an array of day records.
 */
export function calculateGreenDays(days: BHFileV1Day[]): number {
  return days.filter(isDayGreen).length;
}

/**
 * Canonical Maximum Streak Calculation Algorithm.
 * 
 * Rules:
 * 1. Maximum streak is the longest sequence of consecutive calendar days that are all green.
 * 2. Missing calendar dates break the streak (missing dates must not be assumed green).
 * 3. Non-green days break the streak.
 * 4. If there are no green days, maxStreak is 0.
 * 
 * @param dailyRecords Array of chronological entries containing date (YYYY-MM-DD) and isGreen boolean
 */
export function calculateMaxStreakFromDays(
  dailyRecords: { date: string; isGreen: boolean }[]
): number {
  if (!dailyRecords || dailyRecords.length === 0) {
    return 0;
  }

  let currentStreak = 0;
  let maxStreak = 0;
  let prevDate: string | null = null;

  for (const record of dailyRecords) {
    if (record.isGreen) {
      if (prevDate === null) {
        currentStreak = 1;
      } else {
        const expectedNextDate = shiftDayString(prevDate, 1);
        if (expectedNextDate === record.date) {
          currentStreak += 1;
        } else {
          // Missing date(s) between prevDate and record.date breaks the continuous streak
          currentStreak = 1;
        }
      }
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
      }
    } else {
      // Non-green day breaks current streak
      currentStreak = 0;
    }

    prevDate = record.date;
  }

  return maxStreak;
}

/**
 * Calculates the canonical BHFile v1 summary from habits and days.
 * The summary is derived data, never the source of truth.
 */
export function calculateBHFileSummary(
  habits: BHFileV1Habit[],
  days: BHFileV1Day[]
): BHFileV1Summary {
  const totalDays = days.length;
  const greenDays = calculateGreenDays(days);
  const maxStreak = calculateMaxStreakFromDays(
    days.map((d) => ({
      date: d.date,
      isGreen: isDayGreen(d),
    }))
  );

  const habitSummaries: Record<string, BHFileV1HabitSummary> = {};
  for (const habit of habits) {
    const sum = days.reduce((acc, d) => acc + (d.habits[habit.id] || 0), 0);
    // Round to avoid IEEE 754 precision artifacts (e.g. 0.1 + 0.2 = 0.30000000000000004)
    const rounded = Math.round(sum * 10000) / 10000;
    habitSummaries[habit.id] = { total: rounded };
  }

  return {
    totalDays,
    greenDays,
    maxStreak,
    habits: habitSummaries,
  };
}

/**
 * Validates a candidate JSON payload against the locked BHFile v1 specification.
 */
export function validateBHFileV1(
  payload: unknown
): { isValid: boolean; error?: string; data?: BHFileV1 } {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    return { isValid: false, error: 'BHFile must be a valid JSON object.' };
  }

  const obj = payload as Record<string, unknown>;

  // Check prohibited root fields
  const allowedRootKeys = new Set(['format', 'version', 'habits', 'days', 'summary']);
  for (const key of Object.keys(obj)) {
    if (!allowedRootKeys.has(key)) {
      return {
        isValid: false,
        error: `Prohibited root field detected: "${key}". Canonical BHFile v1 does not allow extraneous metadata.`,
      };
    }
  }

  // 1. Format
  if (obj.format !== 'bhfile') {
    return {
      isValid: false,
      error: `Invalid format identifier "${obj.format}". Expected "bhfile".`,
    };
  }

  // 2. Version
  if (obj.version !== 1) {
    return {
      isValid: false,
      error: `Unsupported format version ${obj.version}. Only version 1 is supported.`,
    };
  }

  // 3. Habits
  if (!Array.isArray(obj.habits)) {
    return { isValid: false, error: 'Field "habits" must be an array.' };
  }

  const habitIds = new Set<string>();
  const habitUnits = new Map<string, string>();
  const allowedHabitKeys = new Set(['id', 'name', 'unit']);

  for (let i = 0; i < obj.habits.length; i++) {
    const h = obj.habits[i];
    if (h === null || typeof h !== 'object' || Array.isArray(h)) {
      return { isValid: false, error: `habits[${i}] must be an object.` };
    }

    const hObj = h as Record<string, unknown>;
    for (const key of Object.keys(hObj)) {
      if (!allowedHabitKeys.has(key)) {
        return {
          isValid: false,
          error: `Prohibited field "${key}" in habits[${i}]. Habits contain only id, name, and unit.`,
        };
      }
    }

    if (typeof hObj.id !== 'string' || hObj.id.trim() === '') {
      return { isValid: false, error: `habits[${i}].id must be a non-empty string.` };
    }
    if (habitIds.has(hObj.id)) {
      return { isValid: false, error: `Duplicate habit ID "${hObj.id}" in habits list.` };
    }
    habitIds.add(hObj.id);

    if (typeof hObj.name !== 'string' || hObj.name.trim() === '') {
      return { isValid: false, error: `habits[${i}].name must be a non-empty string.` };
    }

    if (typeof hObj.unit !== 'string' || hObj.unit.trim() === '') {
      return { isValid: false, error: `habits[${i}].unit must be a non-empty string.` };
    }
    habitUnits.set(hObj.id, hObj.unit.trim());
  }

  // 4. Days
  if (!Array.isArray(obj.days)) {
    return { isValid: false, error: 'Field "days" must be an array.' };
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  let prevDate: string | null = null;
  const allowedDayKeys = new Set(['date', 'habits']);

  for (let i = 0; i < obj.days.length; i++) {
    const d = obj.days[i];
    if (d === null || typeof d !== 'object' || Array.isArray(d)) {
      return { isValid: false, error: `days[${i}] must be an object.` };
    }

    const dObj = d as Record<string, unknown>;
    for (const key of Object.keys(dObj)) {
      if (!allowedDayKeys.has(key)) {
        return {
          isValid: false,
          error: `Prohibited field "${key}" in days[${i}]. Days contain only date and habits.`,
        };
      }
    }

    if (typeof dObj.date !== 'string' || !dateRegex.test(dObj.date)) {
      return {
        isValid: false,
        error: `days[${i}].date must be a valid YYYY-MM-DD date string.`,
      };
    }

    // Verify valid calendar date (e.g. not 2026-02-31)
    const [year, month, day] = dObj.date.split('-').map(Number);
    const parsedDate = new Date(year, month - 1, day);
    if (
      parsedDate.getFullYear() !== year ||
      parsedDate.getMonth() !== month - 1 ||
      parsedDate.getDate() !== day
    ) {
      return {
        isValid: false,
        error: `days[${i}].date "${dObj.date}" is an invalid calendar date.`,
      };
    }

    // Chronological order and uniqueness check
    if (prevDate !== null) {
      if (dObj.date === prevDate) {
        return {
          isValid: false,
          error: `Duplicate date "${dObj.date}" found in days array.`,
        };
      }
      if (dObj.date < prevDate) {
        return {
          isValid: false,
          error: `Non-chronological date order: "${dObj.date}" occurs after "${prevDate}".`,
        };
      }
    }
    prevDate = dObj.date;

    // Validate habits map
    if (dObj.habits === null || typeof dObj.habits !== 'object' || Array.isArray(dObj.habits)) {
      return { isValid: false, error: `days[${i}].habits must be a map of habit IDs to quantities.` };
    }

    const dayHabits = dObj.habits as Record<string, unknown>;

    // Every habit defined in root.habits must be present in day.habits
    for (const habitId of habitIds) {
      if (!(habitId in dayHabits)) {
        return {
          isValid: false,
          error: `days[${i}] ("${dObj.date}") is missing habit "${habitId}". Every day must contain all defined habits.`,
        };
      }
    }

    // No unknown habit IDs
    for (const habitId of Object.keys(dayHabits)) {
      if (!habitIds.has(habitId)) {
        return {
          isValid: false,
          error: `days[${i}] ("${dObj.date}") references undefined habit ID "${habitId}".`,
        };
      }

      const val = dayHabits[habitId];
      if (typeof val !== 'number' || isNaN(val)) {
        return {
          isValid: false,
          error: `days[${i}].habits["${habitId}"] must be a number.`,
        };
      }

      if (val < 0) {
        return {
          isValid: false,
          error: `days[${i}].habits["${habitId}"] cannot be negative (${val}).`,
        };
      }

      // Quantity unit validation (discrete units must be integers)
      const unit = habitUnits.get(habitId) || '';
      if (isDiscreteUnit(unit) && !Number.isInteger(val)) {
        return {
          isValid: false,
          error: `Quantity ${val} for discrete habit "${habitId}" (${unit}) must be an integer.`,
        };
      }
    }
  }

  // 5. Summary
  if (obj.summary === null || typeof obj.summary !== 'object' || Array.isArray(obj.summary)) {
    return { isValid: false, error: 'Field "summary" must be an object.' };
  }

  const summaryObj = obj.summary as Record<string, unknown>;
  const allowedSummaryKeys = new Set(['totalDays', 'greenDays', 'maxStreak', 'habits']);
  for (const key of Object.keys(summaryObj)) {
    if (!allowedSummaryKeys.has(key)) {
      return {
        isValid: false,
        error: `Prohibited field "${key}" in summary. Summary contains only totalDays, greenDays, maxStreak, and habits.`,
      };
    }
  }

  // Recalculate summary independently to detect tampering or corruption
  const expectedSummary = calculateBHFileSummary(
    obj.habits as BHFileV1Habit[],
    obj.days as BHFileV1Day[]
  );

  if (summaryObj.totalDays !== expectedSummary.totalDays) {
    return {
      isValid: false,
      error: `Summary mismatch: totalDays is ${summaryObj.totalDays}, expected ${expectedSummary.totalDays}.`,
    };
  }

  if (summaryObj.greenDays !== expectedSummary.greenDays) {
    return {
      isValid: false,
      error: `Summary mismatch: greenDays is ${summaryObj.greenDays}, expected ${expectedSummary.greenDays}.`,
    };
  }

  if (summaryObj.maxStreak !== expectedSummary.maxStreak) {
    return {
      isValid: false,
      error: `Summary mismatch: maxStreak is ${summaryObj.maxStreak}, expected ${expectedSummary.maxStreak}.`,
    };
  }

  if (summaryObj.habits === null || typeof summaryObj.habits !== 'object' || Array.isArray(summaryObj.habits)) {
    return { isValid: false, error: 'summary.habits must be an object.' };
  }

  const summaryHabits = summaryObj.habits as Record<string, unknown>;

  // Check every defined habit in summary
  for (const habitId of habitIds) {
    if (!(habitId in summaryHabits)) {
      return {
        isValid: false,
        error: `summary.habits is missing habit "${habitId}".`,
      };
    }

    const hSummary = summaryHabits[habitId] as Record<string, unknown> | null;
    if (!hSummary || typeof hSummary !== 'object' || typeof hSummary.total !== 'number') {
      return {
        isValid: false,
        error: `summary.habits["${habitId}"].total must be a number.`,
      };
    }

    const expectedTotal = expectedSummary.habits[habitId]?.total ?? 0;
    // Allow epsilon for floating point totals
    if (Math.abs(hSummary.total - expectedTotal) > 0.0001) {
      return {
        isValid: false,
        error: `Summary mismatch for habit "${habitId}": declared total ${hSummary.total}, calculated total ${expectedTotal}.`,
      };
    }
  }

  // Check for unknown habits in summary
  for (const habitId of Object.keys(summaryHabits)) {
    if (!habitIds.has(habitId)) {
      return {
        isValid: false,
        error: `summary.habits contains undefined habit "${habitId}".`,
      };
    }
  }

  return {
    isValid: true,
    data: obj as unknown as BHFileV1,
  };
}
