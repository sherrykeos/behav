import {
  calculatePeriodStatistics,
  calculateSafePercentageChange,
  calculateTimeDistribution,
  calculateAdvancedTrends,
  generateDeterministicInsights
} from '../src/engines/analyticsEngine';
import { BehaviorEntry, DailyAggregate } from '../src/entities/types';

describe('AnalyticsEngine', () => {
  const userId = 'usr_1';
  const behaviorId = 'beh_meditation';

  it('safely handles percentage changes when baseline is zero', () => {
    // 0 to 5 units: baseline is 0
    const res = calculateSafePercentageChange(5, 0, 'events');
    expect(res.baselineZero).toBe(true);
    expect(res.percentageChange).toBeNull();
    expect(res.displayText).toBe('+5 events from zero baseline');

    // 0 to 0 units:
    const zeroZero = calculateSafePercentageChange(0, 0, 'events');
    expect(zeroZero.percentageChange).toBe(0);
    expect(zeroZero.displayText).toBe('No change (maintained 0)');

    // 10 to 8 units: reduction
    const reduction = calculateSafePercentageChange(8, 10, 'units');
    expect(reduction.baselineZero).toBe(false);
    expect(reduction.percentageChange).toBe(-20);
    expect(reduction.isReduction).toBe(true);
  });

  it('calculates period statistics including active days vs all days averages', () => {
    const aggregates: DailyAggregate[] = [
      {
        userId,
        behaviorId,
        localDate: '2026-10-01',
        totalQuantity: 2,
        occurrenceCount: 1,
        reviewStatus: 'LOGGED',
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
      {
        userId,
        behaviorId,
        localDate: '2026-10-03',
        totalQuantity: 4,
        occurrenceCount: 2,
        reviewStatus: 'LOGGED',
        calculatedAt: '2026-10-03T22:00:00Z'
      },
      {
        userId,
        behaviorId,
        localDate: '2026-10-04',
        totalQuantity: 0,
        occurrenceCount: 0,
        reviewStatus: 'CONFIRMED_ZERO',
        calculatedAt: '2026-10-04T22:00:00Z'
      }
    ];

    const stats = calculatePeriodStatistics(aggregates, 4);

    expect(stats.totalQuantity).toBe(6);
    expect(stats.totalOccurrences).toBe(3);
    expect(stats.daysInRange).toBe(4);
    expect(stats.activeDaysCount).toBe(2);
    expect(stats.confirmedZeroDaysCount).toBe(2);
    // All days average: 6 / 4 = 1.5
    expect(stats.dailyAverageAllDays).toBe(1.5);
    // Active days average: 6 / 2 = 3.0
    expect(stats.dailyAverageActiveDays).toBe(3);
    expect(stats.highestDay?.quantity).toBe(4);
    expect(stats.lowestDay?.quantity).toBe(2);
  });

  it('calculates time distribution across hours and days', () => {
    const entries: BehaviorEntry[] = [
      {
        id: 'e1',
        userId,
        behaviorId,
        quantity: 1,
        occurredAt: '2026-10-14T08:30:00Z', // Wednesday 8am
        timezone: 'UTC',
        contextTags: [],
        createdAt: '2026-10-14T08:30:00Z',
        updatedAt: '2026-10-14T08:30:00Z'
      },
      {
        id: 'e2',
        userId,
        behaviorId,
        quantity: 1,
        occurredAt: '2026-10-14T08:45:00Z', // Wednesday 8am (15 mins later)
        timezone: 'UTC',
        contextTags: [],
        createdAt: '2026-10-14T08:45:00Z',
        updatedAt: '2026-10-14T08:45:00Z'
      },
      {
        id: 'e3',
        userId,
        behaviorId,
        quantity: 1,
        occurredAt: '2026-10-18T20:00:00Z', // Sunday 8pm (weekend)
        timezone: 'UTC',
        contextTags: [],
        createdAt: '2026-10-18T20:00:00Z',
        updatedAt: '2026-10-18T20:00:00Z'
      }
    ];

    const dist = calculateTimeDistribution(entries, 'UTC');

    expect(dist.hourOfDay[8]).toBe(2);
    expect(dist.hourOfDay[20]).toBe(1);
    expect(dist.peakHour).toBe(8);
    expect(dist.averageIntervalMinutes).toBe(15);
    expect(dist.weekdayTotal).toBe(2);
    expect(dist.weekendTotal).toBe(1);
  });

  it('calculates moving averages and linear trend slopes', () => {
    // 7 descending days: 10, 8, 6, 4, 3, 2, 1
    const aggregates: DailyAggregate[] = [10, 8, 6, 4, 3, 2, 1].map((qty, idx) => ({
      userId,
      behaviorId,
      localDate: `2026-10-0${idx + 1}`,
      totalQuantity: qty,
      occurrenceCount: qty > 0 ? 1 : 0,
      reviewStatus: qty > 0 ? 'LOGGED' : 'CONFIRMED_ZERO',
      calculatedAt: '2026-10-10T00:00:00Z'
    }));

    const trends = calculateAdvancedTrends(aggregates);

    expect(trends.sevenDayMovingAverage.length).toBe(7);
    expect(trends.trendDirection).toBe('DECREASING');
    expect(trends.slope).toBeLessThan(0);
  });

  it('enforces minimum sample size before generating insights', () => {
    // Only 2 days of data: below minimum threshold
    const aggregates: DailyAggregate[] = [
      {
        userId,
        behaviorId,
        localDate: '2026-10-01',
        totalQuantity: 1,
        occurrenceCount: 1,
        reviewStatus: 'LOGGED',
        calculatedAt: '2026-10-01T22:00:00Z'
      },
      {
        userId,
        behaviorId,
        localDate: '2026-10-02',
        totalQuantity: 1,
        occurrenceCount: 1,
        reviewStatus: 'LOGGED',
        calculatedAt: '2026-10-02T22:00:00Z'
      }
    ];

    const insights = generateDeterministicInsights(userId, behaviorId, aggregates, []);
    expect(insights.length).toBe(0); // Safely avoids premature conclusions
  });
});
