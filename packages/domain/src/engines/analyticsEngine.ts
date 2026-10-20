import { BehaviorEntry, DailyAggregate, Insight, InsightType, EvidenceQuality } from '../entities/types';

export interface PeriodStatistics {
  totalQuantity: number;
  totalOccurrences: number;
  daysInRange: number;
  activeDaysCount: number;
  confirmedZeroDaysCount: number;
  pendingDaysCount: number;
  dailyAverageAllDays: number;
  dailyAverageActiveDays: number;
  highestDay: { date: string; quantity: number } | null;
  lowestDay: { date: string; quantity: number } | null;
  adherenceRate: number; // 0 to 100 percentage
}

export interface PercentageChangeResult {
  currentValue: number;
  baselineValue: number;
  absoluteChange: number;
  percentageChange: number | null; // null if baseline is zero
  baselineZero: boolean;
  isReduction: boolean;
  displayText: string;
}

export interface TimeDistribution {
  hourOfDay: number[]; // 24 slots (0..23) with event counts
  dayOfWeek: number[]; // 7 slots (0=Sun..6=Sat) with event counts
  averageIntervalMinutes: number | null; // average time between consecutive entries
  weekdayTotal: number;
  weekendTotal: number;
  weekdayAverage: number;
  weekendAverage: number;
  peakHour: number | null;
  peakDayOfWeek: number | null;
}

export interface AdvancedTrends {
  sevenDayMovingAverage: { date: string; value: number }[];
  thirtyDayMovingAverage: { date: string; value: number }[];
  trendDirection: 'DECREASING' | 'STABLE' | 'INCREASING';
  slope: number; // rate of change per day
  averageLapseRecoveryDays: number | null;
}

/**
 * Calculates summary statistics for a given list of daily aggregates.
 */
export function calculatePeriodStatistics(
  aggregates: DailyAggregate[],
  daysCount?: number
): PeriodStatistics {
  const totalDays = daysCount || (aggregates.length > 0 ? aggregates.length : 0);

  let totalQuantity = 0;
  let totalOccurrences = 0;
  let activeDaysCount = 0;
  let confirmedZeroDaysCount = 0;
  let pendingDaysCount = 0;
  let highestDay: { date: string; quantity: number } | null = null;
  let lowestDay: { date: string; quantity: number } | null = null;

  for (const agg of aggregates) {
    totalQuantity += agg.totalQuantity;
    totalOccurrences += agg.occurrenceCount;

    if (agg.occurrenceCount > 0) {
      activeDaysCount += 1;
      if (!highestDay || agg.totalQuantity > highestDay.quantity) {
        highestDay = { date: agg.localDate, quantity: agg.totalQuantity };
      }
      if (!lowestDay || agg.totalQuantity < lowestDay.quantity) {
        lowestDay = { date: agg.localDate, quantity: agg.totalQuantity };
      }
    } else if (agg.reviewStatus === 'CONFIRMED_ZERO') {
      confirmedZeroDaysCount += 1;
    } else if (agg.reviewStatus === 'PENDING') {
      pendingDaysCount += 1;
    }
  }

  const dailyAverageAllDays = totalDays > 0 ? Math.round((totalQuantity / totalDays) * 100) / 100 : 0;
  const dailyAverageActiveDays =
    activeDaysCount > 0 ? Math.round((totalQuantity / activeDaysCount) * 100) / 100 : 0;

  const totalEvaluatedDays = activeDaysCount + confirmedZeroDaysCount;
  const adherenceRate =
    totalEvaluatedDays > 0
      ? Math.round((confirmedZeroDaysCount / totalEvaluatedDays) * 1000) / 10
      : 0;

  return {
    totalQuantity: Math.round(totalQuantity * 100) / 100,
    totalOccurrences,
    daysInRange: totalDays,
    activeDaysCount,
    confirmedZeroDaysCount,
    pendingDaysCount,
    dailyAverageAllDays,
    dailyAverageActiveDays,
    highestDay,
    lowestDay,
    adherenceRate
  };
}

/**
 * Safely computes percentage change between current period and baseline period,
 * preventing NaN / Infinity when baseline is zero.
 */
