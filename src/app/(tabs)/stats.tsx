import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  ActivityIndicator,
  Modal,
  TextInput,
  Pressable,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, spacing, typography } from '@/theme';
import { useBehaviors } from '@/context/BehaviorContext';
import {
  type MultiHabitWeekData,
  type UnifiedStatsData,
  type HabitDeepDiveStats,
  type YearMatrixData,
  type MonthMatrixItem,
  type CustomPeriodStats,
} from '@/db';
import { toDayString, shiftDayString } from '@/utils/date';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Helper to format date nicely (e.g. "Aug 12, 2026")
function formatDateFriendly(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return dateStr;
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// Calculate calendar days between two YYYY-MM-DD dates inclusive
function getDaysBetween(fromStr: string, toStr: string): number {
  try {
    const [fy, fm, fd] = fromStr.split('-').map(Number);
    const [ty, tm, td] = toStr.split('-').map(Number);
    const fromUtc = Date.UTC(fy, fm - 1, fd);
    const toUtc = Date.UTC(ty, tm - 1, td);
    return Math.max(1, Math.round(Math.abs(toUtc - fromUtc) / (1000 * 60 * 60 * 24)) + 1);
  } catch {
    return 1;
  }
}

// Helper to shift a date by month(s)
function shiftMonthString(dateStr: string, monthDelta: number): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const target = new Date(y, m - 1 + monthDelta, 1);
    const targetY = target.getFullYear();
    const targetM = target.getMonth() + 1;
    const daysInMonth = new Date(targetY, targetM, 0).getDate();
    const cappedD = Math.min(d, daysInMonth);
    return `${targetY}-${String(targetM).padStart(2, '0')}-${String(cappedD).padStart(2, '0')}`;
  } catch {
    return dateStr;
  }
}

// Helper to get habit icon
function getHabitIconComponent(name: string, size = 20, color = colors.textPrimary) {
  const lower = name.toLowerCase();
  if (lower.includes('smoke') || lower.includes('cigar') || lower.includes('vape')) {
    return <MaterialCommunityIcons name="smoking" size={size} color={color} />;
  }
  if (
    lower.includes('masturbat') ||
    lower.includes('porn') ||
    lower.includes('fap') ||
    lower.includes('nofap') ||
    lower.includes('infinite')
  ) {
    return <MaterialCommunityIcons name="infinity" size={size + 2} color={color} />;
  }
  if (lower.includes('alcohol') || lower.includes('beer') || lower.includes('wine') || lower.includes('drink')) {
    return <MaterialCommunityIcons name="glass-wine" size={size} color={color} />;
  }
  if (lower.includes('sugar') || lower.includes('food') || lower.includes('snack') || lower.includes('junk')) {
    return <MaterialCommunityIcons name="food-apple" size={size} color={color} />;
  }
  if (lower.includes('game') || lower.includes('gaming')) {
    return <MaterialCommunityIcons name="controller" size={size} color={color} />;
  }
  if (lower.includes('phone') || lower.includes('screen') || lower.includes('social') || lower.includes('scroll')) {
    return <MaterialCommunityIcons name="cellphone" size={size} color={color} />;
  }
  if (lower.includes('caffeine') || lower.includes('coffee')) {
    return <MaterialCommunityIcons name="coffee" size={size} color={color} />;
  }
  if (lower.includes('weed') || lower.includes('cannabis')) {
    return <MaterialCommunityIcons name="cannabis" size={size} color={color} />;
  }
  return <MaterialCommunityIcons name="repeat" size={size} color={color} />;
}

type PeriodPreset = '7D' | '30D' | 'THIS_MONTH' | '90D' | 'THIS_YEAR' | 'CUSTOM';

