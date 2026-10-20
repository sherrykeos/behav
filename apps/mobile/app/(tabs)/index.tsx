import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radii } from '../../src/theme';
import {
  Card,
  Button,
  AppIcon,
  BehaviorIconBadge,
  CircularProgress,
  StreakBadge,
  EmptyState
} from '../../src/components';
import { useAuth } from '../../src/context/AuthContext';
import { useDatabase } from '../../src/context/DatabaseContext';
import { Behavior, StreakState, Goal } from '@behav/domain';

export default function HomeDashboardScreen() {
  const { user } = useAuth();
  const { behaviorRepo, goalRepo, streakRepo, entryRepo, reviewRepo, recalculateBehavior } = useDatabase();

  const [behaviors, setBehaviors] = useState<Behavior[]>([]);
  const [goalsByBehavior, setGoalsByBehavior] = useState<Map<string, Goal[]>>(new Map());
  const [streaksByGoal, setStreaksByGoal] = useState<Map<string, StreakState>>(new Map());
  const [todayLoggedCounts, setTodayLoggedCounts] = useState<Map<string, number>>(new Map());
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getFormattedDate = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  const loadDashboardData = async () => {
    if (!user) return;
    try {
      let list = await behaviorRepo.listByUser(user.id, false);

      // Seed showcase starter behaviors on first launch if empty
      if (list.length === 0) {
        const b1 = await behaviorRepo.create({
          userId: user.id,
          name: 'Cigarettes',
          description: 'Abstinence from smoking',
          category: 'SUBSTANCE',
          icon: 'cigarette',
          accentColor: '#FB923C',
          measurementType: 'COUNT',
          unit: 'cigarettes'
        });
        await goalRepo.create({
          userId: user.id,
          behaviorId: b1.id,
          goalType: 'ABSTINENCE',
          targetValue: 0,
          evaluationPeriod: 'DAILY',
          startsAt: new Date().toISOString(),
          active: true
        });

        const b2 = await behaviorRepo.create({
          userId: user.id,
          name: 'Screen Time',
          description: 'Mindful device limit',
          category: 'DIGITAL',
          icon: 'time',
          accentColor: '#38BDF8',
          measurementType: 'NUMERIC',
          unit: 'min'
        });
        await goalRepo.create({
          userId: user.id,
          behaviorId: b2.id,
          goalType: 'REDUCTION',
          targetValue: 120,
          evaluationPeriod: 'DAILY',
          startsAt: new Date().toISOString(),
          active: true
        });

        const b3 = await behaviorRepo.create({
          userId: user.id,
          name: 'Junk Food',
          description: 'Reduce processed snacks',
          category: 'HEALTH',
          icon: 'fast-food',
          accentColor: '#FBBF24',
          measurementType: 'COUNT',
          unit: 'meals'
        });
        await goalRepo.create({
          userId: user.id,
          behaviorId: b3.id,
          goalType: 'REDUCTION',
          targetValue: 1,
          evaluationPeriod: 'DAILY',
          startsAt: new Date().toISOString(),
          active: true
        });

        const b4 = await behaviorRepo.create({
          userId: user.id,
          name: 'Alcohol',
          description: 'Maintain zero drinks',
          category: 'SUBSTANCE',
          icon: 'wine',
          accentColor: '#FB7185',
          measurementType: 'COUNT',
          unit: 'drinks'
        });
        await goalRepo.create({
          userId: user.id,
          behaviorId: b4.id,
          goalType: 'ABSTINENCE',
          targetValue: 0,
          evaluationPeriod: 'DAILY',
          startsAt: new Date().toISOString(),
          active: true
        });

        list = await behaviorRepo.listByUser(user.id, false);
      }

      setBehaviors(list);

      const todayStr = new Date().toISOString().substring(0, 10);
      const gMap = new Map<string, Goal[]>();
      const sMap = new Map<string, StreakState>();
      const countMap = new Map<string, number>();

      for (const b of list) {
        const bGoals = await goalRepo.listByBehavior(user.id, b.id);
        gMap.set(b.id, bGoals);

        for (const g of bGoals) {
          const s = await streakRepo.findByGoalId(g.id, user.id);
          if (s) sMap.set(g.id, s);
        }

        const todayEntries = await entryRepo.listByBehaviorAndRange(user.id, b.id, todayStr, todayStr);
        const totalToday = todayEntries.reduce((sum, e) => sum + e.quantity, 0);
        countMap.set(b.id, totalToday);
      }

      setGoalsByBehavior(gMap);
      setStreaksByGoal(sMap);
      setTodayLoggedCounts(countMap);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [user])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const handleQuickIncrement = async (behavior: Behavior) => {
    if (!user) return;
    try {
      await entryRepo.create({
        userId: user.id,
        behaviorId: behavior.id,
        quantity: 1,
        occurredAt: new Date().toISOString(),
        timezone: 'UTC',
        contextTags: []
      });
      await recalculateBehavior(behavior.id);
      loadDashboardData();
    } catch {
      Alert.alert('Log Failed', 'Unable to record quick entry.');
    }
  };

  // Calculate Progress stats for "Today's Overview"
  let onTrackCount = 0;
  let overLimitCount = 0;
  let notLoggedCount = 0;

  behaviors.forEach((b) => {
    const goals = goalsByBehavior.get(b.id) || [];
    const count = todayLoggedCounts.get(b.id) || 0;
    const primaryGoal = goals[0];

    if (!primaryGoal) {
      if (count === 0) notLoggedCount++;
      else onTrackCount++;
      return;
    }

    if (primaryGoal.goalType === 'ABSTINENCE') {
      if (count === 0) onTrackCount++;
      else overLimitCount++;
    } else if (primaryGoal.goalType === 'REDUCTION') {
      if (count <= primaryGoal.targetValue) onTrackCount++;
      else overLimitCount++;
    } else {
      // FREQUENCY
      if (count >= primaryGoal.targetValue) onTrackCount++;
      else if (count === 0) notLoggedCount++;
      else onTrackCount++;
    }
  });

  const totalBehaviors = behaviors.length || 1;
  const progressPercent = onTrackCount / totalBehaviors;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
        {/* Top Greeting & Date Header */}
        <View style={styles.topHeader}>
          <View style={styles.greetingCol}>
            <Text style={styles.greetingTitle}>{getGreeting()}</Text>
            <Text style={styles.greetingDate}>{getFormattedDate()}</Text>
            <Text style={styles.greetingQuote}>
              "Awareness is the first step toward change."
            </Text>
          </View>
          {/* Mountain Sunset Avatar */}
          <TouchableOpacity
            style={styles.avatarButton}
            onPress={() => router.push('/(tabs)/settings')}
            activeOpacity={0.8}
          >
            <View style={styles.avatarInner}>
              <AppIcon name="sparkles" size={16} color={colors.warm.peach} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Today's Overview Hero Card */}
        <View style={styles.overviewCard}>
          <Text style={styles.sectionTitle}>Today's Overview</Text>

          <View style={styles.donutRow}>
            {/* SVG Donut Ring */}
            <CircularProgress
              size={82}
              strokeWidth={8}
              progress={progressPercent}
              color={colors.primary.base}
              trackColor="#17221B"
            />

            {/* Metrics Beside Donut */}
            <View style={styles.donutMetricCol}>
              <Text style={styles.donutRatioText}>
                {onTrackCount} / {behaviors.length}
              </Text>
              <Text style={styles.donutSubText}>behaviors on track</Text>
            </View>
          </View>

          {/* 3 Status Dots Row */}
          <View style={styles.statusDotsRow}>
            <View style={styles.statusDotItem}>
              <View style={[styles.statusDot, { backgroundColor: colors.primary.base }]} />
              <Text style={styles.statusDotText}>{onTrackCount} On track</Text>
            </View>

            <View style={styles.statusDotItem}>
              <View style={[styles.statusDot, { backgroundColor: colors.accents.coral }]} />
              <Text style={styles.statusDotText}>{overLimitCount} Over limit</Text>
            </View>

            <View style={styles.statusDotItem}>
              <View style={[styles.statusDot, { backgroundColor: colors.text.muted }]} />
              <Text style={styles.statusDotText}>{notLoggedCount} Not logged</Text>
            </View>
          </View>
        </View>

        {/* Quick Log 2x2 Grid Section */}
        <View style={styles.quickLogSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Quick Log</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/behaviors')}>
              <Text style={styles.seeAllText}>Manage</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.grid2x2}>
            {behaviors.slice(0, 4).map((b) => {
              const count = todayLoggedCounts.get(b.id) || 0;
              const formattedStatus =
                b.measurementType === 'NUMERIC' && (b.unit === 'min' || b.unit === 'minutes')
                  ? `${Math.floor(count / 60)}h ${count % 60}m`
                  : `${count} today`;

              return (
                <TouchableOpacity
                  key={b.id}
                  style={styles.gridCard}
                  onPress={() => router.push(`/behavior/${b.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.gridCardTop}>
                    <BehaviorIconBadge
                      icon={b.icon || 'sparkles'}
                      color={b.accentColor}
                      size={18}
                      badgeSize={38}
                    />

                    {/* Quick + Button */}
                    <TouchableOpacity
                      style={styles.quickAddBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleQuickIncrement(b);
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <AppIcon name="plus" size={16} color={colors.text.secondary} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.gridCardBottom}>
                    <Text style={styles.gridBehaviorName} numberOfLines={1}>
                      {b.name}
                    </Text>
                    <Text style={styles.gridBehaviorStatus}>{formattedStatus}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Streak Highlights Row */}
        {behaviors.length > 0 && (
          <View style={styles.streaksSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Active Streaks</Text>
              <TouchableOpacity onPress={() => router.push(`/(tabs)/stats`)}>
                <Text style={styles.seeAllText}>Stats</Text>
              </TouchableOpacity>
            </View>

            {behaviors.slice(0, 2).map((b) => {
              const goals = goalsByBehavior.get(b.id) || [];
              const primaryGoal = goals[0];
              const streak = primaryGoal ? streaksByGoal.get(primaryGoal.id) : null;
              const currentStreak = streak ? streak.currentStreak : 0;

              return (
                <TouchableOpacity
                  key={b.id}
                  style={styles.streakHighlightCard}
                  onPress={() => router.push(`/behavior/${b.id}/streaks`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.streakLeft}>
                    <BehaviorIconBadge
                      icon={b.icon || 'flame'}
                      color={b.accentColor}
                      size={18}
                      badgeSize={36}
                    />
                    <View style={{ marginLeft: 12 }}>
                      <Text style={styles.streakName}>{b.name}</Text>
                      <Text style={styles.streakSub}>
                        {primaryGoal?.goalType === 'ABSTINENCE'
                          ? 'Abstinence goal'
                          : 'Target goal'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.streakRightPill}>
                    <AppIcon name="flame" size={13} color={colors.primary.base} style={{ marginRight: 4 }} />
                    <Text style={styles.streakPillText}>{currentStreak} days</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Warm Encouragement Banner (matching reference style) */}
        <View style={styles.motivationBanner}>
          <View style={styles.motivationIconWrap}>
            <AppIcon name="heart" size={18} color={colors.warm.peach} />
          </View>
          <View style={styles.motivationContent}>
            <Text style={styles.motivationTitle}>Small steps create big change</Text>
            <Text style={styles.motivationDesc}>
              Measure without judgment. Understanding your habits is the key to lasting progress.
            </Text>
          </View>
        </View>
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
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg
  },
  greetingCol: {
    flex: 1,
    paddingRight: 12
  },
  greetingTitle: {
    ...typography.h1,
    color: colors.text.primary,
    fontSize: 27
  },
  greetingDate: {
    ...typography.captionBold,
    color: colors.text.muted,
    marginTop: 2
  },
  greetingQuote: {
    ...typography.quote,
    color: colors.text.secondary,
    marginTop: 6
  },
  avatarButton: {
    marginTop: 4
  },
  avatarInner: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#2A2016',
    borderWidth: 1,
    borderColor: '#4A3728',
    alignItems: 'center',
    justifyContent: 'center'
  },
  overviewCard: {
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.base,
    marginBottom: spacing.lg
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text.primary,
    fontWeight: '700',
    fontSize: 15,
    marginBottom: spacing.md
  },
  donutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.base
  },
  donutMetricCol: {
    marginLeft: 20
  },
  donutRatioText: {
    ...typography.displayMedium,
    color: colors.text.primary,
    fontSize: 28
  },
  donutSubText: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2
  },
  statusDotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.background.border,
    paddingTop: 12
  },
  statusDotItem: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6
  },
  statusDotText: {
    ...typography.caption,
    color: colors.text.secondary,
    fontSize: 11
  },
  quickLogSection: {
    marginBottom: spacing.lg
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs
  },
  seeAllText: {
    ...typography.captionBold,
    color: colors.primary.base,
    fontSize: 12
  },
  grid2x2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10
  },
  gridCard: {
    width: '48%',
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: 12,
    justifyContent: 'space-between',
    minHeight: 96
  },
  gridCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  quickAddBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.background.elevated,
    borderColor: colors.background.border,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  gridCardBottom: {
    marginTop: 10
  },
  gridBehaviorName: {
    ...typography.bodyBold,
    color: colors.text.primary,
    fontSize: 13
  },
  gridBehaviorStatus: {
    ...typography.caption,
    color: colors.text.muted,
    marginTop: 2,
    fontSize: 11
  },
  streaksSection: {
    marginBottom: spacing.lg
  },
  streakHighlightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: 8
  },
  streakLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  streakName: {
    ...typography.bodyBold,
    color: colors.text.primary
  },
  streakSub: {
    ...typography.caption,
    color: colors.text.muted,
    marginTop: 1
  },
  streakRightPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#162019',
    borderColor: '#223326',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full
  },
  streakPillText: {
    ...typography.captionBold,
    color: colors.primary.base,
    fontSize: 12
  },
  motivationBanner: {
    flexDirection: 'row',
    backgroundColor: colors.warm.card,
    borderColor: colors.warm.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.base,
    alignItems: 'flex-start'
  },
  motivationIconWrap: {
    marginRight: 12,
    marginTop: 2
  },
  motivationContent: {
    flex: 1
  },
  motivationTitle: {
    ...typography.h3,
    color: colors.warm.cream,
    fontSize: 14
  },
  motivationDesc: {
    ...typography.caption,
    color: colors.text.secondary,
    lineHeight: 16,
    marginTop: 4
  }
});
