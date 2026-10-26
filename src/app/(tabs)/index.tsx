import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { colors, radii, spacing, typography } from '@/theme';
import { useBehaviors } from '@/context/BehaviorContext';
import { BehaviorModal } from '@/components/behaviors/BehaviorModal';
import { QuickLogModal } from '@/components/logging/QuickLogModal';
import { EditLogModal } from '@/components/logging/EditLogModal';
import { useRouter } from 'expo-router';
import { type LogEntryWithBehavior } from '@/types/database';
import quotesData from '@/data/quotes.json';
import GlassCard from '@/components/ui';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HERO_HEIGHT = Math.min(Math.round(SCREEN_HEIGHT * 0.55), 500);

// Hero background illustration
const heroImage = require('../../../assets/images/bg/homeBG2.jpg');

interface DashboardData {
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
}

interface StatGaugeProps {
  progress: number;
  activeColor: string;
  iconName: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
}

const StatGauge: React.FC<StatGaugeProps> = ({
  progress,
  activeColor,
  iconName,
  iconColor,
}) => {
  const GAUGE_SIZE = 44;
  const STROKE = 4.5;

  return (
    <View style={styles.gaugeContainer}>
      {/* Background Track Arc */}
      <View
        style={[
          styles.gaugeArc,
          {
            width: GAUGE_SIZE,
            height: GAUGE_SIZE,
            borderRadius: GAUGE_SIZE / 2,
            borderWidth: STROKE,
            borderColor: 'rgba(255, 255, 255, 0.10)',
            borderBottomColor: 'transparent',
          },
        ]}
      />

      {/* Active Filled Arc */}
      <View
        style={[
          styles.gaugeArc,
          {
            width: GAUGE_SIZE,
            height: GAUGE_SIZE,
            borderRadius: GAUGE_SIZE / 2,
            borderWidth: STROKE,
            borderBottomColor: 'transparent',
            borderLeftColor: progress > 0 ? activeColor : 'transparent',
            borderTopColor: progress >= 0.35 ? activeColor : 'transparent',
            borderRightColor: progress >= 0.7 ? activeColor : 'transparent',
          },
        ]}
      />

      {/* Center Icon */}
      <View style={styles.gaugeCenterIcon}>
        <Ionicons name={iconName} size={15} color={iconColor || activeColor} />
      </View>
    </View>
  );
};

const getHabitIcon = (name: string, category?: string | null) => {
  const lower = (name + ' ' + (category || '')).toLowerCase();
  if (lower.includes('smoke') || lower.includes('cigar') || lower.includes('vape')) {
    return <MaterialCommunityIcons name="smoking" size={24} color={colors.textPrimary} />;
  }
  if (
    lower.includes('masturbat') ||
    lower.includes('porn') ||
    lower.includes('fap') ||
    lower.includes('infinite') ||
    lower.includes('nofap')
  ) {
    return <MaterialCommunityIcons name="infinity" size={26} color={colors.textPrimary} />;
  }
  if (lower.includes('alcohol') || lower.includes('beer') || lower.includes('wine') || lower.includes('drink')) {
    return <MaterialCommunityIcons name="glass-wine" size={24} color={colors.textPrimary} />;
  }
  if (lower.includes('sugar') || lower.includes('food') || lower.includes('snack') || lower.includes('junk')) {
    return <MaterialCommunityIcons name="food-apple" size={24} color={colors.textPrimary} />;
  }
  if (lower.includes('game') || lower.includes('gaming')) {
    return <MaterialCommunityIcons name="controller" size={24} color={colors.textPrimary} />;
  }
  if (lower.includes('phone') || lower.includes('screen') || lower.includes('social') || lower.includes('scroll')) {
    return <MaterialCommunityIcons name="cellphone" size={24} color={colors.textPrimary} />;
  }
  if (lower.includes('caffeine') || lower.includes('coffee')) {
    return <MaterialCommunityIcons name="coffee" size={24} color={colors.textPrimary} />;
  }
  return <MaterialCommunityIcons name="repeat" size={24} color={colors.textPrimary} />;
};

