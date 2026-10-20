import { DailyAggregate, Goal, GoalVersion, StreakState } from '../entities/types';

export type DayQualification = 'QUALIFIED' | 'LAPSE' | 'PENDING' | 'EXCLUDED';

export interface DayEvaluationResult {
  date: string; // YYYY-MM-DD
  qualification: DayQualification;
  totalQuantity: number;
  occurrenceCount: number;
  targetValue: number;
  explanation: string;
}

export interface StreakCalculationResult {
  currentStreak: number;
  longestStreak: number;
  lastQualifiedDate: string | null;
  dayResults: DayEvaluationResult[];
}

/**
 * Evaluates whether a specific daily aggregate qualifies under a goal's active rule.
 */
export function evaluateDayForGoal(
  aggregate: DailyAggregate,
  goal: Goal | GoalVersion
): DayEvaluationResult {
  const { localDate, totalQuantity, occurrenceCount, reviewStatus } = aggregate;
  const target = goal.targetValue;

  if (reviewStatus === 'EXCLUDED') {
    return {
      date: localDate,
      qualification: 'EXCLUDED',
      totalQuantity,
      occurrenceCount,
      targetValue: target,
      explanation: 'Day was intentionally excluded from goal tracking.'
    };
  }

  if (reviewStatus === 'PENDING') {
    return {
      date: localDate,
      qualification: 'PENDING',
      totalQuantity,
      occurrenceCount,
      targetValue: target,
      explanation: 'Awaiting daily review to confirm activity status.'
    };
  }

  switch (goal.goalType) {
    case 'ABSTINENCE': {
      // Abstinence requires verified 0 activity.
      if (reviewStatus === 'CONFIRMED_ZERO' && totalQuantity === 0 && occurrenceCount === 0) {
        return {
          date: localDate,
          qualification: 'QUALIFIED',
          totalQuantity: 0,
          occurrenceCount: 0,
          targetValue: target,
          explanation: 'Confirmed zero activity for the day.'
        };
      }
      return {
        date: localDate,
        qualification: 'LAPSE',
        totalQuantity,
        occurrenceCount,
        targetValue: target,
        explanation: `${occurrenceCount} occurrence(s) logged (${totalQuantity} total).`
      };
    }

    case 'REDUCTION': {
      // Target value is an upper bound (limit).
      // If confirmed zero, 0 is <= target, so it qualifies.
      if (totalQuantity <= target) {
        return {
          date: localDate,
          qualification: 'QUALIFIED',
          totalQuantity,
          occurrenceCount,
          targetValue: target,
          explanation: `Total of ${totalQuantity} was within target limit of ${target}.`
        };
      }
      return {
        date: localDate,
        qualification: 'LAPSE',
        totalQuantity,
        occurrenceCount,
        targetValue: target,
        explanation: `Total of ${totalQuantity} exceeded target limit of ${target}.`
      };
    }

    case 'FREQUENCY': {
      // Default frequency: at least target occurrences per day (e.g. at least 1 meditation)
      if (occurrenceCount >= target) {
        return {
          date: localDate,
          qualification: 'QUALIFIED',
          totalQuantity,
          occurrenceCount,
          targetValue: target,
          explanation: `Completed ${occurrenceCount} occurrence(s) against target of ${target}.`
        };
      }
      return {
        date: localDate,
        qualification: 'LAPSE',
        totalQuantity,
        occurrenceCount,
        targetValue: target,
        explanation: `Logged ${occurrenceCount} occurrence(s), below target of ${target}.`
      };
    }
  }
}

/**
 * Deterministically computes current and longest streaks across a sequence of daily aggregates.
 *
 * Rules:
 * 1. Independent: Only evaluates against the provided goal.
 * 2. Unconfirmed/pending days: Do not count as lapses. A pending day holds the streak or marks it pending,
 *    never punishing the user with a broken streak for an unconfirmed day.
 * 3. Excluded days: Pauses the streak without resetting.
 * 4. Recalculation: Fully deterministic from source sequence.
 */
export function calculateStreak(
  goal: Goal,
  aggregates: DailyAggregate[], // chronological order (oldest to newest)
  versions: GoalVersion[] = [],
  currentReferenceDate?: string // YYYY-MM-DD (defaults to newest aggregate or today)
): StreakCalculationResult {
  // Sort aggregates ascending
  const sorted = [...aggregates].sort((a, b) => a.localDate.localeCompare(b.localDate));

  let longestStreak = 0;
  let runningStreak = 0;
  let lastQualifiedDate: string | null = null;
  const dayResults: DayEvaluationResult[] = [];

  for (const agg of sorted) {
    // Find effective goal version for this aggregate date, if versions exist
    const effectiveRule = findEffectiveGoalVersion(goal, versions, agg.localDate);
    const evalResult = evaluateDayForGoal(agg, effectiveRule);
    dayResults.push(evalResult);

    if (evalResult.qualification === 'QUALIFIED') {
      runningStreak += 1;
      lastQualifiedDate = agg.localDate;
      if (runningStreak > longestStreak) {
        longestStreak = runningStreak;
      }
    } else if (evalResult.qualification === 'LAPSE') {
      runningStreak = 0;
    } else if (evalResult.qualification === 'EXCLUDED' || evalResult.qualification === 'PENDING') {
      // Excluded or pending day does not reset running streak to 0, nor does it increment.
      // Running streak is preserved.
    }
  }

  // Current streak determination:
  // If the last evaluated day is today or yesterday and is qualified/pending, current streak is runningStreak.
  // If the most recent active confirmation was a lapse, current streak is 0.
  const currentStreak = runningStreak;

  return {
    currentStreak,
    longestStreak,
    lastQualifiedDate,
    dayResults
  };
}

/**
 * Finds the immutable goal version that was in effect for a given local date.
 */
export function findEffectiveGoalVersion(
  goal: Goal,
  versions: GoalVersion[],
  localDate: string
): Goal | GoalVersion {
  if (!versions || versions.length === 0) {
    return goal;
  }

  // Sort versions descending by effectiveFrom
  const sorted = [...versions].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  for (const v of sorted) {
    const fromDate = v.effectiveFrom.substring(0, 10);
    const toDate = v.effectiveTo ? v.effectiveTo.substring(0, 10) : '9999-12-31';
    if (localDate >= fromDate && localDate <= toDate) {
      return v;
    }
  }

  return goal;
}

/**
 * Generates an updated StreakState entity from calculated streak result.
 */
export function buildStreakState(
  userId: string,
  goalId: string,
  result: StreakCalculationResult,
  calculatedAt?: string
): StreakState {
  return {
    id: `streak_${goalId}`,
    userId,
    goalId,
    currentStreak: result.currentStreak,
    longestStreak: result.longestStreak,
    lastQualifiedDate: result.lastQualifiedDate,
    calculatedAt: calculatedAt || new Date().toISOString()
  };
}
