import {
  calculateStreak,
  evaluateDayForGoal,
  findEffectiveGoalVersion
} from '../src/engines/streakEngine';
import { DailyAggregate, Goal, GoalVersion } from '../src/entities/types';

describe('StreakEngine', () => {
  const userId = 'usr_1';
  const behaviorId = 'beh_smoke';

  const abstinenceGoal: Goal = {
    id: 'goal_abstinence',
    userId,
    behaviorId,
    goalType: 'ABSTINENCE',
    targetValue: 0,
    evaluationPeriod: 'DAILY',
    startsAt: '2026-10-01T00:00:00Z',
    active: true,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z'
  };

  const reductionGoal: Goal = {
    id: 'goal_reduction',
    userId,
    behaviorId,
    goalType: 'REDUCTION',
    targetValue: 3, // <= 3 per day
    evaluationPeriod: 'DAILY',
    startsAt: '2026-10-01T00:00:00Z',
    active: true,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z'
  };

  it('evaluates abstinence goal: requires confirmed zero activity to qualify', () => {
    const confirmedZeroDay: DailyAggregate = {
      userId,
      behaviorId,
      localDate: '2026-10-10',
      totalQuantity: 0,
      occurrenceCount: 0,
      reviewStatus: 'CONFIRMED_ZERO',
      calculatedAt: '2026-10-10T22:00:00Z'
    };

    const res = evaluateDayForGoal(confirmedZeroDay, abstinenceGoal);
    expect(res.qualification).toBe('QUALIFIED');
    expect(res.explanation).toContain('Confirmed zero activity');
  });

  it('evaluates abstinence goal: lapses when entries are logged', () => {
    const loggedDay: DailyAggregate = {
      userId,
      behaviorId,
      localDate: '2026-10-11',
      totalQuantity: 1,
      occurrenceCount: 1,
      reviewStatus: 'LOGGED',
      calculatedAt: '2026-10-11T22:00:00Z'
    };

    const res = evaluateDayForGoal(loggedDay, abstinenceGoal);
    expect(res.qualification).toBe('LAPSE');
    expect(res.explanation).toContain('1 occurrence(s) logged');
  });

  it('evaluates abstinence goal: pending days do not count as lapses', () => {
    const pendingDay: DailyAggregate = {
      userId,
      behaviorId,
      localDate: '2026-10-12',
      totalQuantity: 0,
      occurrenceCount: 0,
      reviewStatus: 'PENDING',
      calculatedAt: '2026-10-12T22:00:00Z'
    };

    const res = evaluateDayForGoal(pendingDay, abstinenceGoal);
    expect(res.qualification).toBe('PENDING');
    expect(res.explanation).toContain('Awaiting daily review');
  });

  it('evaluates reduction goal: qualifies when total is <= target limit', () => {
    const dayUnderLimit: DailyAggregate = {
      userId,
      behaviorId,
      localDate: '2026-10-10',
      totalQuantity: 2,
      occurrenceCount: 2,
      reviewStatus: 'LOGGED',
      calculatedAt: '2026-10-10T22:00:00Z'
    };

    const res = evaluateDayForGoal(dayUnderLimit, reductionGoal);
    expect(res.qualification).toBe('QUALIFIED');

    const dayOverLimit: DailyAggregate = {
      userId,
      behaviorId,
      localDate: '2026-10-11',
      totalQuantity: 5,
      occurrenceCount: 4,
      reviewStatus: 'LOGGED',
      calculatedAt: '2026-10-11T22:00:00Z'
    };

    const lapseRes = evaluateDayForGoal(dayOverLimit, reductionGoal);
    expect(lapseRes.qualification).toBe('LAPSE');
    expect(lapseRes.explanation).toContain('exceeded target limit of 3');
  });

  it('maintains independent streaks for distinct goals on the same sequence of days', () => {
    const aggregates: DailyAggregate[] = [
      // Day 1: 0 units, confirmed zero
      {
        userId,
        behaviorId,
        localDate: '2026-10-01',
        totalQuantity: 0,
        occurrenceCount: 0,
        reviewStatus: 'CONFIRMED_ZERO',
        calculatedAt: '2026-10-01T22:00:00Z'
      },
      // Day 2: 2 units (qualifies reduction <= 3, but lapses abstinence)
      {
        userId,
        behaviorId,
        localDate: '2026-10-02',
        totalQuantity: 2,
        occurrenceCount: 1,
        reviewStatus: 'LOGGED',
        calculatedAt: '2026-10-02T22:00:00Z'
      },
      // Day 3: 1 unit (qualifies reduction <= 3, lapses abstinence)
      {
        userId,
        behaviorId,
        localDate: '2026-10-03',
        totalQuantity: 1,
        occurrenceCount: 1,
        reviewStatus: 'LOGGED',
        calculatedAt: '2026-10-03T22:00:00Z'
      }
    ];

    const abstinenceResult = calculateStreak(abstinenceGoal, aggregates);
    const reductionResult = calculateStreak(reductionGoal, aggregates);

    // Abstinence: Day 1 qualified, Day 2 lapse (resets), Day 3 lapse. Current streak = 0, longest streak = 1.
    expect(abstinenceResult.currentStreak).toBe(0);
    expect(abstinenceResult.longestStreak).toBe(1);

    // Reduction: Day 1 qualified (0 <= 3), Day 2 qualified (2 <= 3), Day 3 qualified (1 <= 3). Current streak = 3, longest streak = 3.
    expect(reductionResult.currentStreak).toBe(3);
    expect(reductionResult.longestStreak).toBe(3);
  });

  it('handles pending days without breaking active running streak prematurely', () => {
    const aggregates: DailyAggregate[] = [
      {
        userId,
        behaviorId,
        localDate: '2026-10-01',
        totalQuantity: 0,
        occurrenceCount: 0,
        reviewStatus: 'CONFIRMED_ZERO',
        calculatedAt: '2026-10-01T22:00:00Z'
      },
      {
        userId,
        behaviorId,
        localDate: '2026-10-02',
        totalQuantity: 0,
        occurrenceCount: 0,
        reviewStatus: 'CONFIRMED_ZERO',
        calculatedAt: '2026-10-02T22:00:00Z'
      },
      // Day 3: pending review
      {
        userId,
        behaviorId,
        localDate: '2026-10-03',
        totalQuantity: 0,
        occurrenceCount: 0,
        reviewStatus: 'PENDING',
        calculatedAt: '2026-10-03T22:00:00Z'
      }
    ];

    const result = calculateStreak(abstinenceGoal, aggregates);
    // Running streak is preserved at 2 rather than dropped to 0
    expect(result.currentStreak).toBe(2);
    expect(result.longestStreak).toBe(2);
    expect(result.dayResults[2].qualification).toBe('PENDING');
  });

  it('respects historical goal versions', () => {
    // Version 1: target limit was 5
    const version1: GoalVersion = {
      id: 'gv1',
      goalId: reductionGoal.id,
      userId,
      behaviorId,
      goalType: 'REDUCTION',
      targetValue: 5,
      evaluationPeriod: 'DAILY',
      versionNumber: 1,
      effectiveFrom: '2026-10-01T00:00:00Z',
      effectiveTo: '2026-10-05T23:59:59Z',
      createdAt: '2026-10-01T00:00:00Z'
    };

    // Current goal target is 2 from Oct 06 onward
    const updatedGoal: Goal = {
      ...reductionGoal,
      targetValue: 2
    };

    const effectivePast = findEffectiveGoalVersion(updatedGoal, [version1], '2026-10-03');
    expect(effectivePast.targetValue).toBe(5);

    const effectivePresent = findEffectiveGoalVersion(updatedGoal, [version1], '2026-10-07');
    expect(effectivePresent.targetValue).toBe(2);
  });
});
