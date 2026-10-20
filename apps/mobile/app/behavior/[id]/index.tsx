import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert
} from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radii } from '../../../src/theme';
import {
  Card,
  Button,
  Header,
  StreakBadge,
  AppIcon,
  BehaviorIconBadge,
  BarChart,
  BarDataPoint,
  SegmentedControl
} from '../../../src/components';
import { useAuth } from '../../../src/context/AuthContext';
import { useDatabase, RecalculatedBehaviorData } from '../../../src/context/DatabaseContext';
import { Behavior, Goal, BehaviorEntry } from '@behav/domain';

export default function BehaviorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { behaviorRepo, goalRepo, entryRepo, reviewRepo, recalculateBehavior } = useDatabase();

  const [behavior, setBehavior] = useState<Behavior | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [entries, setEntries] = useState<BehaviorEntry[]>([]);
  const [data, setData] = useState<RecalculatedBehaviorData | null>(null);
  const [tabIdx, setTabIdx] = useState<number>(0); // 0: Overview, 1: Entries, 2: Insights
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    if (!user || !id) return;
    try {
      const b = await behaviorRepo.findById(id, user.id);
      if (!b) {
        Alert.alert('Notice', 'Behavior not found.', [{ text: 'Back', onPress: () => router.back() }]);
        return;
      }
      setBehavior(b);

      const gList = await goalRepo.listByBehavior(user.id, id);
      setGoals(gList);

      const entryList = await entryRepo.listByBehaviorAndRange(user.id, id, '2000-01-01', '2100-01-01');
      setEntries(entryList);

      const result = await recalculateBehavior(id);
      setData(result);
    } catch (err) {
      console.error('Failed to load behavior detail:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user, id])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleConfirmZero = async () => {
    if (!user || !behavior) return;
    const today = new Date().toISOString().substring(0, 10);
    try {
      await reviewRepo.upsertReview({
        userId: user.id,
        behaviorId: behavior.id,
        localDate: today,
        timezone: 'UTC',
        status: 'CONFIRMED_ZERO',
        notes: 'Confirmed zero activity via app'
      });
      await recalculateBehavior(behavior.id);
      Alert.alert('Confirmed', 'Zero activity confirmed for today.');
      loadData();
    } catch {
      Alert.alert('Error', 'Unable to confirm review.');
    }
  };

  if (!behavior) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Behavior" onBack={() => router.back()} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading behavior details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const primaryGoal = goals[0];
  const primaryStreak = data?.streaks[0];
  const todayStr = new Date().toISOString().substring(0, 10);
  const todayEntries = entries.filter((e) => e.occurredAt.startsWith(todayStr));
  const todayTotal = todayEntries.reduce((sum, e) => sum + e.quantity, 0);

  // 24h mini distribution for Today card
  const todayHourlyCounts = new Array(24).fill(0);
  todayEntries.forEach((e) => {
    try {
      const hour = new Date(e.occurredAt).getHours();
      todayHourlyCounts[hour] += e.quantity;
    } catch {}
  });

  const mini24hData: BarDataPoint[] = [
    { label: '12am', value: todayHourlyCounts[0] + todayHourlyCounts[1] + todayHourlyCounts[2] + todayHourlyCounts[3] },
    { label: '6am', value: todayHourlyCounts[6] + todayHourlyCounts[7] + todayHourlyCounts[8] + todayHourlyCounts[9] },
    { label: '12pm', value: todayHourlyCounts[12] + todayHourlyCounts[13] + todayHourlyCounts[14] + todayHourlyCounts[15] },
    { label: '6pm', value: todayHourlyCounts[18] + todayHourlyCounts[19] + todayHourlyCounts[20] + todayHourlyCounts[21] },
    { label: '12am', value: todayHourlyCounts[22] + todayHourlyCounts[23] }
  ];

  // Past 7 days weekly trend data
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const now = new Date();
  const past7DaysData: BarDataPoint[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dateKey = d.toISOString().substring(0, 10);
    const dayName = weekdays[(d.getDay() + 6) % 7];

    const agg = data?.aggregates.find((a) => a.localDate === dateKey);
    const val = agg ? agg.totalQuantity : 0;
    const isOver = primaryGoal ? val > primaryGoal.targetValue : false;

    past7DaysData.push({
      label: dayName,
      value: val,
      color: isOver ? colors.accents.coral : colors.primary.base
    });
  }

  const currentStreak = primaryStreak ? primaryStreak.currentStreak : 0;
  const longestStreak = primaryStreak ? primaryStreak.longestStreak : 0;
  const targetVal = primaryGoal ? primaryGoal.targetValue : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header matching showcase */}
      <Header
        title={behavior.name}
        onBack={() => router.back()}
        rightAction={{
          icon: 'settings',
          onPress: () => router.push(`/behavior/${behavior.id}/edit`)
        }}
      />

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
        {/* Segmented Sub-Tabs: [ Overview | Entries | Insights ] */}
        <SegmentedControl
          options={['Overview', 'Entries', 'Insights']}
          selectedIndex={tabIdx}
          onChange={setTabIdx}
          style={styles.segmented}
        />

        {/* TAB 0: OVERVIEW */}
        {tabIdx === 0 && (
          <>
            {/* "Today" Card with big metric and 24h mini bar chart */}
            <View style={styles.todayCard}>
              <View style={styles.todayHeaderRow}>
                <Text style={styles.todayCardLabel}>Today</Text>
                <TouchableOpacity
                  onPress={() => Alert.alert('Target Info', `Daily target is ${targetVal} ${behavior.unit}.`)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <AppIcon name="info" size={18} color={colors.text.muted} />
                </TouchableOpacity>
              </View>

              <View style={styles.todayMetricRow}>
                <Text style={styles.todayMetricValue}>{todayTotal} / {targetVal}</Text>
                <Text style={styles.todayTargetLabel}>target</Text>
              </View>

              {/* 24-Hour Mini Bar Chart */}
              <View style={styles.miniChartWrap}>
                <BarChart
                  data={mini24hData}
                  height={80}
                  barWidth={10}
                  defaultBarColor={todayTotal > targetVal ? colors.accents.coral : colors.primary.base}
                  showLabels={true}
                />
              </View>

              {/* Fast Confirm Zero action if zero logged */}
              {todayTotal === 0 && primaryGoal?.goalType === 'ABSTINENCE' && (
                <TouchableOpacity
                  onPress={handleConfirmZero}
                  style={styles.confirmZeroBtn}
                  activeOpacity={0.7}
                >
                  <AppIcon name="check" size={14} color={colors.primary.base} style={{ marginRight: 6 }} />
                  <Text style={styles.confirmZeroText}>Confirm zero smoking today</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Streak Cards Row: Side-by-Side Current & Longest Streak */}
            <View style={styles.streakCardsRow}>
              <TouchableOpacity
                style={styles.streakColCard}
                onPress={() => router.push(`/behavior/${behavior.id}/streaks`)}
                activeOpacity={0.7}
              >
                <Text style={styles.streakColLabel}>Current Streak</Text>
                <View style={styles.streakColValRow}>
                  <Text style={styles.streakColNum}>{currentStreak}</Text>
                  <Text style={styles.streakColUnit}>days</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.streakColCard}
                onPress={() => router.push(`/behavior/${behavior.id}/streaks`)}
                activeOpacity={0.7}
              >
                <Text style={styles.streakColLabel}>Longest Streak</Text>
                <View style={styles.streakColValRow}>
                  <Text style={styles.streakColNum}>{longestStreak}</Text>
                  <Text style={styles.streakColUnit}>days</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Positive Feedback Heart Card */}
            <View style={styles.feedbackCard}>
              <View style={styles.feedbackHeartWrap}>
                <AppIcon name="heart" size={16} color={colors.primary.base} />
              </View>
              <View style={styles.feedbackTextCol}>
                <Text style={styles.feedbackTitle}>You're doing better</Text>
                <Text style={styles.feedbackSub}>
                  {data?.statistics.adherenceRate !== undefined
                    ? `${Math.round(data.statistics.adherenceRate)}% consistency rate this period`
                    : '22% lower than last week'}
                </Text>
              </View>
            </View>

            {/* Weekly Trend 7-Day Bar Chart */}
            <View style={styles.weeklyCard}>
              <View style={styles.weeklyHeaderRow}>
                <Text style={styles.weeklyTitle}>Weekly Trend</Text>
                <Text style={styles.weeklyAvgText}>
                  Avg {data?.statistics.dailyAverageAllDays ? data.statistics.dailyAverageAllDays.toFixed(1) : '3.1'}
                </Text>
              </View>

              <BarChart
                data={past7DaysData}
                height={130}
                barWidth={14}
                targetValue={targetVal}
                targetLabel={`Target ${targetVal}`}
                showLabels={true}
              />
            </View>

            {/* Bottom Quick Log Action */}
            <Button
              title={`Log ${behavior.name}`}
              onPress={() => router.push(`/behavior/${behavior.id}/log`)}
              variant="primary"
              size="lg"
              style={{ marginTop: spacing.md }}
            />
          </>
        )}

        {/* TAB 1: ENTRIES */}
        {tabIdx === 1 && (
          <View style={styles.tabContent}>
            <View style={styles.tabHeaderRow}>
              <Text style={styles.sectionHeading}>Logged Entries ({entries.length})</Text>
              <Button
                title="+ Add"
                size="sm"
                variant="secondary"
                onPress={() => router.push(`/behavior/${behavior.id}/log`)}
              />
            </View>

            {entries.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>No entries recorded yet.</Text>
              </View>
            ) : (
              entries.map((e) => (
                <View key={e.id} style={styles.entryRow}>
                  <View style={styles.entryLeft}>
                    <Text style={styles.entryQuantity}>
                      +{e.quantity} {behavior.unit}
                    </Text>
                    <Text style={styles.entryTime}>
                      {new Date(e.occurredAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </Text>
                    {e.notes ? <Text style={styles.entryNotes}>"{e.notes}"</Text> : null}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 2: INSIGHTS */}
        {tabIdx === 2 && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionHeading}>Behavioral Patterns</Text>
            {data?.insights.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>Gathering more records to surface evidence-backed insights.</Text>
              </View>
            ) : (
              data?.insights.map((ins, idx) => (
                <View key={idx} style={styles.insightCard}>
                  <View style={styles.insightHeaderRow}>
                    <Text style={styles.insightCategory}>{ins.insightType}</Text>
                    <Text style={styles.insightQuality}>{ins.evidenceQuality} confidence</Text>
                  </View>
                  <Text style={styles.insightTitle}>{ins.title}</Text>
                  <Text style={styles.insightSummary}>{ins.summary}</Text>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.base
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingText: {
    ...typography.body,
    color: colors.text.muted
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: 40
  },
  segmented: {
    marginVertical: spacing.md
  },
  todayCard: {
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.base,
    marginBottom: spacing.md
  },
  todayHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  todayCardLabel: {
    ...typography.captionBold,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  todayMetricRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 6,
    marginBottom: 4
  },
  todayMetricValue: {
    ...typography.displayMedium,
    color: colors.text.primary,
    fontSize: 32
  },
  todayTargetLabel: {
    ...typography.caption,
    color: colors.text.muted,
    marginLeft: 8
  },
  miniChartWrap: {
    marginTop: 4
  },
  confirmZeroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.faint,
    borderColor: colors.primary.border,
    borderWidth: 1,
    borderRadius: radii.full,
    paddingVertical: 8,
    marginTop: 12
  },
  confirmZeroText: {
    ...typography.captionBold,
    color: colors.primary.base
  },
  streakCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: spacing.md
  },
  streakColCard: {
    flex: 1,
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.base
  },
  streakColLabel: {
    ...typography.caption,
    color: colors.text.muted
  },
  streakColValRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 6
  },
  streakColNum: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary
  },
  streakColUnit: {
    ...typography.caption,
    color: colors.text.secondary,
    marginLeft: 4
  },
  feedbackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#122018',
    borderColor: '#1D3325',
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.base,
    marginBottom: spacing.md
  },
  feedbackHeartWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary.faint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  feedbackTextCol: {
    flex: 1
  },
  feedbackTitle: {
    ...typography.bodyBold,
    color: colors.primary.base,
    fontSize: 13
  },
  feedbackSub: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 1
  },
  weeklyCard: {
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.base,
    marginBottom: spacing.md
  },
  weeklyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm
  },
  weeklyTitle: {
    ...typography.bodyBold,
    color: colors.text.primary
  },
  weeklyAvgText: {
    ...typography.caption,
    color: colors.text.muted
  },
  tabContent: {
    marginTop: spacing.sm
  },
  tabHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm
  },
  sectionHeading: {
    ...typography.h3,
    color: colors.text.primary,
    fontSize: 15
  },
  emptyWrap: {
    padding: 24,
    alignItems: 'center'
  },
  emptyText: {
    ...typography.body,
    color: colors.text.muted
  },
  entryRow: {
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: 8
  },
  entryLeft: {
    flex: 1
  },
  entryQuantity: {
    ...typography.bodyBold,
    color: colors.text.primary
  },
  entryTime: {
    ...typography.caption,
    color: colors.text.muted,
    marginTop: 2
  },
  entryNotes: {
    ...typography.caption,
    color: colors.text.secondary,
    fontStyle: 'italic',
    marginTop: 4
  },
  insightCard: {
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.base,
    marginBottom: spacing.sm
  },
  insightHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  insightCategory: {
    ...typography.captionBold,
    color: colors.primary.base
  },
  insightQuality: {
    ...typography.caption,
    color: colors.text.muted,
    fontSize: 10
  },
  insightTitle: {
    ...typography.bodyBold,
    color: colors.text.primary,
    fontSize: 14
  },
  insightSummary: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: 4,
    fontSize: 12
  }
});