export function calculateSafePercentageChange(
  current: number,
  baseline: number,
  unitLabel: string = 'units'
): PercentageChangeResult {
  const absoluteChange = Math.round((current - baseline) * 100) / 100;
  const isReduction = current < baseline;

  if (baseline === 0) {
    if (current === 0) {
      return {
        currentValue: current,
        baselineValue: baseline,
        absoluteChange: 0,
        percentageChange: 0,
        baselineZero: true,
        isReduction: false,
        displayText: 'No change (maintained 0)'
      };
    }
    return {
      currentValue: current,
      baselineValue: baseline,
      absoluteChange,
      percentageChange: null,
      baselineZero: true,
      isReduction: false,
      displayText: `+${current} ${unitLabel} from zero baseline`
    };
  }

  const percentage = Math.round(((current - baseline) / baseline) * 1000) / 10;
  const sign = percentage > 0 ? '+' : '';

  return {
    currentValue: current,
    baselineValue: baseline,
    absoluteChange,
    percentageChange: percentage,
    baselineZero: false,
    isReduction,
    displayText: `${sign}${percentage}% vs previous period`
  };
}

/**
 * Computes time distributions: hour of day, day of week, intervals, and weekday/weekend patterns.
 */
export function calculateTimeDistribution(
  entries: BehaviorEntry[],
  fallbackTimezone: string = 'UTC'
): TimeDistribution {
  const hourOfDay = new Array(24).fill(0);
  const dayOfWeek = new Array(7).fill(0);

  const validEntries = entries.filter((e) => !e.deletedAt);
  // Sort chronologically
  const sorted = [...validEntries].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));

  let weekdayTotal = 0;
  let weekendTotal = 0;
  let weekdayDays = 5;
  let weekendDays = 2;

  let totalIntervalMinutes = 0;
  let intervalCount = 0;

  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i];
    const date = new Date(entry.occurredAt);

    // Calculate hour and day of week in timezone
    const tz = entry.timezone || fallbackTimezone;
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour: 'numeric',
        hourCycle: 'h23',
        weekday: 'short'
      }).formatToParts(date);

      const hourPart = parts.find((p) => p.type === 'hour')?.value;
      const hour = hourPart !== undefined ? parseInt(hourPart, 10) : date.getUTCHours();
      if (hour >= 0 && hour < 24) {
        hourOfDay[hour] += 1;
      }

      const weekdayMap: Record<string, number> = {
        Sun: 0,
        Mon: 1,
        Tue: 2,
        Wed: 3,
        Thu: 4,
        Fri: 5,
        Sat: 6
      };
      const weekdayPart = parts.find((p) => p.type === 'weekday')?.value;
      const dayIdx =
        weekdayPart && weekdayMap[weekdayPart] !== undefined
          ? weekdayMap[weekdayPart]
          : date.getUTCDay();
      dayOfWeek[dayIdx] += 1;

      if (dayIdx === 0 || dayIdx === 6) {
        weekendTotal += 1;
      } else {
        weekdayTotal += 1;
      }
    } catch {
      const h = date.getUTCHours();
      hourOfDay[h] += 1;
      const d = date.getUTCDay();
      dayOfWeek[d] += 1;
      if (d === 0 || d === 6) weekendTotal += 1;
      else weekdayTotal += 1;
    }

    // Interval between consecutive entries within the same day (intra-day frequency)
    if (i > 0) {
      const prevDate = new Date(sorted[i - 1].occurredAt);
      const diffMs = date.getTime() - prevDate.getTime();
      const diffMins = Math.round(diffMs / 60000);
      // Only count intervals within the same active day (under 12 hours / 720 minutes)
      if (diffMins > 0 && diffMins <= 720) {
        totalIntervalMinutes += diffMins;
        intervalCount += 1;
      }
    }
  }

  let peakHour: number | null = null;
  let maxHourCount = 0;
  for (let h = 0; h < 24; h++) {
    if (hourOfDay[h] > maxHourCount) {
      maxHourCount = hourOfDay[h];
      peakHour = h;
    }
  }

  let peakDayOfWeek: number | null = null;
  let maxDayCount = 0;
  for (let d = 0; d < 7; d++) {
    if (dayOfWeek[d] > maxDayCount) {
      maxDayCount = dayOfWeek[d];
      peakDayOfWeek = d;
    }
  }

  const averageIntervalMinutes =
    intervalCount > 0 ? Math.round(totalIntervalMinutes / intervalCount) : null;

  return {
    hourOfDay,
    dayOfWeek,
    averageIntervalMinutes,
    weekdayTotal,
    weekendTotal,
    weekdayAverage: Math.round((weekdayTotal / weekdayDays) * 10) / 10,
    weekendAverage: Math.round((weekendTotal / weekendDays) * 10) / 10,
    peakHour,
    peakDayOfWeek
  };
}

