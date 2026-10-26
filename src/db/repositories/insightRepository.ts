import type { SQLiteDatabase } from 'expo-sqlite';
import { toDayString, shiftDayString } from '../../utils/date';
import { calculateMaxStreakFromDays, calculateMaxStreakWithDates } from '../../utils/bhfile';

export const HABIT_COLORS = [
  '#B9F6CA', // Electric Mint
  '#FF9F43', // Signal Amber
  '#70D6FF', // Sky Blue
  '#FF70A6', // Rose Pink
  '#E9D8A6', // Warm Sand
  '#B388FF', // Lavender
];

export interface MultiHabitDay {
  dateStr: string;
  dayName: string;
  dayNumber: number;
  isToday: boolean;
  values: Record<string, number>;
}

export interface MultiHabitWeekData {
  startDate: string;
  endDate: string;
  formattedRange: string;
  habits: {
    id: string;
    name: string;
    unit: string;
    color: string;
  }[];
  days: MultiHabitDay[];
  maxVal: number;
}

export interface HabitDeepDiveStats {
  behaviorId: string;
  behaviorName: string;
  behaviorUnit: string;
  dailyLimit: number | null;
  createdDate: string;
  totalLogged: number;
  logCount: number;
  currentStreak: number;
  maxStreak: number;
  maxStreakStart: string | null;
  maxStreakEnd: string | null;
}

export interface DayOfWeekData {
  dayIndex: number;
  dayName: string;
  total: number;
}

export interface TimeOfDayData {
  morning: number;
  afternoon: number;
  evening: number;
  night: number;
}

export interface UnifiedStatsData {
  greenDaysMonth: number;
  daysInMonth: number;
  currentMonthStreak: number;
  maxAllTimeStreak: number;
  maxStreakStart: string | null;
  maxStreakEnd: string | null;
  totalLogsRecorded: number;
  totalHabitsActive: number;
  habitStats: HabitDeepDiveStats[];
  past30DaysTotals: { dateStr: string; dayNumber: number; total: number; isGreen: boolean }[];
  habitDistribution: { id: string; name: string; total: number; percentage: number; color: string }[];
  dayOfWeekDistribution: DayOfWeekData[];
  timeOfDayDistribution: TimeOfDayData;
}

export interface DayBarData {
  dateStr: string;
  dayName: string;
  total: number;
  isToday: boolean;
}

export interface BehaviorStats {
  behaviorId: string;
  behaviorName: string;
  behaviorUnit: string;
  dailyLimit: number | null;
  // 7-day stats
  past7Days: DayBarData[];
  total7Days: number;
  avg7Days: number;
  prev7DaysTotal: number;
  trendPercent7Days: number | null; // e.g. -15% (reduced) or +10% (increased)
  // 30-day stats
  total30Days: number;
  avg30Days: number;
  peakDay: { date: string; value: number } | null;
  // Current adherence streak
  currentStreakDays: number;
}

export interface DayTotalRow {
  day: string;
  total: number;
}

export class InsightRepository {
  private db: SQLiteDatabase;

  constructor(db: SQLiteDatabase) {
    this.db = db;
  }