const getHabitSubtitle = (behavior: {
  name: string;
  description: string | null;
  unit: string;
  dailyLimit: number | null;
}) => {
  if (behavior.description && behavior.description.trim().length > 0) {
    return behavior.description;
  }
  const lower = behavior.name.toLowerCase();
  if (lower.includes('smoke') || lower.includes('cigar') || lower.includes('vape')) {
    return 'Keep it down. You got this.';
  }
  if (
    lower.includes('masturbat') ||
    lower.includes('porn') ||
    lower.includes('fap') ||
    lower.includes('nofap')
  ) {
    return 'Discipline creates freedom.';
  }
  if (lower.includes('alcohol') || lower.includes('beer') || lower.includes('drink')) {
    return 'Clarity begins with restraint.';
  }
  if (lower.includes('phone') || lower.includes('screen') || lower.includes('scroll')) {
    return 'Reclaim your focus and time.';
  }
  if (behavior.dailyLimit !== null) {
    return `Limit: ${behavior.dailyLimit} ${behavior.unit || 'times'} daily`;
  }
  return 'Discipline creates freedom.';
};

export default function HomeScreen() {
  const {
    behaviors,
    todaySummaries,
    todayEntries,
    quickLog,
    createLogEntry,
    updateLogEntry,
    deleteLogEntry,
    createBehavior,
    getHomeDashboardStats,
  } = useBehaviors();

  const [dashStats, setDashStats] = useState<DashboardData | null>(null);
  const [quickLogVisible, setQuickLogVisible] = useState(false);
  const [selectedBehaviorIdForLog, setSelectedBehaviorIdForLog] = useState<string | null>(null);
  const [createBehaviorVisible, setCreateBehaviorVisible] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<LogEntryWithBehavior | null>(null);
  const router = useRouter();

  const now = new Date();
  const [calendarDate, setCalendarDate] = useState(() => new Date());

  const handlePrevMonth = () => {
    setCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const daysInMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate();
  const greenDaysCount = dashStats?.greenDaysMonth ?? 0;
  const currentStreakCount = dashStats?.currentMonthStreak ?? 0;
  const maxStreakCount = dashStats?.maxAllTimeStreak ?? 0;

  const greenDaysProgress = Math.min(1, greenDaysCount / Math.max(1, daysInMonth));
  const currentStreakProgress = Math.min(1, currentStreakCount / Math.max(1, daysInMonth, maxStreakCount));
  const maxStreakProgress = Math.min(1, maxStreakCount / Math.max(1, daysInMonth, 30));

  // User name state (persisted in SQLite, defaults to Sherry)
  const db = useSQLiteContext();
  const [userName, setUserName] = useState('Sherry');

  // Load user name from SQLite app_settings
  useEffect(() => {
    async function loadUserName() {
      try {
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY NOT NULL,
            value TEXT NOT NULL
          );
        `);
        const row = await db.getFirstAsync<{ value: string }>(
          'SELECT value FROM app_settings WHERE key = ?;',
          ['user_name']
        );
        if (row?.value) {
          setUserName(row.value);
        }
      } catch (err) {
        // quiet fallback
      }
    }
    loadUserName();
  }, [db]);

  // Clock state to update greeting and date dynamically every minute
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Compute greeting and date according to time
  const getGreetingData = () => {
    const hour = currentTime.getHours();
    let greeting = 'Good morning';
    let iconName: keyof typeof Ionicons.glyphMap = 'sunny-outline';
    let iconColor: string = colors.brand.amber;

    if (hour >= 12 && hour < 17) {
      greeting = 'Good afternoon';
      iconName = 'sunny';
      iconColor = colors.brand.amber;
    } else if (hour >= 17 || hour < 4) {
      greeting = 'Good evening';
      iconName = 'moon-outline';
      iconColor = colors.brand.mint;
    }

    const formattedDate = currentTime.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    return { greeting, iconName, iconColor, formattedDate };
  };

  const { greeting, iconName, iconColor, formattedDate } = getGreetingData();

  // Daily Motivational Quote (updates automatically each calendar day)
  const activeQuote = useMemo(() => {
    if (!quotesData || quotesData.length === 0) {
      return { id: 0, quote: '', author: '' };
    }
    const start = new Date(currentTime.getFullYear(), 0, 0);
    const diff = currentTime.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    const index = Math.abs(dayOfYear) % quotesData.length;
    return quotesData[index];
  }, [currentTime]);

  // Load dashboard statistics (green days, streak, and calendar dot statuses)
  const loadDashboard = useCallback(async () => {
    try {
      const year = calendarDate.getFullYear();
      const month = calendarDate.getMonth();
      const isCur =
        year === now.getFullYear() && month === now.getMonth();
      const yearStr = String(year);
      const monthStr = String(month + 1).padStart(2, '0');
      const lastDay = new Date(year, month + 1, 0).getDate();

      const anchor = isCur
        ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
        : `${yearStr}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

      const stats = await getHomeDashboardStats(anchor);
      setDashStats(stats);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    }
  }, [getHomeDashboardStats, calendarDate]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard, todaySummaries, todayEntries]);

  // Calendar Header and Cells calculation matching reference layout
  const monthYearTitle = useMemo(() => {
    return calendarDate.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }, [calendarDate]);

  const calendarGridCells = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth(); // 0-indexed

    const daysInCurMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    // Monday-based week index: Mon=0, Tue=1, ..., Sun=6
    const firstDayJs = new Date(year, month, 1).getDay();
    const leadingCount = (firstDayJs + 6) % 7;

    const cells: {
      key: string;
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      status?: 'green' | 'logged' | 'future';
    }[] = [];

    // 1. Previous month trailing overflow days
    for (let i = leadingCount - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevMonth = month === 0 ? 12 : month;
      const prevYear = month === 0 ? year - 1 : year;
      const dateStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      cells.push({
        key: `prev-${dateStr}`,
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: false,
      });
    }

    // Map of current month day statuses from dashStats
    const dayStatusMap = new Map<string, 'green' | 'logged' | 'future'>();
    if (dashStats?.monthDays) {
      for (const d of dashStats.monthDays) {
        dayStatusMap.set(d.date, d.status);
      }
    }

    // 2. Current month days
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    for (let d = 1; d <= daysInCurMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        key: `cur-${dateStr}`,
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        status: dayStatusMap.get(dateStr),
      });
    }

    // 3. Next month leading overflow days (to complete 5 or 6 rows of 7 days)
    const totalSoFar = cells.length;
    const targetTotal = Math.ceil(totalSoFar / 7) * 7;
    const trailingCount = targetTotal - totalSoFar;
    for (let d = 1; d <= trailingCount; d++) {
      const nextMonth = month === 11 ? 1 : month + 2;
      const nextYear = month === 11 ? year + 1 : year;
      const dateStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        key: `next-${dateStr}`,
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: false,
      });
    }

    return cells;
  }, [calendarDate, dashStats?.monthDays]);

  // Quick Increment (+)
  const handleIncrement = async (behaviorId: string) => {
    try {
      await quickLog(behaviorId, 1);
      loadDashboard();
    } catch (err) {
      console.error('Increment failed:', err);
    }
  };

  // Quick Decrement (-)
  const handleDecrement = async (behaviorId: string) => {
    try {
      const entries = todayEntries.filter((e) => e.behaviorId === behaviorId);
      if (entries.length === 0) return;

      const latest = entries[0];
      if (latest.value > 1) {
        await updateLogEntry(latest.id, { value: latest.value - 1 });
      } else {
        await deleteLogEntry(latest.id);
      }
      loadDashboard();
    } catch (err) {
      console.error('Decrement failed:', err);
    }
  };

  const handleOpenDetailedLog = (behaviorId: string) => {
    setSelectedBehaviorIdForLog(behaviorId);
    setQuickLogVisible(true);
  };

  // Today's summary lookup map
  const summaryMap = new Map<string, number>();
  for (const s of todaySummaries) {
    summaryMap.set(s.behaviorId, s.totalValue);
  }


  const insets = useSafeAreaInsets();
  // Clearance for floating dock tab bar (dock height ~56dp + bottom inset + breathing space)
  const bottomClearance = 56 + Math.max(insets.bottom, 8) + spacing.md;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomClearance }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Hero Section ("image") */}
        <View style={styles.heroContainer}>
          <Image source={heroImage} style={styles.heroImage} resizeMode="cover" />
          {/* Hero Header / Greeting Box Overlay */}
          <View
            style={[
              styles.heroOverlay,
              { top: Math.max(insets.top + 8, Platform.OS === 'android' ? 36 : 48) },
            ]}
          >
            <View style={styles.greetingBox}>
              <View style={styles.greetingTopRow}>
                <View style={styles.greetingIconBubble}>
                  <Ionicons name={iconName} size={18} color={iconColor} />
                </View>

                <View style={styles.greetingTextGroup}>
                  <View style={styles.greetingTitleRow}>
                    <Text style={styles.greetingTitle} numberOfLines={1}>
                      {greeting},{' '}
                      <Text style={styles.greetingUserName}>{userName}</Text>
                    </Text>
                  </View>

                  <Text style={styles.greetingDate}>{formattedDate}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Motivational Quote in Hero Section Middle + Center */}
          <View style={styles.heroQuoteWrapper} pointerEvents="box-none">
            <View style={styles.heroQuoteCard}>
              <Text style={styles.heroQuoteText}>
                "{activeQuote.quote}"
              </Text>
              {activeQuote.author ? (
                <Text style={styles.heroQuoteAuthor}>— {activeQuote.author}</Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* Middle Section 1: "tiny dashboard" */}
        <View style={styles.section}>
          {/* <Text style={styles.sectionHeading}>tiny dashboard</Text> */}
              <View style={styles.dashboardRow}>
                
            {/* Card 1: Stats (Redesigned per reference mockup) */}
            <View style={[styles.clayCard, styles.statsCard]}>
              {/* Header: This Month + chevron button */}
              <View style={styles.statsCardHeader}>
                <Text style={styles.statsCardTitle}>This Month</Text>
                {/* <TouchableOpacity
                  style={styles.statsChevronButton}
                  onPress={() => router.push('/(tabs)/insights')}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="chevron-forward" size={13} color={colors.textSecondary} />
                </TouchableOpacity> */}
              </View>

              {/* Row 1: Green Days */}
              <View style={styles.statRow}>
                <StatGauge
                  progress={greenDaysProgress}
                  activeColor={colors.brand.mint}
                  iconName="leaf"
                  iconColor={colors.brand.mint}
                />
                <View style={styles.statTextCol}>
                  <Text style={styles.statBigNumber}>{greenDaysCount}</Text>
                  <Text style={styles.statNameLabel}>Green Days</Text>
                  <Text style={styles.statDetailLabel}>of {daysInMonth} days</Text>
                </View>
              </View>

              {/* Row 2: Current Streak */}
              <View style={styles.statRow}>
                <StatGauge
                  progress={currentStreakProgress}
                  activeColor={colors.brand.amber}
                  iconName="flame"
                  iconColor={colors.brand.amber}
                />
                <View style={styles.statTextCol}>
                  <Text style={styles.statBigNumber}>{currentStreakCount}</Text>
                  <Text style={styles.statNameLabel}>Current Streak</Text>
                  <Text style={styles.statDetailLabel}>days</Text>
                </View>
              </View>

              {/* Row 3: Max Streak */}
              <View style={styles.statRow}>
                <StatGauge
                  progress={maxStreakProgress}
                  activeColor={colors.brand.ivory}
                  iconName="trophy"
                  iconColor={colors.brand.ivory}
                />
                <View style={styles.statTextCol}>
                  <Text style={styles.statBigNumber}>{maxStreakCount}</Text>
                  <Text style={styles.statNameLabel}>Max Streak</Text>
                  <Text style={styles.statDetailLabel}>all time</Text>
                </View>
              </View>
            </View>

            {/* Card 2: Calendar Card (matching reference design in dark theme) */}
            <View style={[styles.clayCard, styles.calendarCard]}>
              {/* Header: Month Year + navigation buttons */}
              <View style={styles.calendarHeader}>
                <Text style={styles.calendarTitle}>{monthYearTitle}</Text>
                <View style={styles.calendarNavButtons}>
                  <TouchableOpacity
                    style={styles.calendarNavButton}
                    onPress={handlePrevMonth}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="chevron-back" size={13} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.calendarNavButton}
                    onPress={handleNextMonth}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="chevron-forward" size={13} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* 7-Day Header: Mon Tue Wed Thu Fri Sat Sun */}
              <View style={styles.weekdaysRow}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <View key={day} style={styles.weekdayCol}>
                    <Text style={styles.weekdayText}>{day}</Text>
                  </View>
                ))}
              </View>

              {/* Numerical Calendar Grid */}
              <View style={styles.calendarGrid}>
                {calendarGridCells.map((cell) => {
                  let dotColor: string | null = null;
                  if (cell.isCurrentMonth) {
                    if (cell.status === 'green') {
                      dotColor = colors.statusGreenDay;
                    } else if (cell.status === 'logged') {
                      dotColor = colors.statusHabitActivity;
                    }
                  }

                  return (
                    <View key={cell.key} style={styles.dayCell}>
                      <View style={[styles.dayNumWrapper, cell.isToday && styles.todayNumWrapper]}>
                        <Text
                          style={[
                            styles.dayNumText,
                            !cell.isCurrentMonth && styles.otherMonthDayText,
                            cell.isToday && styles.todayDayText,
                          ]}
                        >
                          {cell.dayNumber}
                        </Text>
                      </View>
                      <View style={styles.dayDotSlot}>
                        {dotColor ? (
                          <View style={[styles.dayDot, { backgroundColor: dotColor }]} />
                        ) : (
                          <View style={styles.dayDotEmpty} />
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        </View>

        {/* Middle Section 2: "habits" */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>Habits</Text>
            <TouchableOpacity
              onPress={() => setCreateBehaviorVisible(true)}
              style={styles.addHabitButton}
              activeOpacity={0.8}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="add" size={16} color={colors.textPrimary} style={{ marginRight: 4 }} />
              <Text style={styles.addHabitButtonText}>Add Habit</Text>
            </TouchableOpacity>
          </View>

          {behaviors.length === 0 ? (
            <View style={[styles.clayCard, styles.emptyCard]}>
              <Ionicons name="leaf-outline" size={32} color={colors.textSecondary} />
              <Text style={styles.emptyTitle}>No habits tracked yet</Text>
              <Text style={styles.emptySubtitle}>
                Add a behavior you want to track calmly with daily zero-consumption streaks.
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => setCreateBehaviorVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={18} color={colors.textInverse} style={{ marginRight: 6 }} />
                <Text style={styles.emptyButtonText}>Add Habit</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.habitsList}>
              {behaviors.map((behavior) => {
                const todayVal = summaryMap.get(behavior.id) ?? 0;

                return (
                  <View key={behavior.id} style={[styles.clayCard, styles.habitCard]}>
                    {/* Left: Habit Icon Squircle */}
                    <TouchableOpacity
                      style={styles.habitIconBox}
                      onPress={() => handleOpenDetailedLog(behavior.id)}
                      activeOpacity={0.7}
                    >
                      {getHabitIcon(behavior.name, behavior.category)}
                    </TouchableOpacity>

                    {/* Middle: Habit Name & Subtitle */}
                    <TouchableOpacity
                      style={styles.habitInfoCol}
                      onPress={() => handleOpenDetailedLog(behavior.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.habitTitle}>{behavior.name}</Text>
                      <Text style={styles.habitSubtitle} numberOfLines={1}>
                        {getHabitSubtitle(behavior)}
                      </Text>
                    </TouchableOpacity>

                    {/* Right: Stepper Pill [-] N [+] */}
                    <View style={styles.habitStepperPill}>
                      <TouchableOpacity
                        style={[
                          styles.stepperCircleButton,
                          todayVal <= 0 && styles.stepperCircleDisabled,
                        ]}
                        onPress={() => handleDecrement(behavior.id)}
                        disabled={todayVal <= 0}
                        activeOpacity={0.6}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Ionicons
                          name="remove"
                          size={15}
                          color={todayVal > 0 ? colors.textPrimary : colors.textTertiary}
                        />
                      </TouchableOpacity>

                      <View style={styles.stepperCountBox}>
                        <Text style={styles.stepperCountText}>{todayVal}</Text>
                      </View>

                      <TouchableOpacity
                        style={styles.stepperCircleButton}
                        onPress={() => handleIncrement(behavior.id)}
                        activeOpacity={0.6}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Ionicons name="add" size={15} color={colors.textPrimary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Today's recent entries (subtle review & edit link) */}
        {/* {todayEntries.length > 0 && (
          <View style={styles.recentSection}>
            <Text style={styles.recentTitle}>Today's Activity Log</Text>
            <View style={[styles.clayCard, styles.recentCard]}>
              {todayEntries.map((entry, index) => {
                const timeStr = new Date(entry.occurredAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <TouchableOpacity
                    key={entry.id}
                    style={[
                      styles.recentRow,
                      index < todayEntries.length - 1 && styles.recentRowBorder,
                    ]}
                    onPress={() => setEntryToEdit(entry)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.recentRowLeft}>
                      <Text style={styles.recentRowName}>{entry.behaviorName}</Text>
                      {entry.note ? (
                        <Text style={styles.recentRowNote} numberOfLines={1}>
                          "{entry.note}"
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.recentRowRight}>
                      <Text style={styles.recentRowVal}>
                        +{entry.value} {entry.behaviorUnit}
                      </Text>
                      <Text style={styles.recentRowTime}>{timeStr}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )} */}
      </ScrollView>

      {/* Modals */}
      <QuickLogModal
        visible={quickLogVisible}
        behaviors={behaviors}
        initialBehaviorId={selectedBehaviorIdForLog}
        onClose={() => setQuickLogVisible(false)}
        onLog={async (bId, val, note) => {
          await createLogEntry({ behaviorId: bId, value: val, note });
          loadDashboard();
        }}
      />

      <BehaviorModal
        visible={createBehaviorVisible}
        onClose={() => setCreateBehaviorVisible(false)}
        onSave={async (data) => {
          await createBehavior(data);
          loadDashboard();
        }}
      />

      <EditLogModal
        visible={entryToEdit !== null}
        entry={entryToEdit}
        onClose={() => setEntryToEdit(null)}
        onSave={async (id, val, occurredAt, note) => {
          await updateLogEntry(id, { value: val, occurredAt, note });
          loadDashboard();
        }}
        onDelete={async (id) => {
          await deleteLogEntry(id);
          loadDashboard();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 110, // accommodates floating dock tab bar cleanly
  },

  // Hero Section
  heroContainer: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    backgroundColor: colors.brand.obsidian,
    elevation: 6,
    shadowColor: colors.brand.obsidian,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 10,
  },
  greetingBox: {
    // backgroundColor: 'rgba(26, 33, 29, 0.82)',
    top: 30,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    // borderWidth: 1,
    // borderColor: 'rgba(255, 255, 255, 0.08)',
    // shadowColor: colors.brand.obsidian,
    // shadowOffset: { width: 0, height: 4 },
    // shadowOpacity: 0.3,
    // shadowRadius: 8,
    // elevation: 4,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  greetingTopRow: {
    flexDirection: 'column',
    gap: 8,

  },
  greetingIconBubble: {
    width: 40,
    height: 40,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  greetingTextGroup: {
    flexShrink: 1,
    justifyContent: 'center',
  },
  greetingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greetingTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.1,
  },
  greetingUserName: {
    color: colors.brand.mint,
    fontWeight: '800',
  },
  greetingDate: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: 2,
    letterSpacing: 0.1,
  },
  behaveLogoText: {
    fontSize: 24,
    fontWeight: '500',
    borderWidth: 1,
    borderColor: colors.brand.mint,
    color: 'transparent',
    letterSpacing: -0.1,
  },

  // Hero Section Quotes (Middle + Center)
  heroQuoteWrapper: {
    position: 'absolute',
    top: 190,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  heroQuoteCard: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    maxWidth: '92%',
  },
  heroQuoteText: {
    fontSize: 18,
    fontStyle: 'italic',
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 20,
    letterSpacing: 0.5,
  },
  heroQuoteAuthor: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.brand.mint,
    marginTop: 6,
    letterSpacing: 0.3,
    textAlign: 'center',
  },

  // Sections
  section: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionHeading: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addHabitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  addHabitButtonText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.textPrimary,
  },

  // Clay / Muted Warm Cards (matching wireframe grey tone)
  clayCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },

  // Dashboard Row (2 side-by-side cards)
  dashboardRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statsCard: {
    flex: 0.6,
    padding: 12,
    justifyContent: 'space-between',
  },
  statsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statsCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  statsChevronButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  statTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  statBigNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 22,
    letterSpacing: -0.5,
  },
  statNameLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 1,
  },
  statDetailLabel: {
    fontSize: 10,
    fontWeight: '400',
    color: colors.textTertiary,
  },
  gaugeContainer: {
    width: 44,
    height: 34,
    alignItems: 'center',
    justifyContent: 'flex-start',
    overflow: 'hidden',
    position: 'relative',
  },
  gaugeArc: {
    position: 'absolute',
    top: 0,
  },
  gaugeCenterIcon: {
    position: 'absolute',
    bottom: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Calendar Card
  calendarCard: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 12,
    justifyContent: 'flex-start',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  calendarTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  calendarNavButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  calendarNavButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  weekdayCol: {
    width: `${100 / 7}%`,
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: -0.2,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  dayCell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: 2,
  },
  dayNumWrapper: {
    width: 22,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  todayNumWrapper: {
    backgroundColor: 'rgba(185, 246, 202, 0.15)',
  },
  dayNumText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  otherMonthDayText: {
    color: 'rgba(255, 255, 255, 0.22)',
    fontWeight: '400',
  },
  todayDayText: {
    color: colors.brand.mint,
    fontWeight: '700',
  },
  dayDotSlot: {
    height: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  dayDot: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.25,
  },
  dayDotEmpty: {
    width: 4.5,
    height: 4.5,
  },

  // Habits List
  habitsList: {
    gap: 10,
  },
  habitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 22,
  },
  habitIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitInfoCol: {
    flex: 1,
    marginLeft: 14,
    marginRight: 10,
    justifyContent: 'center',
  },
  habitTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  habitSubtitle: {
    fontSize: 12.5,
    fontWeight: '400',
    color: colors.textSecondary,
    letterSpacing: -0.1,
  },

  // Stepper Pill [-] N [+]
  habitStepperPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  stepperCircleButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperCircleDisabled: {
    opacity: 0.35,
  },
  stepperCountBox: {
    minWidth: 28,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperCountText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  // Empty State
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radii.full,
  },
  emptyButtonText: {
    color: colors.textInverse,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },

  // Recent Activity Log
  recentSection: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  recentCard: {
    padding: 0,
    overflow: 'hidden',
  },
  recentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  recentRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  recentRowLeft: {
    flex: 1,
    marginRight: 10,
  },
  recentRowName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  recentRowNote: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  recentRowRight: {
    alignItems: 'flex-end',
  },
  recentRowVal: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accentPrimaryDark,
  },
  recentRowTime: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 2,
  },
});