/**
 * Computes moving averages and linear regression trend slope.
 */
export function calculateAdvancedTrends(aggregates: DailyAggregate[]): AdvancedTrends {
  const sorted = [...aggregates].sort((a, b) => a.localDate.localeCompare(b.localDate));

  const sevenDayMovingAverage: { date: string; value: number }[] = [];
  const thirtyDayMovingAverage: { date: string; value: number }[] = [];

  for (let i = 0; i < sorted.length; i++) {
    // 7-day window
    const start7 = Math.max(0, i - 6);
    const window7 = sorted.slice(start7, i + 1);
    const avg7 = window7.reduce((s, a) => s + a.totalQuantity, 0) / window7.length;
    sevenDayMovingAverage.push({
      date: sorted[i].localDate,
      value: Math.round(avg7 * 100) / 100
    });

    // 30-day window
    const start30 = Math.max(0, i - 29);
    const window30 = sorted.slice(start30, i + 1);
    const avg30 = window30.reduce((s, a) => s + a.totalQuantity, 0) / window30.length;
    thirtyDayMovingAverage.push({
      date: sorted[i].localDate,
      value: Math.round(avg30 * 100) / 100
    });
  }

  // Trend slope via linear regression over the sequence
  let slope = 0;
  let trendDirection: 'DECREASING' | 'STABLE' | 'INCREASING' = 'STABLE';

  if (sorted.length >= 4) {
    const n = sorted.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    for (let x = 0; x < n; x++) {
      const y = sorted[x].totalQuantity;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    }

    const denominator = n * sumXX - sumX * sumX;
    if (denominator !== 0) {
      slope = (n * sumXY - sumX * sumY) / denominator;
      slope = Math.round(slope * 1000) / 1000;
    }

    if (slope < -0.05) {
      trendDirection = 'DECREASING';
    } else if (slope > 0.05) {
      trendDirection = 'INCREASING';
    } else {
      trendDirection = 'STABLE';
    }
  }

  // Calculate lapse recovery: average days between a lapse (active day) and next confirmed zero day
  let recoveryDaysSum = 0;
  let recoveryCount = 0;
  let lapseDate: Date | null = null;

  for (const agg of sorted) {
    if (agg.occurrenceCount > 0) {
      if (!lapseDate) {
        lapseDate = new Date(agg.localDate);
      }
    } else if (agg.reviewStatus === 'CONFIRMED_ZERO' && lapseDate) {
      const recoveryDate = new Date(agg.localDate);
      const diffDays = Math.round(
        (recoveryDate.getTime() - lapseDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays > 0) {
        recoveryDaysSum += diffDays;
        recoveryCount += 1;
      }
      lapseDate = null;
    }
  }

  const averageLapseRecoveryDays =
    recoveryCount > 0 ? Math.round((recoveryDaysSum / recoveryCount) * 10) / 10 : null;

  return {
    sevenDayMovingAverage,
    thirtyDayMovingAverage,
    trendDirection,
    slope,
    averageLapseRecoveryDays
  };
}

/**
 * Generates deterministic, evidence-backed insights based on measurements.
 * Requires minimum sample thresholds to avoid false or premature conclusions.
 */
export function generateDeterministicInsights(
  userId: string,
  behaviorId: string,
  aggregates: DailyAggregate[],
  entries: BehaviorEntry[]
): Insight[] {
  const insights: Insight[] = [];
  const now = new Date().toISOString();

  if (aggregates.length < 5) {
    // Insufficient data to form reliable patterns
    return insights;
  }

  const sortedAggs = [...aggregates].sort((a, b) => a.localDate.localeCompare(b.localDate));
  const startDate = sortedAggs[0].localDate;
  const endDate = sortedAggs[sortedAggs.length - 1].localDate;

  const validEntries = entries.filter((e) => !e.deletedAt);
  const timeDist = calculateTimeDistribution(validEntries);
  const trends = calculateAdvancedTrends(sortedAggs);

  // 1. Time-of-day concentration pattern
  if (validEntries.length >= 7 && timeDist.peakHour !== null) {
    const peakCount = timeDist.hourOfDay[timeDist.peakHour];
    const percentageInPeak = Math.round((peakCount / validEntries.length) * 100);

    if (percentageInPeak >= 35) {
      const formatHour = (h: number) => {
        const ampm = h >= 12 ? 'PM' : 'AM';
        const formatted = h % 12 === 0 ? 12 : h % 12;
        return `${formatted}:00 ${ampm}`;
      };

      insights.push({
        id: `insight_time_${behaviorId}_${now.substring(0, 10)}`,
        userId,
        behaviorId,
        insightType: 'PATTERN',
        title: `Activity clusters around ${formatHour(timeDist.peakHour)}`,
        summary: `${percentageInPeak}% of logged events occurred around ${formatHour(
          timeDist.peakHour
        )} (${peakCount} out of ${validEntries.length} events). Awareness of this window can help plan alternative routines.`,
        evidence: {
          peakHour: timeDist.peakHour,
          peakCount,
          totalEvents: validEntries.length,
          percentage: percentageInPeak
        },
        dateRangeStart: startDate,
        dateRangeEnd: endDate,
        evidenceQuality: validEntries.length >= 15 ? 'HIGH' : 'MODERATE',
        createdAt: now
      });
    }
  }

  // 2. Weekday vs Weekend pattern
  if (validEntries.length >= 8) {
    const diff = timeDist.weekendAverage - timeDist.weekdayAverage;
    if (Math.abs(diff) >= 0.8) {
      const higherOnWeekend = diff > 0;
      insights.push({
        id: `insight_weekend_${behaviorId}_${now.substring(0, 10)}`,
        userId,
        behaviorId,
        insightType: 'DISTRIBUTION',
        title: higherOnWeekend
          ? 'Higher frequency on weekends'
          : 'Higher frequency on weekdays',
        summary: higherOnWeekend
          ? `Weekends average ${timeDist.weekendAverage} events/day compared to ${timeDist.weekdayAverage} on weekdays. Environmental shifts on rest days may influence behavior.`
          : `Weekdays average ${timeDist.weekdayAverage} events/day compared to ${timeDist.weekendAverage} on weekends. Workday schedules or stress may be a driving context.`,
        evidence: {
          weekdayAverage: timeDist.weekdayAverage,
          weekendAverage: timeDist.weekendAverage,
          difference: Math.round(diff * 10) / 10
        },
        dateRangeStart: startDate,
        dateRangeEnd: endDate,
        evidenceQuality: sortedAggs.length >= 14 ? 'HIGH' : 'MODERATE',
        createdAt: now
      });
    }
  }

  // 3. Trend Direction insight
  if (sortedAggs.length >= 10 && trends.trendDirection !== 'STABLE') {
    const isDecreasing = trends.trendDirection === 'DECREASING';
    insights.push({
      id: `insight_trend_${behaviorId}_${now.substring(0, 10)}`,
      userId,
      behaviorId,
      insightType: 'TREND',
      title: isDecreasing ? 'Consistent downward trajectory' : 'Upward activity trend observed',
      summary: isDecreasing
        ? `Daily quantity has a measurable downward trend (slope: ${trends.slope}/day). Your adjustments are demonstrating tangible behavioral reduction.`
        : `Daily volume is trending upward (slope: +${trends.slope}/day) across the past ${sortedAggs.length} days. Reviewing your daily context can help identify any emerging triggers.`,
      evidence: {
        trendDirection: trends.trendDirection,
        slope: trends.slope,
        daysEvaluated: sortedAggs.length
      },
      dateRangeStart: startDate,
      dateRangeEnd: endDate,
      evidenceQuality: sortedAggs.length >= 21 ? 'HIGH' : 'MODERATE',
      createdAt: now
    });
  }

  // 4. Lapse Recovery insight
  if (trends.averageLapseRecoveryDays !== null && trends.averageLapseRecoveryDays > 0) {
    insights.push({
      id: `insight_recovery_${behaviorId}_${now.substring(0, 10)}`,
      userId,
      behaviorId,
      insightType: 'RECOVERY',
      title: `Average recovery time: ${trends.averageLapseRecoveryDays} days`,
      summary: `When a lapse occurs, you return to a qualified zero-activity day in an average of ${trends.averageLapseRecoveryDays} day(s). Resilience after lapses is one of the strongest predictors of lasting change.`,
      evidence: {
        averageLapseRecoveryDays: trends.averageLapseRecoveryDays
      },
      dateRangeStart: startDate,
      dateRangeEnd: endDate,
      evidenceQuality: 'MODERATE',
      createdAt: now
    });
  }

  return insights;
}