  /**
   * Calculates comprehensive bad-habit statistics and honest streaks for a behavior
   */
  async getBehaviorStats(behaviorId: string, anchorDateInput?: string): Promise<BehaviorStats | null> {
    const anchorDate = anchorDateInput || toDayString();

    // 1. Fetch behavior details
    const behavior = await this.db.getFirstAsync<{
      id: string;
      name: string;
      unit: string;
      daily_limit: number | null;
      created_at: string;
    }>('SELECT id, name, unit, daily_limit, created_at FROM behaviors WHERE id = ?;', [behaviorId]);

    if (!behavior) return null;

    const createdDay = toDayString(behavior.created_at);

    // 2. Fetch past 30 days totals
    const startDate30 = shiftDayString(anchorDate, -29);
    const rows = await this.db.getAllAsync<DayTotalRow>(
      `SELECT
         substr(occurred_at, 1, 10) AS day,
         COALESCE(SUM(value), 0) AS total
       FROM log_entries
       WHERE behavior_id = ?
         AND substr(occurred_at, 1, 10) BETWEEN ? AND ?
       GROUP BY substr(occurred_at, 1, 10);`,
      [behaviorId, startDate30, anchorDate]
    );

    const dayMap = new Map<string, number>();
    for (const row of rows) {
      dayMap.set(row.day, Number(row.total));
    }

    // 3. Build 7-day breakdown (last 7 days ending at anchorDate)
    const past7Days: DayBarData[] = [];
    let total7Days = 0;
    for (let i = 6; i >= 0; i--) {
      const dStr = shiftDayString(anchorDate, -i);
      const total = dayMap.get(dStr) || 0;
      total7Days += total;

      const [y, m, d] = dStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const dayName = dateObj.toLocaleDateString(undefined, { weekday: 'narrow' });

      past7Days.push({
        dateStr: dStr,
        dayName,
        total,
        isToday: dStr === anchorDate,
      });
    }

    const avg7Days = Math.round((total7Days / 7) * 10) / 10;

    // 4. Calculate previous 7 days (days -13 to -7) to determine trend
    const prev7Start = shiftDayString(anchorDate, -13);
    const prev7End = shiftDayString(anchorDate, -7);
    const prev7Rows = await this.db.getAllAsync<DayTotalRow>(
      `SELECT
         COALESCE(SUM(value), 0) AS total
       FROM log_entries
       WHERE behavior_id = ?
         AND substr(occurred_at, 1, 10) BETWEEN ? AND ?;`,
      [behaviorId, prev7Start, prev7End]
    );
    const prev7DaysTotal = prev7Rows.length > 0 ? Number(prev7Rows[0].total) : 0;

    let trendPercent7Days: number | null = null;
    if (prev7DaysTotal > 0) {
      trendPercent7Days = Math.round(((total7Days - prev7DaysTotal) / prev7DaysTotal) * 100);
    } else if (total7Days > 0 && prev7DaysTotal === 0) {
      trendPercent7Days = null; // No baseline to compare fairly
    }

    // 5. 30-day totals & peak
    let total30Days = 0;
    let peakDay: { date: string; value: number } | null = null;

    for (let i = 29; i >= 0; i--) {
      const dStr = shiftDayString(anchorDate, -i);
      const val = dayMap.get(dStr) || 0;
      total30Days += val;
      if (val > 0 && (!peakDay || val > peakDay.value)) {
        peakDay = { date: dStr, value: val };
      }
    }
    const avg30Days = Math.round((total30Days / 30) * 10) / 10;

    // 6. Calculate Streak based on explicit rule:
    // For bad habits with a daily limit: consecutive days where total <= daily_limit
    // Starting from anchorDate backward to createdDay.
    // If the habit has never had any records logged in the window, streak is 0 (anti-fabrication rule).
    let currentStreakDays = 0;
    const limit = behavior.daily_limit;

    if (limit !== null && limit > 0 && rows.length > 0) {
      // Check anchor day first
      const todayTotal = dayMap.get(anchorDate) || 0;
      let checkDate = anchorDate;

      if (todayTotal <= limit) {
        currentStreakDays++;
        checkDate = shiftDayString(anchorDate, -1);
      } else {
        checkDate = ''; // Exceeded limit on anchor day, streak is 0
      }

      // Check consecutive prior days back to createdDay
      while (checkDate && checkDate >= createdDay) {
        const dayTotal = dayMap.get(checkDate) || 0;
        if (dayTotal <= limit) {
          currentStreakDays++;
          checkDate = shiftDayString(checkDate, -1);
          if (currentStreakDays >= 60) break;
        } else {
          break; // Exceeded limit, streak breaks
        }
      }
    }

    return {
      behaviorId: behavior.id,
      behaviorName: behavior.name,
      behaviorUnit: behavior.unit,
      dailyLimit: behavior.daily_limit,
      past7Days,
      total7Days,
      avg7Days,
      prev7DaysTotal,
      trendPercent7Days,
      total30Days,
      avg30Days,
      peakDay,
      currentStreakDays,
    };
  }

