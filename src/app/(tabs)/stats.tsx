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
  return <MaterialCommunityIcons name="repeat" size={size} color={color} />;
}

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const { behaviors, todayEntries, getMultiHabitWeekData, getUnifiedStats } = useBehaviors();

  const todayStr = useMemo(() => toDayString(), []);
  const [weekAnchorDate, setWeekAnchorDate] = useState<string>(todayStr);

  const [weekData, setWeekData] = useState<MultiHabitWeekData | null>(null);
  const [unifiedStats, setUnifiedStats] = useState<UnifiedStatsData | null>(null);
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Set default selected habit
  useEffect(() => {
    if (behaviors.length > 0 && (!selectedHabitId || !behaviors.some((b) => b.id === selectedHabitId))) {
      setSelectedHabitId(behaviors[0].id);
    }
  }, [behaviors, selectedHabitId]);

  // Load 7-day multi-line chart data
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

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([loadWeekData(weekAnchorDate), loadStats()]);
    setIsLoading(false);
  }, [loadWeekData, loadStats, weekAnchorDate]);

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

  // Selected Habit Stats for Deep Dive
  const selectedHabitStats: HabitDeepDiveStats | undefined = useMemo(() => {
    if (!unifiedStats || !selectedHabitId) return undefined;
    return unifiedStats.habitStats.find((h) => h.behaviorId === selectedHabitId);
  }, [unifiedStats, selectedHabitId]);

  // Max value calculation for 7-day multi-line chart height
  const chartHeight = 120;
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
        {/* Header */}
        <View style={styles.screenHeader}>
          <View>
            <Text style={styles.screenTitle}>Stats</Text>
            <Text style={styles.screenSubtitle}>Trends, streaks, and habits breakdown</Text>
          </View>
        </View>

        {isLoading && !unifiedStats ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.brand.mint} />
            <Text style={styles.loaderText}>Compiling behavioral insights...</Text>
          </View>
        ) : (
          <>
            {/* ======================================================== */}
            {/* SECTION 1: 7-DAY MULTI-LINE BREAKDOWN (SCROLLABLE DATES) */}
            {/* ======================================================== */}
            <View style={styles.section}>
              <View style={[styles.clayCard, styles.weekCard]}>
                {/* Section 1 Header: Range & Pager Chevrons */}
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
                            {/* Day Total Header Badge */}
                            <View style={styles.dayTopIndicator}>
                              {dayTotal === 0 ? (
                                <Ionicons
                                  name="checkmark"
                                  size={12}
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
                              {/* Side-by-Side Habit Bars */}
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
                                        val > 0 && {
                                          shadowColor: habit.color,
                                          shadowOpacity: 0.35,
                                          shadowRadius: 3,
                                          shadowOffset: { width: 0, height: 1 },
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
                              {formatDateFriendly(selectedDayDate)} Breakdown
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
                                <View style={styles.inspectionLeft}>
                                  <View
                                    style={[styles.legendColorDot, { backgroundColor: h.color }]}
                                  />
                                  <Text style={styles.inspectionHabitName}>{h.name}</Text>
                                </View>
                                <Text
                                  style={[
                                    styles.inspectionHabitVal,
                                    val === 0 && { color: colors.statusGreenDay },
                                  ]}
                                >
                                  {val > 0 ? `+${val} ${h.unit}` : 'Clean (0)'}
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
                    <Text style={styles.emptyPromptText}>No habits currently tracked.</Text>
                  </View>
                )}
              </View>
            </View>

            {/* ======================================================== */}
            {/* SECTION 2: BEAUTIFUL KPI TILES & HABIT DEEP DIVE         */}
            {/* ======================================================== */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Overview & Records</Text>

              {/* 2x2 Tiles Grid */}
              <View style={styles.kpiGrid}>
                {/* Tile 1: Green Days This Month */}
                <View style={[styles.clayCard, styles.kpiTile]}>
                  <View style={styles.kpiTileTop}>
                    <View style={[styles.kpiIconBubble, { backgroundColor: 'rgba(185, 246, 202, 0.12)' }]}>
                      <Ionicons name="leaf" size={16} color={colors.statusGreenDay} />
                    </View>
                    <Text style={styles.kpiBadgeMint}>This Month</Text>
                  </View>
                  <Text style={styles.kpiBigNumber}>
                    {unifiedStats?.greenDaysMonth ?? 0}
                    <Text style={styles.kpiDenominator}> / {unifiedStats?.daysInMonth ?? 30}</Text>
                  </Text>
                  <Text style={styles.kpiTileLabel}>Green Days</Text>
                  <Text style={styles.kpiTileSubtext}>
                    {unifiedStats
                      ? `${Math.round(((unifiedStats.greenDaysMonth || 0) / (unifiedStats.daysInMonth || 30)) * 100)}% adherence`
                      : 'clean zero consumption'}
                  </Text>
                </View>

                {/* Tile 2: Current Streak */}
                <View style={[styles.clayCard, styles.kpiTile]}>
                  <View style={styles.kpiTileTop}>
                    <View style={[styles.kpiIconBubble, { backgroundColor: 'rgba(255, 159, 67, 0.12)' }]}>
                      <Ionicons name="flame" size={16} color={colors.brand.amber} />
                    </View>
                    <Text style={styles.kpiBadgeAmber}>Active</Text>
                  </View>
                  <Text style={styles.kpiBigNumber}>
                    {unifiedStats?.currentMonthStreak ?? 0}
                    <Text style={styles.kpiUnitSmall}> days</Text>
                  </Text>
                  <Text style={styles.kpiTileLabel}>Current Streak</Text>
                  <Text style={styles.kpiTileSubtext}>continuous clean days</Text>
                </View>

                {/* Tile 3: All-Time Max Streak (with exact date range) */}
                <View style={[styles.clayCard, styles.kpiTileWide]}>
                  <View style={styles.kpiTileTop}>
                    <View style={[styles.kpiIconBubble, { backgroundColor: 'rgba(244, 242, 234, 0.10)' }]}>
                      <Ionicons name="trophy" size={16} color={colors.brand.ivory} />
                    </View>
                    <Text style={styles.kpiBadgeIvory}>All-Time Best</Text>
                  </View>

                  <View style={styles.maxStreakContentRow}>
                    <View>
                      <Text style={styles.kpiBigNumber}>
                        {unifiedStats?.maxAllTimeStreak ?? 0}
                        <Text style={styles.kpiUnitSmall}> days</Text>
                      </Text>
                      <Text style={styles.kpiTileLabel}>Max Streak Record</Text>
                    </View>

                    <View style={styles.streakDateChip}>
                      <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
                      <Text style={styles.streakDateChipText}>
                        {unifiedStats?.maxStreakStart && unifiedStats?.maxStreakEnd
                          ? `${formatDateFriendly(unifiedStats.maxStreakStart)} – ${formatDateFriendly(unifiedStats.maxStreakEnd)}`
                          : 'Ongoing tracking period'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Habit-Wise Deep Dive */}
              <View style={styles.deepDiveContainer}>
                <Text style={styles.subSectionTitle}>Habit Deep Dive</Text>

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
                          style={[
                            styles.habitChip,
                            isSelected && styles.habitChipSelected,
                          ]}
                          onPress={() => setSelectedHabitId(b.id)}
                          activeOpacity={0.8}
                        >
                          <View style={styles.habitChipIcon}>
                            {getHabitIconComponent(
                              b.name,
                              16,
                              isSelected ? colors.brand.mint : colors.textSecondary
                            )}
                          </View>
                          <Text
                            style={[
                              styles.habitChipText,
                              isSelected && styles.habitChipTextSelected,
                            ]}
                          >
                            {b.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}

                {/* Deep Dive Card */}
                {selectedHabitStats ? (
                  <View style={[styles.clayCard, styles.deepDiveCard]}>
                    <View style={styles.deepDiveHeader}>
                      <View style={styles.deepDiveTitleRow}>
                        <View style={styles.deepDiveIconBox}>
                          {getHabitIconComponent(selectedHabitStats.behaviorName, 24, colors.brand.ivory)}
                        </View>
                        <View>
                          <Text style={styles.deepDiveHabitName}>
                            {selectedHabitStats.behaviorName}
                          </Text>
                          <Text style={styles.deepDiveStartDate}>
                            Tracking since: {formatDateFriendly(selectedHabitStats.createdDate)}
                          </Text>
                        </View>
                      </View>

                      {selectedHabitStats.dailyLimit !== null && (
                        <View style={styles.limitPill}>
                          <Text style={styles.limitPillText}>
                            Limit: {selectedHabitStats.dailyLimit} {selectedHabitStats.behaviorUnit}/day
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Detailed Stats 3-Col Metric Grid */}
                    <View style={styles.metricRow}>
                      <View style={styles.metricCol}>
                        <Text style={styles.metricVal}>
                          {selectedHabitStats.maxStreak}
                          <Text style={styles.metricUnit}> d</Text>
                        </Text>
                        <Text style={styles.metricLabel}>Max Streak</Text>
                        <Text style={styles.metricSubtext}>
                          {selectedHabitStats.maxStreakStart
                            ? `${formatDateFriendly(selectedHabitStats.maxStreakStart)}`
                            : 'record clean'}
                        </Text>
                      </View>

                      <View style={styles.metricDivider} />

                      <View style={styles.metricCol}>
                        <Text style={styles.metricVal}>
                          {selectedHabitStats.currentStreak}
                          <Text style={styles.metricUnit}> d</Text>
                        </Text>
                        <Text style={styles.metricLabel}>Current Streak</Text>
                        <Text style={styles.metricSubtext}>active run</Text>
                      </View>

                      <View style={styles.metricDivider} />

                      <View style={styles.metricCol}>
                        <Text style={styles.metricVal}>
                          {selectedHabitStats.totalLogged}
                        </Text>
                        <Text style={styles.metricLabel}>Total Volume</Text>
                        <Text style={styles.metricSubtext}>
                          {selectedHabitStats.logCount} logs logged
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={[styles.clayCard, styles.emptyDeepDiveCard]}>
                    <Text style={styles.emptyPromptText}>Select a habit above to view details</Text>
                  </View>
                )}
              </View>
            </View>

            {/* ======================================================== */}
            {/* SECTION 3: ALL DATABASE DATA CHARTS & GRAPHS            */}
            {/* ======================================================== */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Analytics & Visualizations</Text>

              {/* Chart 1: 30-Day Activity Volume */}
              <View style={[styles.clayCard, styles.chartCard]}>
                <View style={styles.chartCardHeader}>
                  <Text style={styles.chartCardTitle}>30-Day Activity Timeline</Text>
                  <Text style={styles.chartCardBadge}>Last 30 Days</Text>
                </View>

                {unifiedStats && unifiedStats.past30DaysTotals.length > 0 ? (
                  <View style={styles.monthTimelineContainer}>
                    <View style={styles.timelineBarsRow}>
                      {unifiedStats.past30DaysTotals.map((item, idx) => {
                        const maxVal30 = Math.max(
                          ...unifiedStats.past30DaysTotals.map((t) => t.total),
                          1
                        );
                        const barH = item.total > 0
                          ? Math.max(8, Math.round((item.total / maxVal30) * 55))
                          : 3;

                        return (
                          <View key={item.dateStr} style={styles.timelineCol}>
                            <View style={styles.timelineBarSlot}>
                              <View
                                style={[
                                  styles.timelineBar,
                                  { height: barH },
                                  item.isGreen
                                    ? styles.timelineBarGreen
                                    : styles.timelineBarLogged,
                                ]}
                              />
                            </View>
                            {idx % 5 === 0 && (
                              <Text style={styles.timelineDateLabel}>{item.dayNumber}</Text>
                            )}
                          </View>
                        );
                      })}
                    </View>
                    <View style={styles.timelineLegendRow}>
                      <View style={styles.timelineLegendItem}>
                        <View style={[styles.legendColorDot, { backgroundColor: colors.statusGreenDay }]} />
                        <Text style={styles.timelineLegendText}>Zero-consumption Day</Text>
                      </View>
                      <View style={styles.timelineLegendItem}>
                        <View style={[styles.legendColorDot, { backgroundColor: colors.brand.amber }]} />
                        <Text style={styles.timelineLegendText}>Logged Quantity</Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.emptyPromptText}>No activity data recorded</Text>
                )}
              </View>

              {/* Chart 2: Habit Distribution Breakdown */}
              {unifiedStats && unifiedStats.habitDistribution.length > 0 && (
                <View style={[styles.clayCard, styles.chartCard]}>
                  <Text style={styles.chartCardTitle}>Habit Proportion Share</Text>
                  <Text style={styles.chartCardSubtitle}>
                    Relative breakdown of all logged activity
                  </Text>

                  {/* Multi-Segment Proportion Bar */}
                  <View style={styles.stackedBarContainer}>
                    {unifiedStats.habitDistribution.map((item) => {
                      if (item.percentage <= 0) return null;
                      return (
                        <View
                          key={item.id}
                          style={[
                            styles.stackedBarSegment,
                            {
                              flex: item.percentage,
                              backgroundColor: item.color,
                            },
                          ]}
                        />
                      );
                    })}
                  </View>

                  {/* Distribution Cards List */}
                  <View style={styles.distributionList}>
                    {unifiedStats.habitDistribution.map((item) => (
                      <View key={item.id} style={styles.distributionRow}>
                        <View style={styles.distributionLeft}>
                          <View
                            style={[styles.legendColorDot, { backgroundColor: item.color }]}
                          />
                          <Text style={styles.distributionName}>{item.name}</Text>
                        </View>
                        <View style={styles.distributionRight}>
                          <Text style={styles.distributionTotal}>
                            {item.total} units
                          </Text>
                          <Text style={styles.distributionPct}>
                            {item.percentage}%
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Chart 3: Day of Week Trigger Frequency */}
              {unifiedStats && (
                <View style={[styles.clayCard, styles.chartCard]}>
                  <View style={styles.chartCardHeader}>
                    <Text style={styles.chartCardTitle}>Day of Week Frequency</Text>
                    <Text style={styles.chartCardBadge}>Trigger Patterns</Text>
                  </View>
                  <Text style={styles.chartCardSubtitle}>
                    Identifies which days habit impulses happen most
                  </Text>

                  <View style={styles.dowChartContainer}>
                    {unifiedStats.dayOfWeekDistribution.map((dow) => {
                      const maxDow = Math.max(
                        ...unifiedStats.dayOfWeekDistribution.map((d) => d.total),
                        1
                      );
                      const barH = dow.total > 0
                        ? Math.max(10, Math.round((dow.total / maxDow) * 60))
                        : 4;
                      const isPeak = dow.total === maxDow && dow.total > 0;

                      return (
                        <View key={dow.dayName} style={styles.dowCol}>
                          <Text style={styles.dowValText}>
                            {dow.total > 0 ? dow.total : '—'}
                          </Text>
                          <View style={styles.dowBarTrack}>
                            <View
                              style={[
                                styles.dowBarFill,
                                { height: barH },
                                isPeak && styles.dowBarPeak,
                              ]}
                            />
                          </View>
                          <Text style={[styles.dowDayText, isPeak && styles.dowDayPeak]}>
                            {dow.dayName}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Chart 4: Time of Day Heat Distribution */}
              {unifiedStats && (
                <View style={[styles.clayCard, styles.chartCard]}>
                  <Text style={styles.chartCardTitle}>Time of Day Distribution</Text>
                  <Text style={styles.chartCardSubtitle}>
                    When habits are triggered throughout the 24-hour cycle
                  </Text>

                  <View style={styles.timeOfDayGrid}>
                    <View style={styles.timeBox}>
                      <Ionicons name="sunny-outline" size={18} color={colors.brand.amber} />
                      <Text style={styles.timeBoxName}>Morning</Text>
                      <Text style={styles.timeBoxHours}>05:00 – 12:00</Text>
                      <Text style={styles.timeBoxCount}>
                        {unifiedStats.timeOfDayDistribution.morning} logs
                      </Text>
                    </View>

                    <View style={styles.timeBox}>
                      <Ionicons name="sunny" size={18} color={colors.brand.amber} />
                      <Text style={styles.timeBoxName}>Afternoon</Text>
                      <Text style={styles.timeBoxHours}>12:00 – 17:00</Text>
                      <Text style={styles.timeBoxCount}>
                        {unifiedStats.timeOfDayDistribution.afternoon} logs
                      </Text>
                    </View>

                    <View style={styles.timeBox}>
                      <Ionicons name="partly-sunny-outline" size={18} color={colors.brand.mint} />
                      <Text style={styles.timeBoxName}>Evening</Text>
                      <Text style={styles.timeBoxHours}>17:00 – 22:00</Text>
                      <Text style={styles.timeBoxCount}>
                        {unifiedStats.timeOfDayDistribution.evening} logs
                      </Text>
                    </View>

                    <View style={styles.timeBox}>
                      <Ionicons name="moon-outline" size={18} color={colors.brand.ivory} />
                      <Text style={styles.timeBoxName}>Night</Text>
                      <Text style={styles.timeBoxHours}>22:00 – 05:00</Text>
                      <Text style={styles.timeBoxCount}>
                        {unifiedStats.timeOfDayDistribution.night} logs
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
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

  // Screen Header
  screenHeader: {
    marginBottom: 20,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.6,
  },
  screenSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },

  // Loader
  loaderContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loaderText: {
    fontSize: 13,
    color: colors.textSecondary,
  },

  // Section
  section: {
    marginBottom: 22,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  subSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.2,
    marginBottom: 10,
    marginTop: 6,
  },

  // Clay Card Base
  clayCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },

  // Week Card (Section 1)
  weekCard: {
    padding: 16,
  },
  weekCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  cardHeaderRange: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
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
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(185, 246, 202, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(185, 246, 202, 0.25)',
  },
  weekTodayPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.brand.mint,
  },

  // Habit Legends
  habitsLegendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },

  // 7-Day Grouped Bars Chart
  chartWrapper: {
    marginTop: 6,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    width: '100%',
  },
  dayColContainer: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: 4,
    borderRadius: 12,
  },
  dayColContainerSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  dayTopIndicator: {
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  dayTopValText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brand.amber,
  },
  dayBarTrack: {
    width: 32,
    height: 96,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  dayBarTrackSelected: {
    borderColor: colors.brand.mint,
    backgroundColor: 'rgba(185, 246, 202, 0.06)',
  },
  habitBarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  habitBarItem: {
    borderRadius: 4,
  },
  dayBottomLabels: {
    alignItems: 'center',
    marginTop: 8,
  },
  dayNameLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: -0.2,
  },
  dayNumLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 1,
  },
  dayLabelToday: {
    color: colors.brand.mint,
  },
  todayIndicatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.brand.mint,
    marginTop: 2,
  },

  // Day Inspection Drawer
  dayInspectionCard: {
    marginTop: 14,
    padding: 12,
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
    fontSize: 13,
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
  inspectionLeft: {
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
    color: colors.brand.amber,
  },

  // KPI Grid (Section 2)
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  kpiTile: {
    width: (SCREEN_WIDTH - 32 - 10) / 2,
    padding: 14,
    justifyContent: 'space-between',
  },
  kpiTileWide: {
    width: '100%',
    padding: 14,
  },
  kpiTileTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  kpiIconBubble: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiBadgeMint: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.brand.mint,
    backgroundColor: 'rgba(185, 246, 202, 0.10)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  kpiBadgeAmber: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.brand.amber,
    backgroundColor: 'rgba(255, 159, 67, 0.10)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  kpiBadgeIvory: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.brand.ivory,
    backgroundColor: 'rgba(244, 242, 234, 0.10)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  kpiBigNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  kpiDenominator: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  kpiUnitSmall: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  kpiTileLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  kpiTileSubtext: {
    fontSize: 10.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  maxStreakContentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 4,
  },
  streakDateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  streakDateChipText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  // Deep Dive Container
  deepDiveContainer: {
    marginTop: 4,
  },
  habitSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 10,
  },
  habitChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  habitChipSelected: {
    backgroundColor: 'rgba(185, 246, 202, 0.12)',
    borderColor: colors.brand.mint,
  },
  habitChipIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  habitChipTextSelected: {
    color: colors.brand.mint,
  },
  deepDiveCard: {
    marginTop: 4,
    padding: 16,
  },
  emptyDeepDiveCard: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deepDiveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
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
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deepDiveHabitName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  deepDiveStartDate: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  limitPill: {
    backgroundColor: 'rgba(255, 159, 67, 0.12)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  limitPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.brand.amber,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    padding: 12,
  },
  metricCol: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  metricVal: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  metricUnit: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
  metricSubtext: {
    fontSize: 9.5,
    color: colors.textTertiary,
    marginTop: 1,
    textAlign: 'center',
  },

  // Section 3: Charts & Graphs
  chartCard: {
    marginBottom: 12,
    padding: 16,
  },
  chartCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chartCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  chartCardSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: 12,
  },
  chartCardBadge: {
    fontSize: 11,
    color: colors.textSecondary,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },

  // 30-Day Timeline
  monthTimelineContainer: {
    marginTop: 10,
  },
  timelineBarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 65,
    paddingHorizontal: 2,
  },
  timelineCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  timelineBarSlot: {
    height: 55,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  timelineBar: {
    width: 4,
    borderRadius: 2,
  },
  timelineBarGreen: {
    backgroundColor: colors.statusGreenDay,
    opacity: 0.7,
  },
  timelineBarLogged: {
    backgroundColor: colors.brand.amber,
  },
  timelineDateLabel: {
    fontSize: 8.5,
    color: colors.textTertiary,
    marginTop: 4,
  },
  timelineLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  timelineLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timelineLegendText: {
    fontSize: 11,
    color: colors.textSecondary,
  },

  // Stacked Proportion Bar
  stackedBarContainer: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 14,
  },
  stackedBarSegment: {
    height: '100%',
  },
  distributionList: {
    gap: 8,
  },
  distributionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  distributionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  distributionName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  distributionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  distributionTotal: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  distributionPct: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand.mint,
  },

  // Day of Week Frequency
  dowChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 95,
    paddingTop: 10,
  },
  dowCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  dowValText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  dowBarTrack: {
    height: 60,
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
  },
  dowBarFill: {
    width: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  dowBarPeak: {
    backgroundColor: colors.brand.amber,
  },
  dowDayText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 6,
  },
  dowDayPeak: {
    color: colors.brand.amber,
    fontWeight: '700',
  },

  // Time of Day
  timeOfDayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    marginTop: 4,
  },
  timeBox: {
    width: '48.5%',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    padding: 12,
    alignItems: 'flex-start',
  },
  timeBoxName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 6,
  },
  timeBoxHours: {
    fontSize: 10,
    color: colors.textTertiary,
    marginTop: 1,
  },
  timeBoxCount: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand.mint,
    marginTop: 4,
  },

  emptyPrompt: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPromptText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
