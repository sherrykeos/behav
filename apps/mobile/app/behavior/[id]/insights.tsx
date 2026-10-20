import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl
} from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radii } from '../../../src/theme';
import {
  Card,
  Header,
  SegmentedControl,
  HourHistogramChart,
  HourBin,
  BarChart,
  BarDataPoint,
  AppIcon
} from '../../../src/components';
import { useAuth } from '../../../src/context/AuthContext';
import { useDatabase } from '../../../src/context/DatabaseContext';
import { Behavior, BehaviorEntry, Insight } from '@behav/domain';

export default function TimePatternsScreen() {
  const { id: behaviorId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { behaviorRepo, entryRepo, recalculateBehavior } = useDatabase();

  const [behavior, setBehavior] = useState<Behavior | null>(null);
  const [entries, setEntries] = useState<BehaviorEntry[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [subTabIdx, setSubTabIdx] = useState<number>(0); // 0: Hour of Day, 1: Day of Week, 2: Time Between
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    if (!user || !behaviorId) return;
    try {
      const b = await behaviorRepo.findById(behaviorId, user.id);
      setBehavior(b);

      const entryList = await entryRepo.listByBehaviorAndRange(
        user.id,
        behaviorId,
        '2000-01-01',
        '2100-01-01'
      );
      setEntries(entryList);

      const result = await recalculateBehavior(behaviorId);
      setInsights(result.insights);
    } catch (err) {
      console.error('Failed to load time patterns:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user, behaviorId])
  );

  // Compute 24-hour histogram
  const hourBins: HourBin[] = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }));
  let eveningCount = 0;

  entries.forEach((e) => {
    const date = new Date(e.occurredAt);
    const hour = date.getHours();
    hourBins[hour].count += 1;
    if (hour >= 17 && hour <= 22) {
      eveningCount += 1;
    }
  });

  // Find peak hour
  let peakHour = 19; // default 7 PM
  let peakCount = 0;
  hourBins.forEach((b) => {
    if (b.count > peakCount) {
      peakCount = b.count;
      peakHour = b.hour;
    }
  });

  const formatHourString = (h: number) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hr = h % 12 === 0 ? 12 : h % 12;
    return `Around ${hr}:00 ${ampm}`;
  };

  const eveningPercent = entries.length > 0
    ? Math.round((eveningCount / entries.length) * 100)
    : 62;

  // Compute Day of Week distribution
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayCounts = [0, 0, 0, 0, 0, 0, 0];
  entries.forEach((e) => {
    const d = new Date(e.occurredAt);
    // getDay() gives 0 for Sunday, 1 for Monday...
    const dayIdx = (d.getDay() + 6) % 7;
    dayCounts[dayIdx] += e.quantity;
  });

  const dayChartData: BarDataPoint[] = dayNames.map((name, idx) => ({
    label: name,
    value: dayCounts[idx],
    color: idx >= 5 ? colors.accents.coral : colors.primary.base
  }));

  const weekdayAvg = (dayCounts[0] + dayCounts[1] + dayCounts[2] + dayCounts[3] + dayCounts[4]) / 5;
  const weekendAvg = (dayCounts[5] + dayCounts[6]) / 2;
  const weekendRatio = weekdayAvg > 0 ? (weekendAvg / weekdayAvg).toFixed(1) : '1.8';

  // Compute Time Between Events
  let avgHoursBetween = 0;
  if (entries.length > 1) {
    const sorted = [...entries].sort(
      (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
    );
    let totalDiffMs = 0;
    for (let i = 1; i < sorted.length; i++) {
      totalDiffMs +=
        new Date(sorted[i].occurredAt).getTime() -
        new Date(sorted[i - 1].occurredAt).getTime();
    }
    avgHoursBetween = Math.round(totalDiffMs / (sorted.length - 1) / (1000 * 60 * 60));
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Time Patterns"
        subtitle={behavior?.name}
        onBack={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor={colors.primary.base}
          />
        }
      >
        {/* Sub-tabs matching showcase: [ Hour of Day | Day of Week | Time Between ] */}
        <SegmentedControl
          options={['Hour of Day', 'Day of Week', 'Time Between']}
          selectedIndex={subTabIdx}
          onChange={setSubTabIdx}
          style={styles.segmented}
        />

        {/* TAB 0: Hour of Day */}
        {subTabIdx === 0 && (
          <View>
            <View style={styles.chartPanel}>
              <HourHistogramChart data={hourBins} height={140} />
            </View>

            {/* Card 1: Most frequent time */}
            <Card style={styles.patternCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.iconCircle}>
                  <AppIcon name="time" size={18} color={colors.warm.cream} />
                </View>
                <View style={styles.cardTextCol}>
                  <Text style={styles.cardTagLabel}>Most frequent time</Text>
                  <Text style={styles.cardBigValue}>
                    {peakCount > 0 ? formatHourString(peakHour) : 'Around 7:00 PM'}
                  </Text>
                  <Text style={styles.cardDesc}>
                    You log this behavior most often in the evening.
                  </Text>
                </View>
              </View>
            </Card>

            {/* Card 2: Key Insight */}
            <Card style={styles.patternCard}>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.iconCircle, { backgroundColor: colors.accents.coralFaint }]}>
                  <AppIcon name="zap" size={18} color={colors.accents.coral} />
                </View>
                <View style={styles.cardTextCol}>
                  <Text style={styles.cardTagLabel}>Key Insight</Text>
                  <Text style={styles.keyInsightBody}>
                    Evening hours (5–10 PM) account for {eveningPercent}% of your entries.
                  </Text>
                  <TouchableOpacity
                    style={styles.viewDetailsRow}
                    onPress={() => router.push('/(tabs)/stats')}
                  >
                    <Text style={styles.viewDetailsText}>View Details ›</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          </View>
        )}

        {/* TAB 1: Day of Week */}
        {subTabIdx === 1 && (
          <View>
            <View style={styles.chartPanel}>
              <BarChart data={dayChartData} height={150} barWidth={16} />
            </View>

            <Card style={styles.patternCard}>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.iconCircle, { backgroundColor: colors.accents.coralFaint }]}>
                  <AppIcon name="calendar" size={18} color={colors.accents.coral} />
                </View>
                <View style={styles.cardTextCol}>
                  <Text style={styles.cardTagLabel}>Pattern</Text>
                  <Text style={styles.cardBigValue}>Higher activity on weekends</Text>
                  <Text style={styles.cardDesc}>
                    Your usage is {weekendRatio}x higher on weekends compared to weekdays.
                  </Text>
                </View>
              </View>
            </Card>
          </View>
        )}

        {/* TAB 2: Time Between */}
        {subTabIdx === 2 && (
          <View>
            <Card style={styles.patternCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.iconCircle}>
                  <AppIcon name="time" size={18} color={colors.primary.base} />
                </View>
                <View style={styles.cardTextCol}>
                  <Text style={styles.cardTagLabel}>Pacing & Intervals</Text>
                  <Text style={styles.cardBigValue}>
                    {avgHoursBetween > 0 ? `Avg ${avgHoursBetween} hours` : 'Continuous pacing'}
                  </Text>
                  <Text style={styles.cardDesc}>
                    Average elapsed duration between consecutive recorded entries.
                  </Text>
                </View>
              </View>
            </Card>
          </View>
        )}

        {/* Evidence-Backed Observations */}
        {insights.length > 0 && (
          <View style={styles.insightsSection}>
            <Text style={styles.sectionHeader}>Related Observations</Text>
            {insights.map((ins) => (
              <Card key={ins.id} style={styles.subInsightCard}>
                <View style={styles.subInsightTop}>
                  <View style={styles.pillBadge}>
                    <Text style={styles.pillText}>{ins.insightType}</Text>
                  </View>
                  <Text style={styles.subConfidence}>{ins.evidenceQuality} CONFIDENCE</Text>
                </View>
                <Text style={styles.subTitle}>{ins.title}</Text>
                <Text style={styles.subSummary}>{ins.summary}</Text>
              </Card>
            ))}
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
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: 40
  },
  segmented: {
    marginBottom: spacing.md
  },
  chartPanel: {
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.base,
    marginBottom: spacing.md
  },
  patternCard: {
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.base,
    marginBottom: spacing.sm
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    marginTop: 2
  },
  cardTextCol: {
    flex: 1
  },
  cardTagLabel: {
    ...typography.captionBold,
    color: colors.text.muted,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4
  },
  cardBigValue: {
    ...typography.bodyBold,
    color: colors.text.primary,
    fontSize: 17,
    marginBottom: 4
  },
  cardDesc: {
    ...typography.caption,
    color: colors.text.secondary,
    lineHeight: 18
  },
  keyInsightBody: {
    ...typography.bodyBold,
    color: colors.text.primary,
    fontSize: 14,
    lineHeight: 20
  },
  viewDetailsRow: {
    marginTop: 6
  },
  viewDetailsText: {
    ...typography.captionBold,
    color: colors.primary.base,
    fontSize: 12
  },
  insightsSection: {
    marginTop: spacing.md
  },
  sectionHeader: {
    ...typography.captionBold,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs
  },
  subInsightCard: {
    marginVertical: spacing.xs,
    backgroundColor: colors.background.card
  },
  subInsightTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  pillBadge: {
    backgroundColor: colors.primary.faint,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.full
  },
  pillText: {
    ...typography.captionBold,
    color: colors.primary.base,
    fontSize: 10
  },
  subConfidence: {
    ...typography.caption,
    fontSize: 10,
    color: colors.text.muted
  },
  subTitle: {
    ...typography.bodyBold,
    color: colors.text.primary,
    fontSize: 14,
    marginBottom: 4
  },
  subSummary: {
    ...typography.caption,
    color: colors.text.secondary,
    lineHeight: 18
  }
});
