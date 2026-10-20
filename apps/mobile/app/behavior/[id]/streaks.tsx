import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity
} from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radii } from '../../../src/theme';
import { Header, CircularProgress, AppIcon, BehaviorIconBadge, Card } from '../../../src/components';
import { useAuth } from '../../../src/context/AuthContext';
import { useDatabase } from '../../../src/context/DatabaseContext';
import { calculateStreak, Goal, Behavior, DayEvaluationResult } from '@behav/domain';

export default function IndependentStreakViewScreen() {
  const { id: behaviorId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { behaviorRepo, goalRepo, aggregateRepo } = useDatabase();

  const [behavior, setBehavior] = useState<Behavior | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [streakBreakdowns, setStreakBreakdowns] = useState<
    { goal: Goal; current: number; longest: number; dayResults: DayEvaluationResult[] }[]
  >([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadStreaks = async () => {
    if (!user || !behaviorId) return;
    try {
      const b = await behaviorRepo.findById(behaviorId, user.id);
      setBehavior(b);

      const gList = await goalRepo.listByBehavior(user.id, behaviorId);
      setGoals(gList);

      const aggregates = await aggregateRepo.listByBehaviorAndRange(
        user.id,
        behaviorId,
        '2000-01-01',
        '2100-01-01'
      );

      const breakdowns = await Promise.all(
        gList.map(async (goal) => {
          const versions = await goalRepo.listVersions(goal.id, user.id);
          const result = calculateStreak(goal, aggregates, versions);
          return {
            goal,
            current: result.currentStreak,
            longest: result.longestStreak,
            dayResults: result.dayResults.slice(-7) // 7 days of current week
          };
        })
      );

      setStreakBreakdowns(breakdowns);
    } catch (err) {
      console.error('Failed to load streak breakdowns:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadStreaks();
    }, [user, behaviorId])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadStreaks();
  };

  const primaryBreakdown = streakBreakdowns[0];
  const currentStreak = primaryBreakdown ? primaryBreakdown.current : 0;
  const longestStreak = primaryBreakdown ? primaryBreakdown.longest : Math.max(currentStreak, 1);
  const progressRatio = longestStreak > 0 ? Math.min(currentStreak / longestStreak, 1) : 0;

  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <Header title="Streaks" onBack={() => router.back()} />

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
        {/* Behavior Badge Selector */}
        {behavior && (
          <View style={styles.behaviorBadgeRow}>
            <View style={styles.behaviorBadge}>
              <BehaviorIconBadge
                icon={behavior.icon || 'sparkles'}
                color={behavior.accentColor}
                size={16}
                badgeSize={30}
              />
              <Text style={styles.behaviorBadgeText}>{behavior.name}</Text>
            </View>
          </View>
        )}

        {/* Giant Circular Streak Ring (Screen 9 in Showcase) */}
        <View style={styles.ringContainer}>
          <CircularProgress
            size={190}
            strokeWidth={12}
            progress={progressRatio > 0 ? progressRatio : 0.08}
            color={colors.primary.base}
            trackColor="#14221A"
          >
            <View style={styles.ringCenter}>
              <Text style={styles.streakCountNumber}>{currentStreak}</Text>
              <Text style={styles.streakCountLabel}>Day Streak</Text>
            </View>
          </CircularProgress>

          <Text style={styles.longestStreakText}>
            Longest Streak: {longestStreak} days
          </Text>
        </View>

        {/* Weekday Progression Circles (Mon to Sun) */}
        <View style={styles.progressionCard}>
          <View style={styles.progressionRow}>
            {weekdays.map((day, idx) => {
              const dayEval = primaryBreakdown?.dayResults[idx];
              const isQualified = dayEval?.qualification === 'QUALIFIED';
              const isLapse = dayEval?.qualification === 'LAPSE';

              return (
                <View key={day} style={styles.progressionCol}>
                  <View
                    style={[
                      styles.progressionCircle,
                      isQualified && styles.progCircleQualified,
                      isLapse && styles.progCircleLapse
                    ]}
                  >
                    {isQualified ? (
                      <AppIcon name="check" size={14} color="#0B0F0D" />
                    ) : isLapse ? (
                      <View style={styles.lapseDot} />
                    ) : null}
                  </View>
                  <Text style={styles.progressionDayText}>{day}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Warm Encouragement Motivation Card (matching reference) */}
        <View style={styles.motivationCard}>
          <Text style={styles.motivationHeading}>One day at a time.</Text>
          <Text style={styles.motivationBody}>
            Your consistency is building a stronger you.
          </Text>
        </View>

        {/* Explainability Section */}
        <View style={styles.explainabilityCard}>
          <Text style={styles.explainTitle}>Independent Streak Rules</Text>
          <Text style={styles.explainBody}>
            Every streak is evaluated independently against this behavior's goal. A lapse here never resets your other habits. Unlogged days remain pending until confirmed via Daily Review.
          </Text>
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
    paddingBottom: 40
  },
  behaviorBadgeRow: {
    alignItems: 'center',
    marginVertical: spacing.md
  },
  behaviorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full
  },
  behaviorBadgeText: {
    ...typography.bodyBold,
    color: colors.text.primary,
    marginLeft: 8,
    fontSize: 13
  },
  ringContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24
  },
  ringCenter: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  streakCountNumber: {
    fontSize: 54,
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: -1.5,
    lineHeight: 58
  },
  streakCountLabel: {
    ...typography.captionBold,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 2
  },
  longestStreakText: {
    ...typography.captionBold,
    color: colors.text.secondary,
    marginTop: 18,
    fontSize: 13
  },
  progressionCard: {
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.base,
    marginVertical: spacing.md
  },
  progressionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  progressionCol: {
    alignItems: 'center'
  },
  progressionCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background.elevated,
    borderColor: colors.background.border,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6
  },
  progCircleQualified: {
    backgroundColor: colors.primary.base,
    borderColor: colors.primary.base
  },
  progCircleLapse: {
    backgroundColor: colors.accents.coral,
    borderColor: colors.accents.coral
  },
  lapseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF'
  },
  progressionDayText: {
    ...typography.caption,
    color: colors.text.muted,
    fontSize: 10
  },
  motivationCard: {
    backgroundColor: colors.warm.card,
    borderColor: colors.warm.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.base,
    marginVertical: spacing.sm,
    alignItems: 'center'
  },
  motivationHeading: {
    ...typography.h3,
    color: colors.warm.cream,
    fontSize: 14,
    textAlign: 'center'
  },
  motivationBody: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: 3
  },
  explainabilityCard: {
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.base,
    marginTop: spacing.md
  },
  explainTitle: {
    ...typography.captionBold,
    color: colors.text.primary,
    marginBottom: 4
  },
  explainBody: {
    ...typography.caption,
    color: colors.text.muted,
    lineHeight: 17
  }
});