const CAL_MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const CAL_MONTH_SHORT_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const {
    behaviors,
    todayEntries,
    getMultiHabitWeekData,
    getUnifiedStats,
    getAvailableYears,
    getYearMatrixData,
    getCustomPeriodStats,
  } = useBehaviors();

  const todayStr = useMemo(() => toDayString(), []);

  // Section 1: 7-Day breakdown state
  const [weekAnchorDate, setWeekAnchorDate] = useState<string>(todayStr);
  const [weekData, setWeekData] = useState<MultiHabitWeekData | null>(null);
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);

  // Section 2: Unified stats & individual habit report card state
  const [unifiedStats, setUnifiedStats] = useState<UnifiedStatsData | null>(null);
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);

  // Section 3: Year & 4x3 Month matrix state
  const [availableYears, setAvailableYears] = useState<number[]>([new Date().getFullYear()]);
  const [selectedMatrixYear, setSelectedMatrixYear] = useState<number>(new Date().getFullYear());
  const [yearMatrix, setYearMatrix] = useState<YearMatrixData | null>(null);
  const [inspectedMonth, setInspectedMonth] = useState<MonthMatrixItem | null>(null);

  // Section 4: Custom Period Query state
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('30D');
  const [customFromDate, setCustomFromDate] = useState<string>(shiftDayString(todayStr, -29));
  const [customToDate, setCustomToDate] = useState<string>(todayStr);
  const [selectedFilterHabitIds, setSelectedFilterHabitIds] = useState<string[]>([]);
  const [customStats, setCustomStats] = useState<CustomPeriodStats | null>(null);

  // Cool Custom Picker Modal State
  const [isCustomPickerOpen, setIsCustomPickerOpen] = useState(false);
  const [pickerFromInput, setPickerFromInput] = useState(shiftDayString(todayStr, -29));
  const [pickerToInput, setPickerToInput] = useState(todayStr);
  const [pickerSelectedHabitIds, setPickerSelectedHabitIds] = useState<string[]>([]);

  // Calendar Popup Date Picker state (Year / Month / Date Selection)
  const [isDatePickerPopupOpen, setIsDatePickerPopupOpen] = useState(false);
  const [datePickerTarget, setDatePickerTarget] = useState<'from' | 'to'>('from');
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(() => new Date());
  const [isMonthYearPickerOpen, setIsMonthYearPickerOpen] = useState(false);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingCustom, setIsLoadingCustom] = useState<boolean>(false);

  // Set default selected habit
  useEffect(() => {
    if (behaviors.length > 0 && (!selectedHabitId || !behaviors.some((b) => b.id === selectedHabitId))) {
      setSelectedHabitId(behaviors[0].id);
    }
  }, [behaviors, selectedHabitId]);

  // Load 7-day multi-habit week breakdown data
  const loadWeekData = useCallback(async (anchor: string) => {
    try {
      const data = await getMultiHabitWeekData(anchor);
      setWeekData(data);
    } catch (err) {
      console.error('Failed to load multi-habit week data:', err);
    }
  }, [getMultiHabitWeekData]);

  // Load unified statistics
  const loadStats = useCallback(async () => {
    try {
      const data = await getUnifiedStats();
      setUnifiedStats(data);
    } catch (err) {
      console.error('Failed to load unified stats:', err);
    }
  }, [getUnifiedStats]);

  // Load available years & year matrix data
  const loadYearMatrix = useCallback(async (year: number) => {
    try {
      const years = await getAvailableYears();
      setAvailableYears(years);
      const matrix = await getYearMatrixData(year);
      setYearMatrix(matrix);
    } catch (err) {
      console.error('Failed to load year matrix data:', err);
    }
  }, [getAvailableYears, getYearMatrixData]);

  // Load custom period stats with multi-habit filtering
  const loadCustomStats = useCallback(
    async (from: string, to: string, filterHabits?: string[]) => {
      try {
        setIsLoadingCustom(true);
        const activeIds = filterHabits !== undefined ? filterHabits : selectedFilterHabitIds;
        const filterArg = activeIds.length > 0 ? activeIds : undefined;
        const stats = await getCustomPeriodStats(from, to, filterArg);
        setCustomStats(stats);
      } catch (err) {
        console.error('Failed to load custom period stats:', err);
      } finally {
        setIsLoadingCustom(false);
      }
    },
    [getCustomPeriodStats, selectedFilterHabitIds]
  );

  // Open the custom picker modal with current active values
  const handleOpenCustomPicker = () => {
    setPickerFromInput(customFromDate);
    setPickerToInput(customToDate);
    setPickerSelectedHabitIds(
      selectedFilterHabitIds.length > 0 ? [...selectedFilterHabitIds] : behaviors.map((b) => b.id)
    );
    setIsCustomPickerOpen(true);
  };

  // Handle Preset Switching
  const handleSelectPreset = (preset: PeriodPreset) => {
    setPeriodPreset(preset);
    let from = customFromDate;
    const to = todayStr;

    if (preset === '7D') {
      from = shiftDayString(todayStr, -6);
    } else if (preset === '30D') {
      from = shiftDayString(todayStr, -29);
    } else if (preset === 'THIS_MONTH') {
      const [y, m] = todayStr.split('-');
      from = `${y}-${m}-01`;
    } else if (preset === '90D') {
      from = shiftDayString(todayStr, -89);
    } else if (preset === 'THIS_YEAR') {
      const y = todayStr.split('-')[0];
      from = `${y}-01-01`;
    } else if (preset === 'CUSTOM') {
      handleOpenCustomPicker();
      return;
    }

    setCustomFromDate(from);
    setCustomToDate(to);
    loadCustomStats(from, to, selectedFilterHabitIds);
  };

  // Toggle habit inside modal
  const handleToggleModalHabit = (habitId: string) => {
    setPickerSelectedHabitIds((prev) => {
      if (prev.includes(habitId)) {
        if (prev.length <= 1) return prev; // Keep at least one selected
        return prev.filter((id) => id !== habitId);
      } else {
        return [...prev, habitId];
      }
    });
  };

  const handleSelectAllModalHabits = () => {
    setPickerSelectedHabitIds(behaviors.map((b) => b.id));
  };

  const handleInvertModalHabits = () => {
    setPickerSelectedHabitIds((prev) => {
      const inverted = behaviors.filter((b) => !prev.includes(b.id)).map((b) => b.id);
      return inverted.length > 0 ? inverted : behaviors.map((b) => b.id);
    });
  };

  // Apply modal preset
  const handleApplyModalPreset = (presetKey: string) => {
    let from = pickerFromInput;
    const to = todayStr;

    if (presetKey === '7D') {
      from = shiftDayString(todayStr, -6);
    } else if (presetKey === '14D') {
      from = shiftDayString(todayStr, -13);
    } else if (presetKey === '30D') {
      from = shiftDayString(todayStr, -29);
    } else if (presetKey === 'THIS_MONTH') {
      const [y, m] = todayStr.split('-');
      from = `${y}-${m}-01`;
    } else if (presetKey === 'LAST_MONTH') {
      const [y, m] = todayStr.split('-').map(Number);
      const prevMonth = new Date(y, m - 2, 1);
      const py = prevMonth.getFullYear();
      const pm = String(prevMonth.getMonth() + 1).padStart(2, '0');
      from = `${py}-${pm}-01`;
      const lastDay = new Date(py, prevMonth.getMonth() + 1, 0).getDate();
      setPickerFromInput(from);
      setPickerToInput(`${py}-${pm}-${String(lastDay).padStart(2, '0')}`);
      return;
    } else if (presetKey === '90D') {
      from = shiftDayString(todayStr, -89);
    } else if (presetKey === 'THIS_YEAR') {
      const y = todayStr.split('-')[0];
      from = `${y}-01-01`;
    } else if (presetKey === 'ALL_TIME') {
      from = shiftDayString(todayStr, -365);
    }

    setPickerFromInput(from);
    setPickerToInput(to);
  };

  // Steppers for modal dates
  const handleStepFromDate = (days: number) => {
    setPickerFromInput((prev) => {
      const shifted = shiftDayString(prev, days);
      return shifted > pickerToInput ? pickerToInput : shifted;
    });
  };

  const handleStepToDate = (days: number) => {
    setPickerToInput((prev) => {
      const shifted = shiftDayString(prev, days);
      return shifted > todayStr ? todayStr : shifted < pickerFromInput ? pickerFromInput : shifted;
    });
  };

  const handleStepFromMonth = (monthDelta: number) => {
    setPickerFromInput((prev) => {
      const shifted = shiftMonthString(prev, monthDelta);
      return shifted > pickerToInput ? pickerToInput : shifted;
    });
  };

  // Apply custom picker
  const handleApplyCustomPicker = () => {
    const validDateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!validDateRegex.test(pickerFromInput) || !validDateRegex.test(pickerToInput)) {
      alert('Please enter valid dates in YYYY-MM-DD format.');
      return;
    }
    const from = pickerFromInput <= pickerToInput ? pickerFromInput : pickerToInput;
    const to = pickerFromInput <= pickerToInput ? pickerToInput : pickerFromInput;

    const finalHabits =
      pickerSelectedHabitIds.length === behaviors.length || pickerSelectedHabitIds.length === 0
        ? []
        : pickerSelectedHabitIds;

    setPeriodPreset('CUSTOM');
    setCustomFromDate(from);
    setCustomToDate(to);
    setSelectedFilterHabitIds(finalHabits);
    setIsCustomPickerOpen(false);
    loadCustomStats(from, to, finalHabits);
  };

  // Reset custom picker modal
  const handleResetCustomPicker = () => {
    const from = shiftDayString(todayStr, -29);
    const to = todayStr;
    setPickerFromInput(from);
    setPickerToInput(to);
    setPickerSelectedHabitIds(behaviors.map((b) => b.id));
  };

  // Inline habit chip toggle on main screen
  const handleToggleHabitFilterInline = (habitId: string) => {
    let next: string[];
    if (selectedFilterHabitIds.length === 0) {
      next = [habitId];
    } else if (selectedFilterHabitIds.includes(habitId)) {
      next = selectedFilterHabitIds.filter((id) => id !== habitId);
    } else {
      next = [...selectedFilterHabitIds, habitId];
      if (next.length === behaviors.length) {
        next = [];
      }
    }
    setSelectedFilterHabitIds(next);
    loadCustomStats(customFromDate, customToDate, next);
  };

  const handleSelectAllHabitsInline = () => {
    setSelectedFilterHabitIds([]);
    loadCustomStats(customFromDate, customToDate, []);
  };

  // ========================================================
  // CALENDAR POPUP DATE PICKER LOGIC (YEAR / MONTH / DATE)
  // ========================================================
  const availableCalendarYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let y = 2020; y <= currentYear + 3; y++) {
      years.push(y);
    }
    return years;
  }, []);

  const handleOpenDatePickerPopup = (target: 'from' | 'to') => {
    setDatePickerTarget(target);
    setIsMonthYearPickerOpen(false);
    const dateToUse = target === 'from' ? pickerFromInput : pickerToInput;
    try {
      const [y, m] = dateToUse.split('-').map(Number);
      if (y && m) {
        setCalendarViewDate(new Date(y, m - 1, 1));
      } else {
        setCalendarViewDate(new Date());
      }
    } catch {
      setCalendarViewDate(new Date());
    }
    setIsDatePickerPopupOpen(true);
  };

  const handlePrevCalendarMonth = () => {
    setCalendarViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextCalendarMonth = () => {
    setCalendarViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleSelectCalendarYear = (year: number) => {
    setCalendarViewDate((prev) => new Date(year, prev.getMonth(), 1));
  };

  const handleSelectCalendarMonth = (monthIndex: number) => {
    setCalendarViewDate((prev) => new Date(prev.getFullYear(), monthIndex, 1));
    setIsMonthYearPickerOpen(false);
  };

  const handleSelectCalendarCellDate = (dateStr: string) => {
    if (datePickerTarget === 'from') {
      setPickerFromInput(dateStr);
      if (dateStr > pickerToInput) {
        setPickerToInput(dateStr);
      }
      // Automatically advance target to 'to' for seamless 2-tap range selection
      setDatePickerTarget('to');
    } else {
      setPickerToInput(dateStr);
      if (dateStr < pickerFromInput) {
        setPickerFromInput(dateStr);
      }
    }
  };

  const handleJumpToTodayInCalendar = () => {
    const now = new Date();
    setCalendarViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setIsMonthYearPickerOpen(false);
    if (datePickerTarget === 'from') {
      setPickerFromInput(todayStr);
      if (todayStr > pickerToInput) setPickerToInput(todayStr);
    } else {
      setPickerToInput(todayStr);
      if (todayStr < pickerFromInput) setPickerFromInput(todayStr);
    }
  };

  // Generate 7-column calendar grid for the viewed month
  const calendarGrid = useMemo(() => {
    const y = calendarViewDate.getFullYear();
    const m = calendarViewDate.getMonth();

    const firstDayOfMonth = new Date(y, m, 1);
    const lastDayOfMonth = new Date(y, m + 1, 0);
    const daysInCurrentMonth = lastDayOfMonth.getDate();

    // Monday-based (0 = Mon, 6 = Sun)
    const firstDayDow = (firstDayOfMonth.getDay() + 6) % 7;
    const prevMonthLastDay = new Date(y, m, 0).getDate();

    const cells: {
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelectedFrom: boolean;
      isSelectedTo: boolean;
      isInRange: boolean;
    }[] = [];

    // Leading padding days from previous month
    for (let i = firstDayDow - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const prevDate = new Date(y, m - 1, d);
      const dateStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelectedFrom: dateStr === pickerFromInput,
        isSelectedTo: dateStr === pickerToInput,
        isInRange: dateStr >= pickerFromInput && dateStr <= pickerToInput,
      });
    }

    // Days in current month
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isSelectedFrom: dateStr === pickerFromInput,
        isSelectedTo: dateStr === pickerToInput,
        isInRange: dateStr >= pickerFromInput && dateStr <= pickerToInput,
      });
    }

    // Trailing padding days from next month
    const remainder = (7 - (cells.length % 7)) % 7;
    for (let d = 1; d <= remainder; d++) {
      const nextDate = new Date(y, m + 1, d);
      const dateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelectedFrom: dateStr === pickerFromInput,
        isSelectedTo: dateStr === pickerToInput,
        isInRange: dateStr >= pickerFromInput && dateStr <= pickerToInput,
      });
    }

    return cells;
  }, [calendarViewDate, pickerFromInput, pickerToInput, todayStr]);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([
      loadWeekData(weekAnchorDate),
      loadStats(),
      loadYearMatrix(selectedMatrixYear),
      loadCustomStats(customFromDate, customToDate, selectedFilterHabitIds),
    ]);
    setIsLoading(false);
  }, [loadWeekData, loadStats, loadYearMatrix, loadCustomStats, weekAnchorDate, selectedMatrixYear, customFromDate, customToDate, selectedFilterHabitIds]);

  useEffect(() => {
    loadAll();
  }, [loadAll, todayEntries]);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll])
  );

  // Week navigation
  const handlePrevWeek = () => {
    setWeekAnchorDate((prev) => shiftDayString(prev, -7));
  };

  const handleNextWeek = () => {
    if (weekAnchorDate < todayStr) {
      setWeekAnchorDate((prev) => {
        const next = shiftDayString(prev, 7);
        return next > todayStr ? todayStr : next;
      });
    }
  };

  const handleResetToCurrentWeek = () => {
    setWeekAnchorDate(todayStr);
  };

  const isCurrentWeek = weekAnchorDate >= todayStr;

  // Selected Habit Stats for Report Card
  const selectedHabitStats: HabitDeepDiveStats | undefined = useMemo(() => {
    if (!unifiedStats || !selectedHabitId) return undefined;
    return unifiedStats.habitStats.find((h) => h.behaviorId === selectedHabitId);
  }, [unifiedStats, selectedHabitId]);

  // Max value calculation for 7-day multi-line chart height
  const maxWeekVal = Math.max(weekData?.maxVal ?? 1, 4);

  // Clearance for bottom floating dock
  const bottomClearance = 70 + Math.max(insets.bottom, 12);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top + 16, 44), paddingBottom: bottomClearance },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ======================================================== */}
        {/* HEADER: PRODUCTION-GRADE BEHAVIOR REPORT CARD            */}
        {/* ======================================================== */}
        <View style={styles.screenHeader}>
          <View style={styles.headerTitleCol}>
            <Text style={styles.screenTitle}>Insights </Text>
            <Text style={styles.screenSubtitle}>
              Clean streaks, relapse occurrences & behavior patterns
            </Text>
          </View>
        </View>

        {isLoading && !unifiedStats ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.accentPrimary} />
            <Text style={styles.loaderText}>Compiling behavioral report card...</Text>
          </View>
        ) : (
          <>
            {/* ======================================================== */}
            {/* SECTION 1: 7-DAY MULTI-HABIT BREAKDOWN GRAPH             */}
            {/* ======================================================== */}
            <View style={styles.section}>
              <View style={[styles.clayCard, styles.weekCard]}>
                {/* Header: Range & Navigation */}
                <View style={styles.weekCardHeader}>
                  <View>
                    <Text style={styles.cardHeaderTitle}>7-Day Breakdown</Text>
                    <Text style={styles.cardHeaderRange}>
                      {weekData?.formattedRange || 'Current 7 Days'}
                    </Text>
                  </View>

                  <View style={styles.weekNavButtonGroup}>
                    <TouchableOpacity
                      style={styles.weekNavBtn}
                      onPress={handlePrevWeek}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityLabel="Previous 7 days"
                    >
                      <Ionicons name="chevron-back" size={15} color={colors.textSecondary} />
                    </TouchableOpacity>

                    {!isCurrentWeek && (
                      <TouchableOpacity
                        style={styles.weekTodayPill}
                        onPress={handleResetToCurrentWeek}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.weekTodayPillText}>Today</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={[styles.weekNavBtn, isCurrentWeek && styles.weekNavBtnDisabled]}
                      onPress={handleNextWeek}
                      disabled={isCurrentWeek}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityLabel="Next 7 days"
                    >
                      <Ionicons
                        name="chevron-forward"
                        size={15}
                        color={isCurrentWeek ? colors.border : colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Habit Legends */}
                {weekData && weekData.habits.length > 0 && (
                  <View style={styles.habitsLegendRow}>
                    {weekData.habits.map((habit) => (
                      <View key={habit.id} style={styles.legendItem}>
                        <View style={[styles.legendColorDot, { backgroundColor: habit.color }]} />
                        <Text style={styles.legendLabel} numberOfLines={1}>
                          {habit.name}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* 7-Day Grouped Multi-Line Bars */}
                {weekData && weekData.habits.length > 0 ? (
                  <View style={styles.chartWrapper}>
                    <View style={styles.daysRow}>
                      {weekData.days.map((day) => {
                        const isSelected = selectedDayDate === day.dateStr;
                        const dayTotal = weekData.habits.reduce(
                          (sum, h) => sum + (day.values[h.id] || 0),
                          0
                        );
                        const habitCount = Math.max(weekData.habits.length, 1);
                        const singleBarWidth =
                          habitCount === 1 ? 14 : habitCount === 2 ? 8 : habitCount === 3 ? 6 : 4;

                        return (
                          <TouchableOpacity
                            key={day.dateStr}
                            style={[
                              styles.dayColContainer,
                              isSelected && styles.dayColContainerSelected,
                            ]}
                            onPress={() =>
                              setSelectedDayDate(isSelected ? null : day.dateStr)
                            }
                            activeOpacity={0.75}
                          >
                            {/* Day Total Header Indicator */}
                            <View style={styles.dayTopIndicator}>
                              {dayTotal === 0 ? (
                                <Ionicons
                                  name="checkmark-circle"
                                  size={13}
                                  color={colors.statusGreenDay}
                                />
                              ) : (
                                <Text style={styles.dayTopValText}>+{dayTotal}</Text>
                              )}
                            </View>

                            {/* Bar Well / Track */}
                            <View
                              style={[
                                styles.dayBarTrack,
                                isSelected && styles.dayBarTrackSelected,
                              ]}
                            >
                              <View style={styles.habitBarsRow}>
                                {weekData.habits.map((habit) => {
                                  const val = day.values[habit.id] || 0;
                                  const maxH = 82;
                                  const fillH =
                                    val > 0
                                      ? Math.max(10, Math.round((val / maxWeekVal) * maxH))
                                      : 4;

                                  return (
                                    <View
                                      key={`${habit.id}-${day.dateStr}`}
                                      style={[
                                        styles.habitBarItem,
                                        {
                                          width: singleBarWidth,
                                          height: fillH,
                                          backgroundColor:
                                            val > 0 ? habit.color : 'rgba(255, 255, 255, 0.12)',
                                        },
                                      ]}
                                    />
                                  );
                                })}
                              </View>
                            </View>

                            {/* Day Name & Number Label */}
                            <View style={styles.dayBottomLabels}>
                              <Text
                                style={[
                                  styles.dayNameLabel,
                                  day.isToday && styles.dayLabelToday,
                                ]}
                              >
                                {day.dayName}
                              </Text>
                              <Text
                                style={[
                                  styles.dayNumLabel,
                                  day.isToday && styles.dayLabelToday,
                                ]}
                              >
                                {day.dayNumber}
                              </Text>
                              {day.isToday && <View style={styles.todayIndicatorDot} />}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Inspection Drawer on Day Tap */}
                    {selectedDayDate && (
                      <View style={styles.dayInspectionCard}>
                        <View style={styles.inspectionHeader}>
                          <View style={styles.inspectionTitleGroup}>
                            <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                            <Text style={styles.inspectionTitle}>
                              {formatDateFriendly(selectedDayDate)} Occurrence Details
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => setSelectedDayDate(null)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                          </TouchableOpacity>
                        </View>
                        <View style={styles.inspectionList}>
                          {weekData.habits.map((h) => {
                            const dayObj = weekData.days.find((d) => d.dateStr === selectedDayDate);
                            const val = dayObj?.values[h.id] || 0;
                            return (
                              <View key={h.id} style={styles.inspectionRow}>
                                <View style={styles.inspectionHabitLeft}>
                                  <View
                                    style={[styles.legendColorDot, { backgroundColor: h.color }]}
                                  />
                                  <Text style={styles.inspectionHabitName}>{h.name}</Text>
                                </View>
                                <Text
                                  style={[
                                    styles.inspectionHabitVal,
                                    val === 0 ? styles.valGreen : styles.valAmber,
                                  ]}
                                >
                                  {val === 0 ? 'Clean (0)' : `+${val} ${h.unit}`}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.emptyPrompt}>
                    <Text style={styles.emptyPromptText}>No bad habits currently tracked.</Text>
                  </View>
                )}
              </View>
            </View>

            {/* ======================================================== */}
            {/* SECTION 2: BAD HABIT REPORT CARDS (ABSTINENCE CARDS)      */}
            {/* ======================================================== */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={styles.sectionTitle}>Habit Cards</Text>
                  <Text style={styles.sectionSubtitle}>
                    Clean streaks, record abstinence & all-time green days
                  </Text>
                </View>
              </View>

              {/* Horizontal Habit Selector Chips */}
              {behaviors.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.habitSelectorRow}
                >
                  {behaviors.map((b) => {
                    const isSelected = b.id === selectedHabitId;
                    return (
                      <TouchableOpacity
                        key={b.id}
                        style={[styles.habitChip, isSelected && styles.habitChipSelected]}
                        onPress={() => setSelectedHabitId(b.id)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.habitChipIcon}>
                          {getHabitIconComponent(
                            b.name,
                            15,
                            isSelected ? colors.accentPrimary : colors.textSecondary
                          )}
                        </View>
                        <Text
                          style={[
                            styles.habitChipText,
                            isSelected && styles.habitChipTextSelected,
                          ]}
                        >
                          {b.nickname || b.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {/* Selected Habit Deep Report Card */}
              {selectedHabitStats ? (
                <View style={[styles.clayCard, styles.deepDiveCard]}>
                  {/* Card Header */}
                  <View style={styles.deepDiveHeader}>
                    <View style={styles.deepDiveTitleRow}>
                      <View style={styles.deepDiveIconBox}>
                        {getHabitIconComponent(selectedHabitStats.behaviorName, 24, colors.textPrimary)}
                      </View>
                      <View>
                        <Text style={styles.deepDiveHabitName}>
                          {selectedHabitStats.behaviorName}
                        </Text>
                        <Text style={styles.deepDiveStartDate}>
                          Tracked since: {formatDateFriendly(selectedHabitStats.createdDate)}
                        </Text>
                      </View>
                    </View>

                    {/* Clean Status Pill */}
                    <View
                      style={[
                        styles.statusPill,
                        selectedHabitStats.currentStreak > 0
                          ? styles.statusPillClean
                          : styles.statusPillRelapsed,
                      ]}
                    >
                      <View
                        style={[
                          styles.statusPillDot,
                          {
                            backgroundColor:
                              selectedHabitStats.currentStreak > 0
                                ? colors.statusGreenDay
                                : colors.brand.amber,
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusPillText,
                          {
                            color:
                              selectedHabitStats.currentStreak > 0
                                ? colors.statusGreenDay
                                : colors.brand.amber,
                          },
                        ]}
                      >
                        {selectedHabitStats.currentStreak > 0
                          ? 'Clean Run Active'
                          : 'Relapsed Recently'}
                      </Text>
                    </View>
                  </View>

                  {/* 4-Metric Grid */}
                  <View style={styles.reportMetricGrid}>
                    {/* Metric 1: Current Clean Streak */}
                    <View style={styles.reportMetricBox}>
                      <View style={styles.reportMetricHeader}>
                        <Ionicons name="flame" size={15} color={colors.accentPrimary} />
                        <Text style={styles.reportMetricLabel}>Current Streak</Text>
                      </View>
                      <Text style={styles.reportMetricValue}>
                        {selectedHabitStats.currentStreak}
                        <Text style={styles.reportMetricUnit}> d</Text>
                      </Text>
                      <Text style={styles.reportMetricSubtext}>consecutive clean days</Text>
                    </View>

                    {/* Metric 2: Best Streak Record (Max Green Days) */}
                    <View style={styles.reportMetricBox}>
                      <View style={styles.reportMetricHeader}>
                        <Ionicons name="trophy" size={15} color={colors.brand.amber} />
                        <Text style={styles.reportMetricLabel}>Best Clean Streak</Text>
                      </View>
                      <Text style={styles.reportMetricValue}>
                        {selectedHabitStats.maxStreak}
                        <Text style={styles.reportMetricUnit}> d</Text>
                      </Text>
                      <Text style={styles.reportMetricSubtext}>
                        {selectedHabitStats.maxStreakStart && selectedHabitStats.maxStreakEnd
                          ? `${formatDateFriendly(selectedHabitStats.maxStreakStart)} – ${formatDateFriendly(selectedHabitStats.maxStreakEnd)}`
                          : 'all-time record clean'}
                      </Text>
                    </View>

                    {/* Metric 3: All-Time Green Days */}
                    <View style={styles.reportMetricBox}>
                      <View style={styles.reportMetricHeader}>
                        <Ionicons name="leaf" size={15} color={colors.statusGreenDay} />
                        <Text style={styles.reportMetricLabel}>Total Green Days</Text>
                      </View>
                      <Text style={styles.reportMetricValue}>
                        {selectedHabitStats.totalGreenDays}
                        <Text style={styles.reportMetricUnit}> d</Text>
                      </Text>
                      <Text style={styles.reportMetricSubtext}>
                        {selectedHabitStats.cleanRate}% clean adherence
                      </Text>
                    </View>

                    {/* Metric 4: Relapse Volume */}
                    <View style={styles.reportMetricBox}>
                      <View style={styles.reportMetricHeader}>
                        <Ionicons name="alert-circle" size={15} color={colors.danger} />
                        <Text style={styles.reportMetricLabel}>Total Relapses</Text>
                      </View>
                      <Text style={styles.reportMetricValue}>
                        {selectedHabitStats.totalLogged}
                        <Text style={styles.reportMetricUnit}> {selectedHabitStats.behaviorUnit}</Text>
                      </Text>
                      <Text style={styles.reportMetricSubtext}>
                        {selectedHabitStats.logCount} occurrences logged
                      </Text>
                    </View>
                  </View>

                  {/* Clean Adherence Progress Bar */}
                  <View style={styles.adherenceProgressWrapper}>
                    <View style={styles.adherenceProgressLabels}>
                      <Text style={styles.adherenceLabel}>Clean Days Adherence</Text>
                      <Text style={styles.adherencePercent}>
                        {selectedHabitStats.cleanRate}%
                      </Text>
                    </View>
                    <View style={styles.adherenceTrack}>
                      <View
                        style={[
                          styles.adherenceFill,
                          { width: `${Math.min(100, Math.max(0, selectedHabitStats.cleanRate))}%` },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              ) : (
                <View style={[styles.clayCard, styles.emptyDeepDiveCard]}>
                  <Text style={styles.emptyPromptText}>Select a habit above to view details</Text>
                </View>
              )}
            </View>

            {/* ======================================================== */}
            {/* SECTION 3: YEAR SELECTOR & 4x3 MONTH MATRIX GRID         */}
            {/* ======================================================== */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={styles.sectionTitle}>Yearly Calendar Matrix</Text>
                  <Text style={styles.sectionSubtitle}>
                    12-month overview of bad habit relapse patterns
                  </Text>
                </View>
              </View>

              {/* Year Selector Tabs */}
              <View style={styles.yearTabsRow}>
                {availableYears.map((yr) => {
                  const isSelected = yr === selectedMatrixYear;
                  return (
                    <TouchableOpacity
                      key={yr}
                      style={[styles.yearTab, isSelected && styles.yearTabActive]}
                      onPress={() => {
                        setSelectedMatrixYear(yr);
                        loadYearMatrix(yr);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.yearTabText, isSelected && styles.yearTabTextActive]}>
                        {yr}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Matrix Card */}
              <View style={[styles.clayCard, styles.matrixCard]}>
                {/* Executive Year KPI Row */}
                <View style={styles.matrixKpiRow}>
                  <View style={styles.matrixKpiItem}>
                    <Text style={styles.matrixKpiLabel}>Clean Days</Text>
                    <Text style={[styles.matrixKpiVal, styles.valGreen]}>
                      {yearMatrix?.yearCleanDays ?? 0}
                    </Text>
                  </View>
                  <View style={styles.matrixKpiDivider} />
                  <View style={styles.matrixKpiItem}>
                    <Text style={styles.matrixKpiLabel}>Relapse Occurrences</Text>
                    <Text style={[styles.matrixKpiVal, (yearMatrix?.yearTotalRelapses ?? 0) > 0 ? styles.valAmber : styles.valGreen]}>
                      {yearMatrix?.yearTotalRelapses ?? 0}
                    </Text>
                  </View>
                </View>

                {/* 4 Columns x 3 Rows = 12 Month Grid */}
                <View style={styles.matrixGrid}>
                  {yearMatrix?.months.map((m) => {
                    const currentYear = new Date().getFullYear();
                    const currentMonth = new Date().getMonth() + 1;
                    const isFuture =
                      yearMatrix.year > currentYear ||
                      (yearMatrix.year === currentYear && m.month > currentMonth);
                    const isCurrent =
                      yearMatrix.year === currentYear && m.month === currentMonth;

                    return (
                      <TouchableOpacity
                        key={m.month}
                        style={[
                          styles.monthBox,
                          isCurrent && styles.monthBoxCurrent,
                          isFuture && styles.monthBoxFuture,
                        ]}
                        onPress={() => setInspectedMonth(m)}
                        activeOpacity={0.7}
                      >
                        {/* Month Header */}
                        <View style={styles.monthBoxHeader}>
                          <Text
                            style={[
                              styles.monthBoxName,
                              isCurrent && styles.monthBoxNameCurrent,
                            ]}
                          >
                            {m.monthName}
                          </Text>
                          {isCurrent && <View style={styles.currentMonthDot} />}
                        </View>

                        {/* Content inside Box */}
                        <View style={styles.monthBoxBody}>
                          {isFuture ? (
                            <Text style={styles.monthFutureText}>—</Text>
                          ) : m.isAllClean ? (
                            <View style={styles.cleanMonthBadge}>
                              <Ionicons name="sparkles" size={11} color={colors.accentPrimary} />
                              <Text style={styles.cleanMonthBadgeText}>Clean</Text>
                            </View>
                          ) : m.habits.length > 0 ? (
                            <View style={styles.habitChipsContainer}>
                              {m.habits.slice(0, 3).map((h) => (
                                <View key={h.habitId} style={styles.matrixHabitPill}>
                                  <View
                                    style={[styles.matrixHabitDot, { backgroundColor: h.color }]}
                                  />
                                  <Text style={styles.matrixHabitText} numberOfLines={1}>
                                    {h.shortCode}:{h.totalQuantity}
                                  </Text>
                                </View>
                              ))}
                              {m.habits.length > 3 && (
                                <Text style={styles.matrixMoreText}>
                                  +{m.habits.length - 3}
                                </Text>
                              )}
                            </View>
                          ) : (
                            <Text style={styles.monthNoDataText}>No logs</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* ======================================================== */}
            {/* SECTION 4: CUSTOM QUERY & PERIOD DISTRIBUTION             */}
            {/* ======================================================== */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Custom Period Analysis</Text>
                  <Text style={styles.sectionSubtitle}>
                    Inspect relapse volume and triggers for any date range
                  </Text>
                </View>
                {/* <TouchableOpacity
                  style={styles.customFilterHeaderBtn}
                  onPress={handleOpenCustomPicker}
                  activeOpacity={0.7}
                >
                  <Ionicons name="options-outline" size={15} color={colors.accentPrimary} />
                  <Text style={styles.customFilterHeaderText}>Custom Scope</Text>
                </TouchableOpacity> */}
              </View>

              {/* Range & Scope Interactive Glass Banner */}
              <TouchableOpacity
                style={styles.customRangeBanner}
                onPress={handleOpenCustomPicker}
                activeOpacity={0.75}
              >
                <View style={styles.customRangeBannerLeft}>
                  <View style={styles.customRangeIconBox}>
                    <Ionicons name="calendar" size={16} color={colors.accentPrimary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.customRangeHeadline}>
                      {customStats?.formattedRange ||
                        `${formatDateFriendly(customFromDate)} – ${formatDateFriendly(customToDate)}`}
                    </Text>
                    <Text style={styles.customRangeMeta}>
                      {getDaysBetween(customFromDate, customToDate)} Days •{' '}
                      {selectedFilterHabitIds.length === 0
                        ? `All Habits (${behaviors.length})`
                        : `${selectedFilterHabitIds.length} of ${behaviors.length} Habits selected`}
                    </Text>
                  </View>
                </View>
                <View style={styles.customRangeEditBadge}>
                  <Text style={styles.customRangeEditText}>Edit</Text>
                  <Ionicons name="chevron-forward" size={13} color={colors.accentPrimary} />
                </View>
              </TouchableOpacity>

              {/* Preset Selector Chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.presetsRow}
              >
                {(
                  [
                    { key: '7D', label: 'Last 7D' },
                    { key: '30D', label: 'Last 30D' },
                    { key: 'THIS_MONTH', label: 'This Month' },
                    { key: '90D', label: 'Last 90D' },
                    { key: 'THIS_YEAR', label: 'This Year' },
                    { key: 'CUSTOM', label: 'Custom...' },
                  ] as { key: PeriodPreset; label: string }[]
                ).map((preset) => {
                  const isSelected = periodPreset === preset.key;
                  return (
                    <TouchableOpacity
                      key={preset.key}
                      style={[styles.presetTab, isSelected && styles.presetTabActive]}
                      onPress={() => handleSelectPreset(preset.key)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.presetTabText, isSelected && styles.presetTabTextActive]}>
                        {preset.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Multi-Habit Filter Chips Row (Inline 1-Tap Toggle) */}
              {behaviors.length > 0 && (
                <View style={styles.inlineHabitsContainer}>
                  <View style={styles.inlineHabitsHeader}>
                    <View style={styles.inlineHabitsHeaderLeft}>
                      <Ionicons name="filter" size={12} color={colors.accentPrimary} />
                      <Text style={styles.inlineHabitsTitle}>HABIT FOCUS</Text>
                    </View>
                    <Text style={styles.inlineHabitsSubtext}>
                      {selectedFilterHabitIds.length === 0
                        ? 'All habits included'
                        : `${selectedFilterHabitIds.length} habit${selectedFilterHabitIds.length > 1 ? 's' : ''} filtered`}
                    </Text>
                  </View>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.inlineHabitsRow}
                  >
                    <TouchableOpacity
                      style={[
                        styles.inlineHabitChip,
                        selectedFilterHabitIds.length === 0 && styles.inlineHabitChipAllActive,
                      ]}
                      onPress={handleSelectAllHabitsInline}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="layers"
                        size={13}
                        color={
                          selectedFilterHabitIds.length === 0
                            ? colors.textInverse
                            : colors.textSecondary
                        }
                      />
                      <Text
                        style={[
                          styles.inlineHabitChipText,
                          selectedFilterHabitIds.length === 0 && styles.inlineHabitChipTextAllActive,
                        ]}
                      >
                        All ({behaviors.length})
                      </Text>
                    </TouchableOpacity>

                    {behaviors.map((b) => {
                      const isExplicit = selectedFilterHabitIds.includes(b.id);
                      const isIncluded = selectedFilterHabitIds.length === 0 || isExplicit;

                      return (
                        <TouchableOpacity
                          key={b.id}
                          style={[
                            styles.inlineHabitChip,
                            isExplicit && styles.inlineHabitChipActive,
                            selectedFilterHabitIds.length > 0 &&
                              !isExplicit &&
                              styles.inlineHabitChipDimmed,
                          ]}
                          onPress={() => handleToggleHabitFilterInline(b.id)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.inlineHabitChipIcon}>
                            {getHabitIconComponent(
                              b.name,
                              13,
                              isExplicit
                                ? colors.accentPrimary
                                : isIncluded
                                ? colors.textSecondary
                                : colors.textTertiary
                            )}
                          </View>
                          <Text
                            style={[
                              styles.inlineHabitChipText,
                              isExplicit && styles.inlineHabitChipTextActive,
                              selectedFilterHabitIds.length > 0 &&
                                !isExplicit &&
                                styles.inlineHabitChipTextDimmed,
                            ]}
                          >
                            {b.nickname || b.name}
                          </Text>
                          {isExplicit && (
                            <Ionicons
                              name="checkmark-circle"
                              size={13}
                              color={colors.accentPrimary}
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Period Analytics Card */}
              {isLoadingCustom ? (
                <View style={[styles.clayCard, styles.customLoadingCard]}>
                  <ActivityIndicator size="small" color={colors.accentPrimary} />
                  <Text style={styles.customLoadingText}>Analyzing custom scope & habits...</Text>
                </View>
              ) : customStats ? (
                <View style={[styles.clayCard, styles.customReportCard]}>
                  {/* Period Banner */}
                  <View style={styles.customBanner}>
                    <View style={styles.customBannerLeft}>
                      <Ionicons name="calendar" size={16} color={colors.accentPrimary} />
                      <Text style={styles.customRangeText}>{customStats.formattedRange}</Text>
                    </View>
                    <View style={styles.customBannerRight}>
                      {selectedFilterHabitIds.length > 0 && (
                        <View style={styles.customScopePill}>
                          <Text style={styles.customScopeText}>
                            {selectedFilterHabitIds.length} habits
                          </Text>
                        </View>
                      )}
                      <View style={styles.customTotalPill}>
                        <Text style={styles.customTotalText}>
                          {customStats.totalRelapseQuantity} relapses
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* 3 Executive Metric Pillars */}
                  <View style={styles.customPillarsRow}>
                    <View style={styles.customPillar}>
                      <Text style={[styles.customPillarVal, styles.valGreen]}>
                        {customStats.cleanDays}
                      </Text>
                      <Text style={styles.customPillarLabel}>Clean Days</Text>
                    </View>
                    <View style={styles.customPillarDivider} />
                    <View style={styles.customPillar}>
                      <Text style={[styles.customPillarVal, customStats.relapseDays > 0 ? styles.valAmber : styles.valGreen]}>
                        {customStats.relapseDays}
                      </Text>
                      <Text style={styles.customPillarLabel}>Relapse Days</Text>
                    </View>
                    <View style={styles.customPillarDivider} />
                    <View style={styles.customPillar}>
                      <Text style={styles.customPillarVal}>
                        {customStats.cleanRate}%
                      </Text>
                      <Text style={styles.customPillarLabel}>Clean Rate</Text>
                    </View>
                  </View>

                  {/* Bad Habit Relapse Share (Donut / Proportion Bar) */}
                  {customStats.habitBreakdown.length > 0 && customStats.totalRelapseQuantity > 0 && (
                    <View style={styles.habitShareSection}>
                      <Text style={styles.subCardTitle}>Relapse Share Proportion</Text>
                      <Text style={styles.subCardCaption}>
                        {selectedFilterHabitIds.length > 0
                          ? 'Relative distribution among selected habits'
                          : 'Which bad habits dominated this period'}
                      </Text>

                      {/* Stacked Proportional Bar */}
                      <View style={styles.stackedBarTrack}>
                        {customStats.habitBreakdown.map((h) => {
                          if (h.percentage <= 0) return null;
                          return (
                            <View
                              key={h.id}
                              style={[
                                styles.stackedBarSegment,
                                { flex: h.percentage, backgroundColor: h.color },
                              ]}
                            />
                          );
                        })}
                      </View>

                      {/* Legend List */}
                      <View style={styles.shareList}>
                        {customStats.habitBreakdown.map((h) => (
                          <View key={h.id} style={styles.shareRow}>
                            <View style={styles.shareRowLeft}>
                              <View style={[styles.legendColorDot, { backgroundColor: h.color }]} />
                              <Text style={styles.shareHabitName}>{h.name}</Text>
                            </View>
                            <View style={styles.shareRowRight}>
                              <Text style={styles.shareHabitVal}>
                                {h.totalQuantity} {h.unit}
                              </Text>
                              <View style={styles.sharePctBadge}>
                                <Text style={styles.sharePctText}>{h.percentage}%</Text>
                              </View>
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Day-of-Week Impulse Trigger Pattern */}
                  <View style={styles.dowSection}>
                    <Text style={styles.subCardTitle}>Day-of-Week Trigger Pattern</Text>
                    <Text style={styles.subCardCaption}>
                      Highlights which days bad habit impulses occur most
                    </Text>

                    <View style={styles.dowBarsRow}>
                      {customStats.dayOfWeekDistribution.map((dow) => {
                        const maxDow = Math.max(
                          ...customStats.dayOfWeekDistribution.map((d) => d.total),
                          1
                        );
                        const barH = dow.total > 0
                          ? Math.max(8, Math.round((dow.total / maxDow) * 60))
                          : 3;
                        const isPeak = dow.total === maxDow && dow.total > 0;

                        return (
                          <View key={dow.dayName} style={styles.dowCol}>
                            <Text style={[styles.dowCountText, isPeak && styles.dowCountPeak]}>
                              {dow.total > 0 ? dow.total : '—'}
                            </Text>
                            <View style={styles.dowTrack}>
                              <View
                                style={[
                                  styles.dowFill,
                                  { height: barH },
                                  isPeak && styles.dowFillPeak,
                                ]}
                              />
                            </View>
                            <Text style={[styles.dowNameText, isPeak && styles.dowNamePeak]}>
                              {dow.dayName}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                </View>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>

      {/* ======================================================== */}
      {/* MODAL 1: MONTH DETAIL BREAKDOWN MODAL                     */}
      {/* ======================================================== */}
      <Modal
        visible={inspectedMonth !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setInspectedMonth(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setInspectedMonth(null)} />
          <View style={styles.monthModalCard}>
            <View style={styles.monthModalHeader}>
              <View>
                <Text style={styles.monthModalTitle}>
                  {inspectedMonth?.monthName} {inspectedMonth?.year} Report
                </Text>
                <Text style={styles.monthModalSubtitle}>
                  {inspectedMonth?.daysInMonth} days in month
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setInspectedMonth(null)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Month Summary Pillars */}
            <View style={styles.monthModalPillars}>
              <View style={styles.monthModalPillar}>
                <Text style={[styles.monthModalVal, styles.valGreen]}>
                  {inspectedMonth?.cleanDaysCount}
                </Text>
                <Text style={styles.monthModalLabel}>Clean Days</Text>
              </View>
              <View style={styles.monthModalPillar}>
                <Text style={[styles.monthModalVal, (inspectedMonth?.totalRelapses ?? 0) > 0 ? styles.valAmber : styles.valGreen]}>
                  {inspectedMonth?.totalRelapses}
                </Text>
                <Text style={styles.monthModalLabel}>Relapses</Text>
              </View>
            </View>

            {/* Habits in this month */}
            <Text style={styles.monthHabitsHeader}>Habit Breakdown</Text>
            {inspectedMonth?.habits && inspectedMonth.habits.length > 0 ? (
              <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
                {inspectedMonth.habits.map((h) => (
                  <View key={h.habitId} style={styles.monthHabitRow}>
                    <View style={styles.monthHabitLeft}>
                      <View style={[styles.legendColorDot, { backgroundColor: h.color }]} />
                      <Text style={styles.monthHabitName}>{h.habitName}</Text>
                    </View>
                    <Text style={styles.monthHabitTotal}>
                      +{h.totalQuantity}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.monthCleanAlert}>
                <Ionicons name="shield-checkmark" size={20} color={colors.accentPrimary} />
                <Text style={styles.monthCleanAlertText}>
                  100% clean month with zero recorded relapses!
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.modalDismissBtn}
              onPress={() => setInspectedMonth(null)}
            >
              <Text style={styles.modalDismissBtnText}>Close Report</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 2: CUSTOM DATE RANGE & MULTI-HABIT PICKER MODAL    */}
      {/* ======================================================== */}
      <Modal
        visible={isCustomPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCustomPickerOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setIsCustomPickerOpen(false)} />
          <View style={styles.pickerModalCard}>
            {/* Modal Header */}
            <View style={styles.pickerModalHeader}>
              <View style={styles.pickerModalHeaderLeft}>
                <View style={styles.pickerModalBadge}>
                  <Ionicons name="filter" size={12} color={colors.accentPrimary} />
                  <Text style={styles.pickerModalBadgeText}>CUSTOM SCOPE</Text>
                </View>
                <Text style={styles.pickerModalTitle}>Period & Habit Filter</Text>
                <Text style={styles.pickerModalSubtitle}>
                  Choose arbitrary dates & select any combination of habits
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsCustomPickerOpen(false)}
                style={styles.modalCloseBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.pickerModalScroll}
              contentContainerStyle={styles.pickerModalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* SECTION A: DATE PRESETS */}
              <View style={styles.pickerSectionBlock}>
                <View style={styles.pickerSectionTitleRow}>
                  <Text style={styles.pickerSectionTitle}>DATE RANGE PRESETS</Text>
                  <Text style={styles.pickerSectionHint}>Quick Jump</Text>
                </View>
                <View style={styles.pickerPresetsGrid}>
                  {[
                    { key: '7D', label: '7 Days' },
                    { key: '14D', label: '14 Days' },
                    { key: '30D', label: '30 Days' },
                    { key: 'THIS_MONTH', label: 'This Month' },
                    { key: 'LAST_MONTH', label: 'Last Month' },
                    { key: '90D', label: '90 Days' },
                    { key: 'THIS_YEAR', label: 'This Year' },
                    { key: 'ALL_TIME', label: 'All-Time (1Y)' },
                  ].map((p) => (
                    <TouchableOpacity
                      key={p.key}
                      style={styles.pickerPresetBtn}
                      onPress={() => handleApplyModalPreset(p.key)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.pickerPresetBtnText}>{p.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* SECTION B: DATE BRIDGE VISUALIZER & STEPPERS */}
              <View style={styles.pickerSectionBlock}>
                <View style={styles.pickerSectionTitleRow}>
                  <Text style={styles.pickerSectionTitle}>CALENDAR WINDOW</Text>
                  <View style={styles.pickerDurationBadge}>
                    <Ionicons name="time-outline" size={12} color={colors.accentPrimary} />
                    <Text style={styles.pickerDurationText}>
                      {getDaysBetween(pickerFromInput, pickerToInput)} Days
                    </Text>
                  </View>
                </View>

                {/* Visual Bridge */}
                <View style={styles.dateBridgeCard}>
                  {/* From Date Box */}
                  <TouchableOpacity
                    style={[
                      styles.dateBox,
                      datePickerTarget === 'from' && isDatePickerPopupOpen && styles.dateBoxActiveHighlight,
                    ]}
                    onPress={() => handleOpenDatePickerPopup('from')}
                    activeOpacity={0.8}
                  >
                    <View style={styles.dateBoxHeader}>
                      <Text style={styles.dateBoxLabel}>START DATE</Text>
                      {/* <View style={styles.dateBoxCalBadge}>
                        <Ionicons name="calendar" size={11} color={colors.accentPrimary} />
                        <Text style={styles.dateBoxCalBadgeText}>Calendar</Text>
                      </View> */}
                    </View>
                    <Text style={styles.dateBoxMainDate} numberOfLines={1}>
                      {formatDateFriendly(pickerFromInput)}
                    </Text>
                    {/* <TextInput
                      style={styles.dateBoxInput}
                      value={pickerFromInput}
                      onChangeText={setPickerFromInput}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.textTertiary}
                      maxLength={10}
                    /> */}
                  </TouchableOpacity>

                  {/* Bridge Arrow */}
                  <View style={styles.dateBridgeConnector}>
                    <Ionicons name="arrow-forward" size={16} color={colors.accentPrimary} />
                  </View>

                  {/* To Date Box */}
                  <TouchableOpacity
                    style={[
                      styles.dateBox,
                      datePickerTarget === 'to' && isDatePickerPopupOpen && styles.dateBoxActiveHighlight,
                    ]}
                    onPress={() => handleOpenDatePickerPopup('to')}
                    activeOpacity={0.8}
                  >
                    <View style={styles.dateBoxHeader}>
                      <Text style={styles.dateBoxLabel}>END DATE</Text>
                      {/* <View style={styles.dateBoxCalBadge}>
                        <Ionicons name="calendar" size={11} color={colors.accentPrimary} />
                        <Text style={styles.dateBoxCalBadgeText}>Calendar</Text>
                      </View> */}
                    </View>
                    <Text style={styles.dateBoxMainDate} numberOfLines={1}>
                      {formatDateFriendly(pickerToInput)}
                    </Text>
                    {/* <TextInput
                      style={styles.dateBoxInput}
                      value={pickerToInput}
                      onChangeText={setPickerToInput}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.textTertiary}
                      maxLength={10}
                    /> */}
                  </TouchableOpacity>
                </View>

                {/* Interactive Calendar Launcher Button */}
                {/* <TouchableOpacity
                  style={styles.openCalendarFullBtn}
                  onPress={() => handleOpenDatePickerPopup('from')}
                  activeOpacity={0.75}
                >
                  <View style={styles.openCalendarFullLeft}>
                    <Ionicons name="calendar" size={15} color={colors.accentPrimary} />
                    <Text style={styles.openCalendarFullText}>
                      Pick via Calendar (Year, Month & Day)
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={colors.accentPrimary} />
                </TouchableOpacity> */}
              </View>

              {/* SECTION C: MULTI-HABIT SELECTOR */}
              <View style={styles.pickerSectionBlock}>
                <View style={styles.pickerSectionTitleRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.pickerSectionTitle}>SELECT HABITS</Text>
                    <View style={styles.habitCountBadge}>
                      <Text style={styles.habitCountBadgeText}>
                        {pickerSelectedHabitIds.length} of {behaviors.length}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.habitActionBtnsRow}>
                    <TouchableOpacity
                      onPress={handleSelectAllModalHabits}
                      style={styles.habitActionBtn}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.habitActionBtnText}>All</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleInvertModalHabits}
                      style={styles.habitActionBtn}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.habitActionBtnText}>Invert</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Habit Multi-Select Items List */}
                <View style={styles.modalHabitsList}>
                  {behaviors.map((b) => {
                    const isChecked = pickerSelectedHabitIds.includes(b.id);
                    return (
                      <TouchableOpacity
                        key={b.id}
                        style={[
                          styles.modalHabitCard,
                          isChecked && styles.modalHabitCardChecked,
                        ]}
                        onPress={() => handleToggleModalHabit(b.id)}
                        activeOpacity={0.75}
                      >
                        <View style={styles.modalHabitCardLeft}>
                          <View
                            style={[
                              styles.modalHabitIconContainer,
                              isChecked && styles.modalHabitIconContainerChecked,
                            ]}
                          >
                            {getHabitIconComponent(
                              b.name,
                              18,
                              isChecked ? colors.accentPrimary : colors.textTertiary
                            )}
                          </View>
                          <View style={styles.modalHabitMeta}>
                            <Text
                              style={[
                                styles.modalHabitName,
                                isChecked && styles.modalHabitNameChecked,
                              ]}
                              numberOfLines={1}
                            >
                              {b.nickname || b.name}
                            </Text>
                            <Text style={styles.modalHabitUnit}>
                              Tracked unit: {b.unit || 'times'}
                            </Text>
                          </View>
                        </View>

                        <View
                          style={[
                            styles.modalHabitCheckWrap,
                            isChecked && styles.modalHabitCheckWrapChecked,
                          ]}
                        >
                          <Ionicons
                            name={isChecked ? 'checkmark' : 'close'}
                            size={14}
                            color={isChecked ? colors.textInverse : colors.textTertiary}
                          />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            {/* Modal Bottom CTA Footer */}
            <View style={styles.pickerModalFooter}>
              <TouchableOpacity
                style={styles.pickerResetBtn}
                onPress={handleResetCustomPicker}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh" size={15} color={colors.textSecondary} />
                <Text style={styles.pickerResetText}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.pickerApplyBtn}
                onPress={handleApplyCustomPicker}
                activeOpacity={0.8}
              >
                <Ionicons name="analytics" size={17} color={colors.textInverse} />
                <Text style={styles.pickerApplyBtnText}>
                  Apply Filter ({getDaysBetween(pickerFromInput, pickerToInput)}D •{' '}
                  {pickerSelectedHabitIds.length} Habits)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 3: CALENDAR POPUP DATE PICKER (YEAR/MONTH/DAY)     */}
      {/* ======================================================== */}
      <Modal
        visible={isDatePickerPopupOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDatePickerPopupOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setIsDatePickerPopupOpen(false)} />
          <View style={styles.calPickerModalCard}>
            {/* Top Bar: Target Switcher (Start Date vs End Date) + Close */}
            <View style={styles.calPickerTopBar}>
              <View style={styles.calPickerTargetTabs}>
                <TouchableOpacity
                  style={[
                    styles.calTargetTab,
                    datePickerTarget === 'from' && styles.calTargetTabActive,
                  ]}
                  onPress={() => {
                    setDatePickerTarget('from');
                    setIsMonthYearPickerOpen(false);
                    try {
                      const [y, m] = pickerFromInput.split('-').map(Number);
                      if (y && m) setCalendarViewDate(new Date(y, m - 1, 1));
                    } catch {}
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.calTargetTabLabel,
                      datePickerTarget === 'from' && styles.calTargetTabLabelActive,
                    ]}
                  >
                    Start Date
                  </Text>
                  <Text
                    style={[
                      styles.calTargetTabDate,
                      datePickerTarget === 'from' && styles.calTargetTabDateActive,
                    ]}
                    numberOfLines={1}
                  >
                    {pickerFromInput}
                  </Text>
                </TouchableOpacity>

                <View style={styles.calTargetDivider}>
                  <Ionicons name="arrow-forward" size={12} color={colors.textTertiary} />
                </View>

                <TouchableOpacity
                  style={[
                    styles.calTargetTab,
                    datePickerTarget === 'to' && styles.calTargetTabActive,
                  ]}
                  onPress={() => {
                    setDatePickerTarget('to');
                    setIsMonthYearPickerOpen(false);
                    try {
                      const [y, m] = pickerToInput.split('-').map(Number);
                      if (y && m) setCalendarViewDate(new Date(y, m - 1, 1));
                    } catch {}
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.calTargetTabLabel,
                      datePickerTarget === 'to' && styles.calTargetTabLabelActive,
                    ]}
                  >
                    End Date
                  </Text>
                  <Text
                    style={[
                      styles.calTargetTabDate,
                      datePickerTarget === 'to' && styles.calTargetTabDateActive,
                    ]}
                    numberOfLines={1}
                  >
                    {pickerToInput}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() => setIsDatePickerPopupOpen(false)}
                style={styles.calCloseBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Sub-Header: Month & Year Selector Header */}
            <View style={styles.calMonthYearHeader}>
              <TouchableOpacity
                style={styles.calNavArrowBtn}
                onPress={handlePrevCalendarMonth}
                disabled={isMonthYearPickerOpen}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="chevron-back"
                  size={18}
                  color={isMonthYearPickerOpen ? colors.textTertiary : colors.textPrimary}
                />
              </TouchableOpacity>

              {/* Center Button: Month & Year Selector Trigger */}
              <TouchableOpacity
                style={[
                  styles.calMonthYearTitleBtn,
                  isMonthYearPickerOpen && styles.calMonthYearTitleBtnActive,
                ]}
                onPress={() => setIsMonthYearPickerOpen((prev) => !prev)}
                activeOpacity={0.75}
              >
                <Text style={styles.calMonthYearTitleText}>
                  {CAL_MONTH_NAMES[calendarViewDate.getMonth()]} {calendarViewDate.getFullYear()}
                </Text>
                <Ionicons
                  name={isMonthYearPickerOpen ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={colors.accentPrimary}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.calNavArrowBtn}
                onPress={handleNextCalendarMonth}
                disabled={isMonthYearPickerOpen}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={isMonthYearPickerOpen ? colors.textTertiary : colors.textPrimary}
                />
              </TouchableOpacity>
            </View>

            {/* BODY: EITHER MONTH/YEAR PICKER OR CALENDAR DAYS GRID */}
            {isMonthYearPickerOpen ? (
              <View style={styles.monthYearPickerContainer}>
                {/* Year Selector */}
                <View style={styles.yearSelectorSection}>
                  <Text style={styles.myPickerSectionLabel}>SELECT YEAR</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.yearChipsRow}
                  >
                    {availableCalendarYears.map((yr) => {
                      const isSelected = yr === calendarViewDate.getFullYear();
                      return (
                        <TouchableOpacity
                          key={yr}
                          style={[
                            styles.yearChip,
                            isSelected && styles.yearChipSelected,
                          ]}
                          onPress={() => handleSelectCalendarYear(yr)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.yearChipText,
                              isSelected && styles.yearChipTextSelected,
                            ]}
                          >
                            {yr}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* 12 Months Grid */}
                <View style={styles.monthsGridSection}>
                  <Text style={styles.myPickerSectionLabel}>SELECT MONTH</Text>
                  <View style={styles.monthsGrid}>
                    {CAL_MONTH_SHORT_NAMES.map((name, idx) => {
                      const isSelected = idx === calendarViewDate.getMonth();
                      return (
                        <TouchableOpacity
                          key={name}
                          style={[
                            styles.monthSelectBox,
                            isSelected && styles.monthSelectBoxSelected,
                          ]}
                          onPress={() => handleSelectCalendarMonth(idx)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.monthSelectBoxText,
                              isSelected && styles.monthSelectBoxTextSelected,
                            ]}
                          >
                            {name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.daysGridContainer}>
                {/* 7-Day Weekday Headers */}
                <View style={styles.calWeekdaysRow}>
                  {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
                    <View key={d} style={styles.calWeekdayCol}>
                      <Text style={styles.calWeekdayText}>{d}</Text>
                    </View>
                  ))}
                </View>

                {/* Days Matrix */}
                <View style={styles.calDaysMatrix}>
                  {calendarGrid.map((cell) => {
                    const isTargetActive =
                      datePickerTarget === 'from' ? cell.isSelectedFrom : cell.isSelectedTo;
                    const isStart = cell.isSelectedFrom;
                    const isEnd = cell.isSelectedTo;

                    return (
                      <TouchableOpacity
                        key={cell.dateStr}
                        style={[
                          styles.calDayCell,
                          cell.isInRange && styles.calDayCellInRange,
                          isStart && styles.calDayCellRangeStart,
                          isEnd && styles.calDayCellRangeEnd,
                        ]}
                        onPress={() => handleSelectCalendarCellDate(cell.dateStr)}
                        activeOpacity={0.6}
                      >
                        <View
                          style={[
                            styles.calDayCircle,
                            isTargetActive && styles.calDayCircleActive,
                            !isTargetActive && (isStart || isEnd) && styles.calDayCircleOtherActive,
                            cell.isToday && !isStart && !isEnd && styles.calDayCircleToday,
                          ]}
                        >
                          <Text
                            style={[
                              styles.calDayNumText,
                              !cell.isCurrentMonth && styles.calDayNumDimmed,
                              (isStart || isEnd) && styles.calDayNumActive,
                              cell.isToday && !isStart && !isEnd && styles.calDayNumToday,
                            ]}
                          >
                            {cell.dayNumber}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Footer */}
            <View style={styles.calPickerFooter}>
              <TouchableOpacity
                style={styles.calTodayShortcutBtn}
                onPress={handleJumpToTodayInCalendar}
                activeOpacity={0.7}
              >
                <Ionicons name="flash-outline" size={14} color={colors.accentPrimary} />
                <Text style={styles.calTodayShortcutText}>Jump to Today</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.calDoneBtn}
                onPress={() => setIsDatePickerPopupOpen(false)}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark" size={16} color={colors.textInverse} />
                <Text style={styles.calDoneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 16,
  },
  screenHeader: {
    marginBottom: 16,
  },
  headerTitleCol: {
    gap: 4,
  },
  headerBadgeRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  reportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: radii.full,
    backgroundColor: 'rgba(185, 246, 202, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(185, 246, 202, 0.3)',
  },
  reportBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accentPrimary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.6,
  },
  screenSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  loaderContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  loaderText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  clayCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  // Section 1: 7-Day Week Card
  weekCard: {
    padding: 14,
  },
  weekCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  cardHeaderRange: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 1,
  },
  weekNavButtonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  weekNavBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekNavBtnDisabled: {
    opacity: 0.35,
  },
  weekTodayPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(185, 246, 202, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(185, 246, 202, 0.3)',
  },
  weekTodayPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.accentPrimary,
  },
  habitsLegendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendColorDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendLabel: {
    fontSize: 11.5,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  chartWrapper: {
    marginTop: 4,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  dayColContainer: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    borderRadius: 12,
  },
  dayColContainerSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  dayTopIndicator: {
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  dayTopValText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brand.amber,
  },
  dayBarTrack: {
    width: 32,
    height: 90,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayBarTrackSelected: {
    borderColor: colors.accentPrimary,
    backgroundColor: 'rgba(185, 246, 202, 0.08)',
  },
  habitBarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  habitBarItem: {
    borderRadius: 3,
  },
  dayBottomLabels: {
    alignItems: 'center',
    marginTop: 6,
  },
  dayNameLabel: {
    fontSize: 10,
    color: colors.textTertiary,
    fontWeight: '600',
  },
  dayNumLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 1,
  },
  dayLabelToday: {
    color: colors.accentPrimary,
  },
  todayIndicatorDot: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: colors.accentPrimary,
    marginTop: 2,
  },
  dayInspectionCard: {
    marginTop: 12,
    padding: 10,
    borderRadius: 14,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  inspectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inspectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inspectionTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  inspectionList: {
    gap: 6,
  },
  inspectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inspectionHabitLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inspectionHabitName: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  inspectionHabitVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  valGreen: {
    color: colors.statusGreenDay,
  },
  valAmber: {
    color: colors.brand.amber,
  },
  emptyPrompt: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyPromptText: {
    fontSize: 12.5,
    color: colors.textTertiary,
  },
  // Section 2: Habit Report Cards
  habitSelectorRow: {
    gap: 8,
    paddingBottom: 10,
  },
  habitChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  habitChipSelected: {
    backgroundColor: 'rgba(185, 246, 202, 0.14)',
    borderColor: colors.accentPrimary,
  },
  habitChipIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  habitChipTextSelected: {
    color: colors.accentPrimary,
    fontWeight: '700',
  },
  deepDiveCard: {
    padding: 14,
  },
  deepDiveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  deepDiveTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deepDiveIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deepDiveHabitName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  deepDiveStartDate: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  statusPillClean: {
    backgroundColor: 'rgba(185, 246, 202, 0.1)',
    borderColor: 'rgba(185, 246, 202, 0.25)',
  },
  statusPillRelapsed: {
    backgroundColor: 'rgba(255, 159, 67, 0.1)',
    borderColor: 'rgba(255, 159, 67, 0.25)',
  },
  statusPillDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  reportMetricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  reportMetricBox: {
    width: '48.5%',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  reportMetricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  reportMetricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  reportMetricValue: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  reportMetricUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textTertiary,
  },
  reportMetricSubtext: {
    fontSize: 10,
    color: colors.textTertiary,
    marginTop: 2,
  },
  adherenceProgressWrapper: {
    marginTop: 2,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  adherenceProgressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  adherenceLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  adherencePercent: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.accentPrimary,
  },
  adherenceTrack: {
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.surfaceSubtle,
    overflow: 'hidden',
  },
  adherenceFill: {
    height: '100%',
    borderRadius: 3.5,
    backgroundColor: colors.accentPrimary,
  },
  emptyDeepDiveCard: {
    padding: 24,
    alignItems: 'center',
  },
  // Section 3: Year Selector & 4x3 Month Matrix
  yearTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  yearTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  yearTabActive: {
    backgroundColor: colors.accentPrimary,
    borderColor: colors.accentPrimary,
  },
  yearTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  yearTabTextActive: {
    color: colors.textInverse,
  },
  matrixCard: {
    padding: 12,
  },
  matrixKpiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  matrixKpiItem: {
    alignItems: 'center',
  },
  matrixKpiLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  matrixKpiVal: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  matrixKpiDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.borderSubtle,
  },
  matrixGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 6,
  },
  monthBox: {
    width: '23.5%',
    minHeight: 76,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(185, 246, 202, 0.2)',
    justifyContent: 'space-between',
  },
  monthBoxCurrent: {
    borderColor: colors.accentPrimary,
    backgroundColor: 'rgba(185, 246, 202, 0.06)',
  },
  monthBoxFuture: {
    opacity: 0.35,
    borderStyle: 'dashed',
  },
  monthBoxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthBoxName: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  monthBoxNameCurrent: {
    color: colors.accentPrimary,
  },
  currentMonthDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accentPrimary,
  },
  monthBoxBody: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  cleanMonthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(185, 246, 202, 0.15)',
    paddingHorizontal: 5,
    paddingVertical: 2.5,
    borderRadius: 8,
  },
  cleanMonthBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: colors.accentPrimary,
  },
  habitChipsContainer: {
    width: '100%',
    gap: 2,
  },
  matrixHabitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 6,
  },
  matrixHabitDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  matrixHabitText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  matrixMoreText: {
    fontSize: 8.5,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  monthFutureText: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  monthNoDataText: {
    fontSize: 9,
    color: colors.textTertiary,
  },
  // Section 4: Custom Query & Period Distribution
  presetsRow: {
    gap: 8,
    paddingBottom: 10,
  },
  customFilterHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(185, 246, 202, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(185, 246, 202, 0.3)',
  },
  customFilterHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accentPrimary,
  },
  // Custom Range Glass Banner
  customRangeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  customRangeBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  customRangeIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(185, 246, 202, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(185, 246, 202, 0.25)',
  },
  customRangeHeadline: {
    fontSize: 13.5,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  customRangeMeta: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  customRangeEditBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  customRangeEditText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.accentPrimary,
  },
  // Preset selector
  presetTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetTabActive: {
    backgroundColor: 'rgba(185, 246, 202, 0.15)',
    borderColor: colors.accentPrimary,
  },
  presetTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  presetTabTextActive: {
    color: colors.accentPrimary,
    fontWeight: '700',
  },
  // Inline multi-habit focus chips
  inlineHabitsContainer: {
    marginTop: 10,
    marginBottom: 6,
  },
  inlineHabitsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  inlineHabitsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  inlineHabitsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.accentPrimary,
    letterSpacing: 0.5,
  },
  inlineHabitsSubtext: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  inlineHabitsRow: {
    gap: 8,
    paddingVertical: 2,
  },
  inlineHabitChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inlineHabitChipAllActive: {
    backgroundColor: colors.accentPrimary,
    borderColor: colors.accentPrimary,
  },
  inlineHabitChipActive: {
    backgroundColor: 'rgba(185, 246, 202, 0.15)',
    borderColor: colors.accentPrimary,
  },
  inlineHabitChipDimmed: {
    opacity: 0.45,
    borderColor: colors.borderSubtle,
  },
  inlineHabitChipIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineHabitChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  inlineHabitChipTextAllActive: {
    color: colors.textInverse,
    fontWeight: '800',
  },
  inlineHabitChipTextActive: {
    color: colors.accentPrimary,
    fontWeight: '700',
  },
  inlineHabitChipTextDimmed: {
    color: colors.textTertiary,
  },
  // Custom Report Card
  customLoadingCard: {
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  customLoadingText: {
    fontSize: 12.5,
    color: colors.textSecondary,
  },
  customReportCard: {
    padding: 14,
  },
  customBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  customBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  customBannerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  customRangeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  customScopePill: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 10,
    backgroundColor: 'rgba(185, 246, 202, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(185, 246, 202, 0.25)',
  },
  customScopeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accentPrimary,
  },
  customTotalPill: {
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 159, 67, 0.14)',
  },
  customTotalText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand.amber,
  },
  customPillarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  customPillar: {
    alignItems: 'center',
  },
  customPillarVal: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  customPillarLabel: {
    fontSize: 10.5,
    color: colors.textTertiary,
    marginTop: 2,
  },
  customPillarDivider: {
    width: 1,
    height: 22,
    backgroundColor: colors.borderSubtle,
  },
  habitShareSection: {
    marginBottom: 14,
  },
  subCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subCardCaption: {
    fontSize: 11,
    color: colors.textTertiary,
    marginBottom: 8,
  },
  stackedBarTrack: {
    height: 9,
    borderRadius: 4.5,
    backgroundColor: colors.surfaceSubtle,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 10,
  },
  stackedBarSegment: {
    height: '100%',
  },
  shareList: {
    gap: 6,
  },
  shareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shareRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shareHabitName: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  shareRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shareHabitVal: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sharePctBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  sharePctText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  dowSection: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  dowBarsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 6,
  },
  dowCol: {
    flex: 1,
    alignItems: 'center',
  },
  dowCountText: {
    fontSize: 9.5,
    color: colors.textTertiary,
    fontWeight: '600',
    marginBottom: 4,
  },
  dowCountPeak: {
    color: colors.brand.amber,
    fontWeight: '800',
  },
  dowTrack: {
    width: 14,
    height: 64,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  dowFill: {
    width: '100%',
    borderRadius: 7,
    backgroundColor: 'rgba(185, 246, 202, 0.5)',
  },
  dowFillPeak: {
    backgroundColor: colors.brand.amber,
  },
  dowNameText: {
    fontSize: 10,
    color: colors.textTertiary,
    marginTop: 4,
  },
  dowNamePeak: {
    color: colors.brand.amber,
    fontWeight: '700',
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
  },
  monthModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  monthModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  monthModalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthModalPillars: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  monthModalPillar: {
    alignItems: 'center',
  },
  monthModalVal: {
    fontSize: 20,
    fontWeight: '900',
  },
  monthModalLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 2,
  },
  monthHabitsHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  monthHabitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  monthHabitLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthHabitName: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  monthHabitTotal: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.brand.amber,
  },
  monthCleanAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(185, 246, 202, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
  },
  monthCleanAlertText: {
    flex: 1,
    fontSize: 12.5,
    color: colors.textPrimary,
    lineHeight: 16,
  },
  modalDismissBtn: {
    marginTop: 14,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  modalDismissBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  // ========================================================
  // COOL CUSTOM PICKER MODAL STYLES
  // ========================================================
  pickerModalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '88%',
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(185, 246, 202, 0.25)',
    overflow: 'hidden',
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  pickerModalHeaderLeft: {
    flex: 1,
    paddingRight: 10,
  },
  pickerModalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(185, 246, 202, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  pickerModalBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: colors.accentPrimary,
    letterSpacing: 0.5,
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  pickerModalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  pickerModalScroll: {
    maxHeight: 460,
  },
  pickerModalScrollContent: {
    padding: 18,
    gap: 18,
  },
  pickerSectionBlock: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  pickerSectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pickerSectionTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.6,
  },
  pickerSectionHint: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  pickerPresetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerPresetBtn: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerPresetBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  pickerDurationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(185, 246, 202, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(185, 246, 202, 0.25)',
  },
  pickerDurationText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accentPrimary,
  },
  // Date Bridge Visualizer
  dateBridgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  dateBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateBoxLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: colors.textTertiary,
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  dateBoxInput: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    paddingVertical: 2,
    marginBottom: 8,
  },
  dateSteppersRow: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
  },
  stepperMiniBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 7,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  stepperMiniText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  stepperTodayBtn: {
    backgroundColor: 'rgba(185, 246, 202, 0.15)',
    borderColor: 'rgba(185, 246, 202, 0.3)',
  },
  stepperTodayText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accentPrimary,
  },
  dateBridgeConnector: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Multi-habit selector in modal
  habitCountBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  habitCountBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  habitActionBtnsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  habitActionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  habitActionBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.accentPrimary,
  },
  modalHabitsList: {
    gap: 8,
  },
  modalHabitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHabitCardChecked: {
    borderColor: colors.accentPrimary,
    backgroundColor: 'rgba(185, 246, 202, 0.06)',
  },
  modalHabitCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 8,
  },
  modalHabitIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  modalHabitIconContainerChecked: {
    backgroundColor: 'rgba(185, 246, 202, 0.12)',
    borderColor: 'rgba(185, 246, 202, 0.3)',
  },
  modalHabitMeta: {
    flex: 1,
  },
  modalHabitName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  modalHabitNameChecked: {
    color: colors.textPrimary,
  },
  modalHabitUnit: {
    fontSize: 10.5,
    color: colors.textTertiary,
    marginTop: 1,
  },
  modalHabitCheckWrap: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSubtle,
  },
  modalHabitCheckWrapChecked: {
    backgroundColor: colors.accentPrimary,
    borderColor: colors.accentPrimary,
  },
  // Modal Footer
  pickerModalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    backgroundColor: colors.surface,
  },
  pickerResetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  pickerResetText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  pickerApplyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.accentPrimary,
  },
  pickerApplyBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textInverse,
  },
  // Active highlight on date box
  dateBoxActiveHighlight: {
    borderColor: colors.accentPrimary,
    backgroundColor: 'rgba(185, 246, 202, 0.08)',
  },
  dateBoxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  dateBoxCalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(185, 246, 202, 0.12)',
  },
  dateBoxCalBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: colors.accentPrimary,
  },
  dateBoxMainDate: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  openCalendarFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(185, 246, 202, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(185, 246, 202, 0.25)',
  },
  openCalendarFullLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  openCalendarFullText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accentPrimary,
  },
  // ========================================================
  // CALENDAR POPUP DATE PICKER STYLES (MODAL 3)
  // ========================================================
  calPickerModalCard: {
    width: '100%',
    maxWidth: 390,
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(185, 246, 202, 0.3)',
    overflow: 'hidden',
  },
  calPickerTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    backgroundColor: colors.surfaceSubtle,
  },
  calPickerTargetTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  calTargetTab: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    flex: 1,
  },
  calTargetTabActive: {
    borderColor: colors.accentPrimary,
    backgroundColor: 'rgba(185, 246, 202, 0.12)',
  },
  calTargetTabLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: colors.textTertiary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  calTargetTabLabelActive: {
    color: colors.accentPrimary,
  },
  calTargetTabDate: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 1,
  },
  calTargetTabDateActive: {
    color: colors.textPrimary,
    fontWeight: '800',
  },
  calTargetDivider: {
    paddingHorizontal: 2,
  },
  calCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  calMonthYearHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  calNavArrowBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  calMonthYearTitleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  calMonthYearTitleBtnActive: {
    backgroundColor: 'rgba(185, 246, 202, 0.15)',
    borderColor: colors.accentPrimary,
  },
  calMonthYearTitleText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  // Month / Year Picker View
  monthYearPickerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 16,
  },
  yearSelectorSection: {},
  myPickerSectionLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: colors.textTertiary,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  yearChipsRow: {
    gap: 8,
    paddingVertical: 4,
  },
  yearChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  yearChipSelected: {
    backgroundColor: colors.accentPrimary,
    borderColor: colors.accentPrimary,
  },
  yearChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  yearChipTextSelected: {
    color: colors.textInverse,
    fontWeight: '900',
  },
  monthsGridSection: {},
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthSelectBox: {
    width: '23%',
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  monthSelectBoxSelected: {
    backgroundColor: colors.accentPrimary,
    borderColor: colors.accentPrimary,
  },
  monthSelectBoxText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  monthSelectBoxTextSelected: {
    color: colors.textInverse,
    fontWeight: '900',
  },
  // Calendar Days Grid View
  daysGridContainer: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  calWeekdaysRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  calWeekdayCol: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  calWeekdayText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textTertiary,
  },
  calDaysMatrix: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calDayCell: {
    width: `${100 / 7}%`,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 1,
  },
  calDayCellInRange: {
    backgroundColor: 'rgba(185, 246, 202, 0.12)',
  },
  calDayCellRangeStart: {
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    backgroundColor: 'rgba(185, 246, 202, 0.2)',
  },
  calDayCellRangeEnd: {
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    backgroundColor: 'rgba(185, 246, 202, 0.2)',
  },
  calDayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calDayCircleActive: {
    backgroundColor: colors.accentPrimary,
  },
  calDayCircleOtherActive: {
    backgroundColor: 'rgba(185, 246, 202, 0.85)',
  },
  calDayCircleToday: {
    borderWidth: 1.5,
    borderColor: colors.accentPrimary,
  },
  calDayNumText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  calDayNumDimmed: {
    color: colors.textTertiary,
    opacity: 0.35,
  },
  calDayNumActive: {
    color: colors.textInverse,
    fontWeight: '900',
  },
  calDayNumToday: {
    color: colors.accentPrimary,
    fontWeight: '800',
  },
  // Calendar Footer
  calPickerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    backgroundColor: colors.surfaceSubtle,
  },
  calTodayShortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(185, 246, 202, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(185, 246, 202, 0.25)',
  },
  calTodayShortcutText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accentPrimary,
  },
  calDoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.accentPrimary,
  },
  calDoneBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textInverse,
  },
});