  /**
   * Fetches overall summary stats across all active behaviors
   */
  async getOverallSummary(anchorDateInput?: string): Promise<{
    activeHabitCount: number;
    totalLogsToday: number;
    totalLogs7Days: number;
  }> {
    const anchorDate = anchorDateInput || toDayString();
    const startDate7 = shiftDayString(anchorDate, -6);

    const habitsCountRow = await this.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM behaviors WHERE archived_at IS NULL;'
    );
    const todayLogsRow = await this.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM log_entries WHERE substr(occurred_at, 1, 10) = ?;',
      [anchorDate]
    );
    const weekLogsRow = await this.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM log_entries WHERE substr(occurred_at, 1, 10) BETWEEN ? AND ?;',
      [startDate7, anchorDate]
    );

    return {
      activeHabitCount: Number(habitsCountRow?.count || 0),
      totalLogsToday: Number(todayLogsRow?.count || 0),
      totalLogs7Days: Number(weekLogsRow?.count || 0),
    };
  }

  /**
   * Fetches home dashboard metrics:
   * - sum greenday (current month)
   * - this streak (current month)
   * - max streak (all time)
   * - dot-matrix calendar days for current month
   */
  async getHomeDashboardStats(anchorDateInput?: string): Promise<{
    greenDaysMonth: number;
    currentMonthStreak: number;
    maxAllTimeStreak: number;
    monthDays: {
      date: string;
      dayNumber: number;
      dayOfWeek: number;
      status: 'green' | 'logged' | 'future';
      isToday: boolean;
    }[];
    monthName: string;
    monthOffset: number;
  }> {
    const anchorDate = anchorDateInput || toDayString();
    const [yearStr, monthStr] = anchorDate.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);

    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
    const monthName = new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: 'short' });

    // 1. Fetch all days with logged values in this month
    const monthRows = await this.db.getAllAsync<{ day: string; total_value: number }>(
      `SELECT
         substr(occurred_at, 1, 10) AS day,
         COALESCE(SUM(value), 0) AS total_value
       FROM log_entries
       WHERE substr(occurred_at, 1, 7) = ?
       GROUP BY substr(occurred_at, 1, 10);`,
      [`${yearStr}-${monthStr}`]
    );

    const monthDayMap = new Map<string, number>();
    for (const r of monthRows) {
      monthDayMap.set(r.day, Number(r.total_value));
    }

    const monthDays: {
      date: string;
      dayNumber: number;
      dayOfWeek: number;
      status: 'green' | 'logged' | 'future';
      isToday: boolean;
    }[] = [];

    let greenDaysMonth = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${yearStr}-${monthStr}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = (firstDayOfWeek + (d - 1)) % 7;
      const isFuture = dateStr > anchorDate;
      const isToday = dateStr === anchorDate;
      const totalVal = monthDayMap.get(dateStr) || 0;

      let status: 'green' | 'logged' | 'future';
      if (isFuture) {
        status = 'future';
      } else if (totalVal === 0) {
        status = 'green';
        greenDaysMonth++;
      } else {
        status = 'logged';
      }

      monthDays.push({
        date: dateStr,
        dayNumber: d,
        dayOfWeek,
        status,
        isToday,
      });
    }

    // 2. Current Month Streak (consecutive green days backward from today)
    let currentMonthStreak = 0;
    let checkDate = anchorDate;
    while (checkDate >= `${yearStr}-${monthStr}-01`) {
      const total = monthDayMap.get(checkDate) || 0;
      if (total === 0) {
        currentMonthStreak++;
        checkDate = shiftDayString(checkDate, -1);
      } else {
        break;
      }
    }

    // 3. Max Streak (All Time)
    const earliestRow = await this.db.getFirstAsync<{ earliest: string }>(
      'SELECT MIN(substr(occurred_at, 1, 10)) as earliest FROM log_entries;'
    );
    const earliestBehRow = await this.db.getFirstAsync<{ earliest: string }>(
      'SELECT MIN(substr(created_at, 1, 10)) as earliest FROM behaviors;'
    );

    const earliestDate = earliestRow?.earliest || earliestBehRow?.earliest || `${yearStr}-${monthStr}-01`;
    const startDate = earliestDate <= anchorDate ? earliestDate : anchorDate;

    const allLogRows = await this.db.getAllAsync<{ day: string; total_value: number }>(
      `SELECT
         substr(occurred_at, 1, 10) AS day,
         COALESCE(SUM(value), 0) AS total_value
       FROM log_entries
       WHERE substr(occurred_at, 1, 10) BETWEEN ? AND ?
       GROUP BY substr(occurred_at, 1, 10);`,
      [startDate, anchorDate]
    );

    const allDayMap = new Map<string, number>();
    for (const r of allLogRows) {
      allDayMap.set(r.day, Number(r.total_value));
    }

    const allTimeDailyRecords: { date: string; isGreen: boolean }[] = [];
    let curDate = startDate;
    while (curDate <= anchorDate) {
      const total = allDayMap.get(curDate) || 0;
      allTimeDailyRecords.push({
        date: curDate,
        isGreen: total === 0,
      });
      curDate = shiftDayString(curDate, 1);
      if (allTimeDailyRecords.length > 2000) break;
    }

    const maxAllTimeStreak = calculateMaxStreakFromDays(allTimeDailyRecords);

    return {
      greenDaysMonth,
      currentMonthStreak,
      maxAllTimeStreak: Math.max(maxAllTimeStreak, currentMonthStreak),
      monthDays,
      monthName,
      monthOffset: firstDayOfWeek,
    };
  }

  /**
   * Fetches 7-day multi-habit breakdown data for scrollable multi-line chart
   */
  async getMultiHabitWeekData(anchorDateInput?: string): Promise<MultiHabitWeekData> {
    const anchorDate = anchorDateInput || toDayString();
    const startDate = shiftDayString(anchorDate, -6);
    const today = toDayString();

    const habitsRows = await this.db.getAllAsync<{ id: string; name: string; unit: string }>(
      'SELECT id, name, unit FROM behaviors WHERE archived_at IS NULL ORDER BY created_at ASC;'
    );

    const habits = habitsRows.map((h, i) => ({
      id: h.id,
      name: h.name,
      unit: h.unit,
      color: HABIT_COLORS[i % HABIT_COLORS.length],
    }));

    const rows = await this.db.getAllAsync<{
      behavior_id: string;
      day: string;
      total: number;
    }>(
      `SELECT
         behavior_id,
         substr(occurred_at, 1, 10) as day,
         COALESCE(SUM(value), 0) as total
       FROM log_entries
       WHERE substr(occurred_at, 1, 10) BETWEEN ? AND ?
       GROUP BY behavior_id, substr(occurred_at, 1, 10);`,
      [startDate, anchorDate]
    );

    const valMap = new Map<string, number>();
    for (const r of rows) {
      valMap.set(`${r.behavior_id}_${r.day}`, Number(r.total));
    }

    let globalMax = 1;
    const days: MultiHabitDay[] = [];
    for (let i = 6; i >= 0; i--) {
      const dStr = shiftDayString(anchorDate, -i);
      const [y, m, d] = dStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const dayName = dateObj.toLocaleDateString(undefined, { weekday: 'short' });

      const dayValues: Record<string, number> = {};
      for (const h of habits) {
        const val = valMap.get(`${h.id}_${dStr}`) || 0;
        dayValues[h.id] = val;
        if (val > globalMax) globalMax = val;
      }

      days.push({
        dateStr: dStr,
        dayName,
        dayNumber: d,
        isToday: dStr === today,
        values: dayValues,
      });
    }

    const [sy, sm, sd] = startDate.split('-').map(Number);
    const [ey, em, ed] = anchorDate.split('-').map(Number);
    const startObj = new Date(sy, sm - 1, sd);
    const endObj = new Date(ey, em - 1, ed);
    const formattedRange = `${startObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${endObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;

    return {
      startDate,
      endDate: anchorDate,
      formattedRange,
      habits,
      days,
      maxVal: globalMax,
    };
  }

  /**
   * Fetches unified comprehensive statistics across all database records
   */
  async getUnifiedStats(anchorDateInput?: string): Promise<UnifiedStatsData> {
    const anchorDate = anchorDateInput || toDayString();
    const [yearStr, monthStr] = anchorDate.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);

    const daysInMonth = new Date(year, month, 0).getDate();

    // 1. Fetch active behaviors
    const behaviors = await this.db.getAllAsync<{
      id: string;
      name: string;
      unit: string;
      daily_limit: number | null;
      created_at: string;
    }>('SELECT id, name, unit, daily_limit, created_at FROM behaviors WHERE archived_at IS NULL ORDER BY created_at ASC;');

    // 2. Fetch all-time logs
    const allLogs = await this.db.getAllAsync<{
      id: string;
      behavior_id: string;
      occurred_at: string;
      value: number;
    }>('SELECT id, behavior_id, occurred_at, value FROM log_entries ORDER BY occurred_at ASC;');

    const allDayMap = new Map<string, number>();
    const behaviorLogsMap = new Map<string, { totalVal: number; count: number; days: Map<string, number>; firstDate: string | null }>();

    for (const b of behaviors) {
      behaviorLogsMap.set(b.id, { totalVal: 0, count: 0, days: new Map(), firstDate: null });
    }

    const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0]; // Sun=0, Mon=1...
    const timeOfDayCounts = { morning: 0, afternoon: 0, evening: 0, night: 0 };

    for (const log of allLogs) {
      const day = log.occurred_at.substring(0, 10);
      const val = Number(log.value);
      allDayMap.set(day, (allDayMap.get(day) || 0) + val);

      const bStats = behaviorLogsMap.get(log.behavior_id);
      if (bStats) {
        bStats.totalVal += val;
        bStats.count += 1;
        bStats.days.set(day, (bStats.days.get(day) || 0) + val);
        if (!bStats.firstDate || day < bStats.firstDate) {
          bStats.firstDate = day;
        }
      }

      const [ly, lm, ld] = day.split('-').map(Number);
      const logDate = new Date(ly, lm - 1, ld);
      const dow = logDate.getDay();
      dayOfWeekCounts[dow] += val;

      const timePart = log.occurred_at.length >= 16 ? log.occurred_at.substring(11, 16) : '12:00';
      const hour = parseInt(timePart.split(':')[0], 10) || 12;
      if (hour >= 5 && hour < 12) {
        timeOfDayCounts.morning += val;
      } else if (hour >= 12 && hour < 17) {
        timeOfDayCounts.afternoon += val;
      } else if (hour >= 17 && hour < 22) {
        timeOfDayCounts.evening += val;
      } else {
        timeOfDayCounts.night += val;
      }
    }

    // 3. Current month stats
    let greenDaysMonth = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${yearStr}-${monthStr}-${String(d).padStart(2, '0')}`;
      if (dateStr <= anchorDate) {
        if ((allDayMap.get(dateStr) || 0) === 0) {
          greenDaysMonth++;
        }
      }
    }

    let currentMonthStreak = 0;
    let checkDate = anchorDate;
    while (checkDate >= `${yearStr}-${monthStr}-01`) {
      if ((allDayMap.get(checkDate) || 0) === 0) {
        currentMonthStreak++;
        checkDate = shiftDayString(checkDate, -1);
      } else {
        break;
      }
    }

    // 4. All-time Max Streak & Exact Dates
    let earliestDate = anchorDate;
    for (const log of allLogs) {
      const day = log.occurred_at.substring(0, 10);
      if (day < earliestDate) earliestDate = day;
    }
    for (const b of behaviors) {
      const day = b.created_at.substring(0, 10);
      if (day < earliestDate) earliestDate = day;
    }

    const allDailyRecords: { date: string; isGreen: boolean }[] = [];
    let cur = earliestDate;
    while (cur <= anchorDate) {
      allDailyRecords.push({
        date: cur,
        isGreen: (allDayMap.get(cur) || 0) === 0,
      });
      cur = shiftDayString(cur, 1);
      if (allDailyRecords.length > 2500) break;
    }

    const { maxStreak: calculatedMaxStreak, startDate: maxStreakStart, endDate: maxStreakEnd } =
      calculateMaxStreakWithDates(allDailyRecords);
    const maxAllTimeStreak = Math.max(calculatedMaxStreak, currentMonthStreak);

    // 5. Past 30 Days timeline
    const past30DaysTotals: { dateStr: string; dayNumber: number; total: number; isGreen: boolean }[] = [];
    for (let i = 29; i >= 0; i--) {
      const dStr = shiftDayString(anchorDate, -i);
      const total = allDayMap.get(dStr) || 0;
      const dNum = parseInt(dStr.split('-')[2], 10);
      past30DaysTotals.push({
        dateStr: dStr,
        dayNumber: dNum,
        total,
        isGreen: total === 0,
      });
    }

    // 6. Habit Deep Dive Stats
    const habitStats: HabitDeepDiveStats[] = [];
    let totalAllHabitsVal = 0;

    for (const b of behaviors) {
      const bInfo = behaviorLogsMap.get(b.id) || { totalVal: 0, count: 0, days: new Map(), firstDate: null };
      totalAllHabitsVal += bInfo.totalVal;

      const createdDay = b.created_at.substring(0, 10);
      const bDailyRecords: { date: string; isGreen: boolean }[] = [];
      let bCur = createdDay;
      while (bCur <= anchorDate) {
        const dVal = bInfo.days.get(bCur) || 0;
        bDailyRecords.push({
          date: bCur,
          isGreen: b.daily_limit !== null ? dVal <= b.daily_limit : dVal === 0,
        });
        bCur = shiftDayString(bCur, 1);
        if (bDailyRecords.length > 2500) break;
      }

      const { maxStreak: bMax, startDate: bStart, endDate: bEnd } = calculateMaxStreakWithDates(bDailyRecords);

      let bCurStreak = 0;
      let bCheck = anchorDate;
      while (bCheck >= createdDay) {
        const dVal = bInfo.days.get(bCheck) || 0;
        const isClean = b.daily_limit !== null ? dVal <= b.daily_limit : dVal === 0;
        if (isClean) {
          bCurStreak++;
          bCheck = shiftDayString(bCheck, -1);
        } else {
          break;
        }
      }

      habitStats.push({
        behaviorId: b.id,
        behaviorName: b.name,
        behaviorUnit: b.unit,
        dailyLimit: b.daily_limit,
        createdDate: b.created_at.substring(0, 10),
        totalLogged: bInfo.totalVal,
        logCount: bInfo.count,
        currentStreak: bCurStreak,
        maxStreak: bMax,
        maxStreakStart: bStart,
        maxStreakEnd: bEnd,
      });
    }

    // 7. Habit Distribution
    const habitDistribution = behaviors.map((b, idx) => {
      const bInfo = behaviorLogsMap.get(b.id);
      const total = bInfo?.totalVal || 0;
      const pct = totalAllHabitsVal > 0 ? Math.round((total / totalAllHabitsVal) * 100) : 0;
      return {
        id: b.id,
        name: b.name,
        total,
        percentage: pct,
        color: HABIT_COLORS[idx % HABIT_COLORS.length],
      };
    });

    // 8. Day of Week distribution (Mon through Sun)
    const dayOfWeekNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dayOfWeekIndices = [1, 2, 3, 4, 5, 6, 0];
    const dayOfWeekDistribution: DayOfWeekData[] = dayOfWeekIndices.map((idx, displayIdx) => ({
      dayIndex: idx,
      dayName: dayOfWeekNames[displayIdx],
      total: dayOfWeekCounts[idx],
    }));

    return {
      greenDaysMonth,
      daysInMonth,
      currentMonthStreak,
      maxAllTimeStreak,
      maxStreakStart,
      maxStreakEnd,
      totalLogsRecorded: allLogs.length,
      totalHabitsActive: behaviors.length,
      habitStats,
      past30DaysTotals,
      habitDistribution,
      dayOfWeekDistribution,
      timeOfDayDistribution: timeOfDayCounts,
    };
  }
}
