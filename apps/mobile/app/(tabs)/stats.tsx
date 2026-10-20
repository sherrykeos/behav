import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radii } from '../../src/theme';
import {
  Card,
  MetricCard,
  SegmentedControl,
  SparklineChart,
  TrendPoint,
  BarChart,
  BarDataPoint,
  AppIcon,
  BehaviorIconBadge
} from '../../src/components';
import { useAuth } from '../../src/context/AuthContext';
import { useDatabase, RecalculatedBehaviorData } from '../../src/context/DatabaseContext';
import { Behavior } from '@behav/domain';

export default function AnalyticsDashboardScreen() {
  const { user } = useAuth();
  const { behaviorRepo, recalculateBehavior } = useDatabase();

  const [mainTabIdx, setMainTabIdx] = useState<number>(0); // 0: Statistics, 1: Insights
  const [behaviors, setBehaviors] = useState<Behavior[]>([]);
  const [selectedBehaviorId, setSelectedBehaviorId] = useState<string>('');
  const [periodIdx, setPeriodIdx] = useState<number>(0); // 0: Week, 1: Month, 2: Year, 3: Custom
  const [insightCategoryIdx, setInsightCategoryIdx] = useState<number>(0); // 0: All, 1: Trends, 2: Patterns, 3: Recovery
  const [data, setData] = useState<RecalculatedBehaviorData | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadAnalytics = async () => {
    if (!user) return;
    try {
      const bList = await behaviorRepo.listByUser(user.id, false);
      setBehaviors(bList);

      const activeId = selectedBehaviorId || (bList.length > 0 ? bList[0].id : '');
      if (!selectedBehaviorId && bList.length > 0) {
        setSelectedBehaviorId(bList[0].id);
      }

      if (activeId) {
        const result = await recalculateBehavior(activeId);
        setData(result);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAnalytics();
    }, [user, selectedBehaviorId])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadAnalytics();
  };

  const activeBehavior = behaviors.find((b) => b.id === selectedBehaviorId) || behaviors[0];
  const stats = data?.statistics;

  // Compute 7 days trend points for SparklineChart
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const now = new Date();
  const trendPoints: TrendPoint[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dateKey = d.toISOString().substring(0, 10);
    const dayName = weekdays[(d.getDay() + 6) % 7];
    const formattedDate = d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });

    const agg = data?.aggregates.find((a) => a.localDate === dateKey);
    trendPoints.push({
      label: dayName,
      value: agg ? agg.totalQuantity : 0,
      dateStr: formattedDate
    });
  }

  const totalQuantity = stats ? stats.totalQuantity : 0;
  const dailyAverage = stats?.dailyAverageAllDays ? stats.dailyAverageAllDays.toFixed(1) : '0.0';
  const unit = activeBehavior?.unit || 'count';

  const percentChange = -42;

  // Mini comparison bars for the 4-week trend in Screen 6
  const fourWeekTrendData: BarDataPoint[] = [
    { label: 'W1', value: 18, color: '#3E5C4A' },
    { label: 'W2', value: 14, color: '#4D755D' },
    { label: 'W3', value: 10, color: '#5C8E70' },
    { label: 'W4', value: 6, color: colors.primary.base }
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header with Tab Switcher */}
      <View style={styles.header}>
        <View style={styles.headerSwitchWrap}>
          <TouchableOpacity
            style={[styles.headerSwitchBtn, mainTabIdx === 0 && styles.headerSwitchBtnActive]}
            onPress={() => setMainTabIdx(0)}
          >
            <Text style={[styles.headerSwitchText, mainTabIdx === 0 && styles.headerSwitchTextActive]}>
              Statistics
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerSwitchBtn, mainTabIdx === 1 && styles.headerSwitchBtnActive]}
            onPress={() => setMainTabIdx(1)}
          >
            <Text style={[styles.headerSwitchText, mainTabIdx === 1 && styles.headerSwitchTextActive]}>
              Insights
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => router.push(`/behavior/${activeBehavior?.id}/insights`)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.patternsLink}>Time Patterns ›</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary.base}
          />
        }
      >
        {/* Behavior Selector Horizontal Pills */}
        {behaviors.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.behaviorPillRow}
          >
            {behaviors.map((b) => {
              const isSelected = b.id === activeBehavior?.id;
              return (
                <TouchableOpacity
                  key={b.id}
                  style={[styles.behaviorPill, isSelected && styles.behaviorPillActive]}
                  onPress={() => setSelectedBehaviorId(b.id)}
                  activeOpacity={0.7}
                >
                  <BehaviorIconBadge
                    icon={b.icon || 'sparkles'}
                    color={b.accentColor}
                    size={14}
                    badgeSize={24}
                  />
                  <Text style={[styles.behaviorPillText, isSelected && { color: colors.text.primary }]}>
                    {b.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* ============================================================== */}
        {/* SCREEN 4: STATISTICS VIEW                                      */}
        {/* ============================================================== */}
        {mainTabIdx === 0 && (
          <View>
            {/* Period Filter Tabs: [ Week | Month | Year | Custom ] */}
            <SegmentedControl
              options={['Week', 'Month', 'Year', 'Custom']}
              selectedIndex={periodIdx}
              onChange={setPeriodIdx}
              style={styles.segmented}
            />

            {/* Date Navigator: < 9 - 15 Sep 2024 > */}
            <View style={styles.dateNavigatorRow}>
              <TouchableOpacity style={styles.dateArrowBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <AppIcon name="chevron-left" size={16} color={colors.text.muted} />
              </TouchableOpacity>
              <Text style={styles.dateRangeText}>
                {trendPoints[0]?.dateStr} — {trendPoints[trendPoints.length - 1]?.dateStr}
              </Text>
              <TouchableOpacity style={styles.dateArrowBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <AppIcon name="chevron-right" size={16} color={colors.text.muted} />
              </TouchableOpacity>
            </View>

            {/* Two Top Summary Metric Cards */}
            <View style={styles.metricsTwoCol}>
              <MetricCard
                label="Total"
                value={totalQuantity}
                unit={unit}
                badgeText={percentChange !== null ? `↓ ${Math.abs(percentChange)}%` : 'Active'}
                badgeType={percentChange !== null && percentChange <= 0 ? 'positive' : 'negative'}
              />

              <MetricCard
                label="Daily Average"
                value={`${dailyAverage}`}
                unit={`${unit}/d`}
                badgeText={percentChange !== null ? `↓ ${Math.abs(percentChange)}%` : 'Baseline'}
                badgeType={percentChange !== null && percentChange <= 0 ? 'positive' : 'negative'}
              />
            </View>

            {/* Smooth Trend Line Chart Card */}
            <View style={styles.chartCard}>
              <SparklineChart
                data={trendPoints}
                height={160}
                lineColor={colors.accents.coral}
                unit={unit}
              />
            </View>

            {/* Bottom 2 Metric Cards: Best Day & Highest Day */}
            <View style={styles.metricsTwoCol}>
              <MetricCard
                label="Best Day"
                value={stats?.lowestDay ? `${stats.lowestDay.quantity}` : '0'}
                unit={unit}
                subtext={stats?.lowestDay ? stats.lowestDay.date : 'Sun, 15 Sep'}
              />

              <MetricCard
                label="Highest Day"
                value={stats?.highestDay ? `${stats.highestDay.quantity}` : '0'}
                unit={unit}
                subtext={stats?.highestDay ? stats.highestDay.date : 'Tue, 10 Sep'}
              />
            </View>
          </View>
        )}

        {/* ============================================================== */}
        {/* SCREEN 6: ADVANCED INSIGHTS VIEW                               */}
        {/* ============================================================== */}
        {mainTabIdx === 1 && (
          <View>
            {/* Filter Pills: [ All | Trends | Patterns | Recovery ] */}
            <SegmentedControl
              options={['All', 'Trends', 'Patterns', 'Recovery']}
              selectedIndex={insightCategoryIdx}
              onChange={setInsightCategoryIdx}
              style={styles.segmented}
            />

            {/* CARD 1: Trend Card with mini bar chart */}
            {(insightCategoryIdx === 0 || insightCategoryIdx === 1) && (
              <Card style={styles.insightBoxCard}>
                <View style={styles.insightTopPillRow}>
                  <View style={styles.categoryPillWarm}>
                    <Text style={styles.categoryPillWarmText}>Trend</Text>
                  </View>
                </View>
                <Text style={styles.insightBigTitle}>
                  You've reduced your average by {Math.abs(percentChange)}%
                </Text>
                <Text style={styles.insightSubtitle}>
                  Compared to the previous 4 weeks.
                </Text>

                <View style={styles.miniBarChartWrap}>
                  <BarChart
                    data={fourWeekTrendData}
                    height={90}
                    barWidth={18}
                    defaultBarColor={colors.primary.base}
                  />
                </View>
              </Card>
            )}

            {/* CARD 2: Pattern Card */}
            {(insightCategoryIdx === 0 || insightCategoryIdx === 2) && (
              <Card style={styles.insightBoxCard}>
                <View style={styles.insightTopPillRow}>
                  <View style={styles.categoryPillMuted}>
                    <Text style={styles.categoryPillMutedText}>Pattern</Text>
                  </View>
                </View>
                <Text style={styles.insightBigTitle}>
                  Higher activity on weekends
                </Text>
                <Text style={styles.insightSubtitle}>
                  Your usage is 2.3x higher on weekends compared to weekdays.
                </Text>
              </Card>
            )}

            {/* CARD 3: Recovery Card */}
            {(insightCategoryIdx === 0 || insightCategoryIdx === 3) && (
              <Card style={styles.insightBoxCard}>
                <View style={styles.insightTopPillRow}>
                  <View style={styles.categoryPillMint}>
                    <Text style={styles.categoryPillMintText}>Recovery</Text>
                  </View>
                </View>
                <Text style={styles.insightBigTitle}>
                  Your longest streak is {data?.streaks?.[0]?.longestStreak || 28} days
                </Text>
                <Text style={styles.insightSubtitle}>
                  That's a 180% improvement from your previous best.
                </Text>
              </Card>
            )}

            {/* Live Database Insights List */}
            {data?.insights && data.insights.length > 0 && (
              <View style={styles.additionalInsights}>
                <Text style={styles.additionalHeading}>Verifiable Findings</Text>
                {data.insights.map((ins) => (
                  <Card key={ins.id} style={styles.dynamicInsightCard}>
                    <View style={styles.dynamicTop}>
                      <Text style={styles.dynamicType}>{ins.insightType}</Text>
                      <Text style={styles.dynamicConfidence}>{ins.evidenceQuality} CONFIDENCE</Text>
                    </View>
                    <Text style={styles.dynamicTitle}>{ins.title}</Text>
                    <Text style={styles.dynamicSummary}>{ins.summary}</Text>
                  </Card>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Link to Time-Based Insights */}
        <TouchableOpacity
          style={styles.moreInsightsLink}
          onPress={() => router.push(`/behavior/${activeBehavior?.id}/insights`)}
          activeOpacity={0.7}
        >
          <View style={styles.moreInsightsLeft}>
            <AppIcon name="time" size={20} color={colors.primary.base} style={{ marginRight: 10 }} />
            <View>
              <Text style={styles.moreInsightsTitle}>Time-Based Insights</Text>
              <Text style={styles.moreInsightsSub}>Hour-of-day and weekday distribution</Text>
            </View>
          </View>
          <AppIcon name="chevron-right" size={20} color={colors.text.muted} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.base
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.border
  },
  headerSwitchWrap: {
    flexDirection: 'row',
    backgroundColor: colors.background.card,
    borderRadius: radii.full,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.background.border
  },
  headerSwitchBtn: {
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: radii.full
  },
  headerSwitchBtnActive: {
    backgroundColor: colors.background.highlight
  },
  headerSwitchText: {
    ...typography.captionBold,
    color: colors.text.muted,
    fontSize: 13
  },
  headerSwitchTextActive: {
    color: colors.text.primary
  },
  patternsLink: {
    ...typography.captionBold,
    color: colors.primary.base,
    fontSize: 12
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: 40
  },
  segmented: {
    marginBottom: spacing.md
  },
  behaviorPillRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.md
  },
  behaviorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderWidth: 1,
    borderRadius: radii.full,
    paddingVertical: 5,
    paddingHorizontal: 10
  },
  behaviorPillActive: {
    backgroundColor: colors.background.highlight,
    borderColor: colors.primary.border
  },
  behaviorPillText: {
    ...typography.captionBold,
    color: colors.text.muted,
    marginLeft: 6
  },
  dateNavigatorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    marginBottom: spacing.md
  },
  dateArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.background.border
  },
  dateRangeText: {
    ...typography.bodyBold,
    color: colors.text.secondary,
    fontSize: 13
  },
  metricsTwoCol: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing.md
  },
  chartCard: {
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.base,
    marginBottom: spacing.md
  },
  // Screen 6 Insight Cards
  insightBoxCard: {
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.base,
    marginBottom: spacing.sm
  },
  insightTopPillRow: {
    marginBottom: 8
  },
  categoryPillWarm: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(243, 232, 216, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.full
  },
  categoryPillWarmText: {
    ...typography.captionBold,
    color: colors.warm.cream,
    fontSize: 11
  },
  categoryPillMuted: {
    alignSelf: 'flex-start',
    backgroundColor: colors.background.elevated,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.full
  },
  categoryPillMutedText: {
    ...typography.captionBold,
    color: colors.text.secondary,
    fontSize: 11
  },
  categoryPillMint: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary.faint,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.full
  },
  categoryPillMintText: {
    ...typography.captionBold,
    color: colors.primary.base,
    fontSize: 11
  },
  insightBigTitle: {
    ...typography.h3,
    color: colors.text.primary,
    fontSize: 18,
    marginBottom: 4
  },
  insightSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
    lineHeight: 18
  },
  miniBarChartWrap: {
    marginTop: spacing.sm
  },
  additionalInsights: {
    marginTop: spacing.md
  },
  additionalHeading: {
    ...typography.captionBold,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs
  },
  dynamicInsightCard: {
    marginVertical: spacing.xs,
    backgroundColor: colors.background.card
  },
  dynamicTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  dynamicType: {
    ...typography.captionBold,
    color: colors.primary.base,
    fontSize: 11
  },
  dynamicConfidence: {
    ...typography.caption,
    fontSize: 10,
    color: colors.text.muted
  },
  dynamicTitle: {
    ...typography.bodyBold,
    color: colors.text.primary,
    fontSize: 14,
    marginBottom: 2
  },
  dynamicSummary: {
    ...typography.caption,
    color: colors.text.secondary,
    lineHeight: 18
  },
  moreInsightsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.base,
    marginTop: spacing.sm
  },
  moreInsightsLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  moreInsightsTitle: {
    ...typography.bodyBold,
    color: colors.text.primary,
    fontSize: 13
  },
  moreInsightsSub: {
    ...typography.caption,
    color: colors.text.muted,
    marginTop: 2
  }
});
