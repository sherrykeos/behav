import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper, Card, Button, Badge, EmptyState } from '@/components/common';
import { WeekBarChart } from '@/components/insights/WeekBarChart';
import { GoalModal } from '@/components/goals/GoalModal';
import { useBehaviors } from '@/context/BehaviorContext';
import { colors, radii, shadows, spacing, typography } from '@/theme';
import { type BehaviorStats } from '@/db';
import { type Goal } from '@/types/database';

export default function InsightsScreen() {
  const {
    behaviors,
    goals,
    todayEntries,
    getBehaviorStats,
    getOverallSummary,
    createGoal,
    deleteGoal,
  } = useBehaviors();

  const [selectedBehaviorId, setSelectedBehaviorId] = useState<string | null>(null);
  const [stats, setStats] = useState<BehaviorStats | null>(null);
  const [overallSummary, setOverallSummary] = useState<{ activeHabitCount: number; totalLogsToday: number; totalLogs7Days: number } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [goalToEdit, setGoalToEdit] = useState<Goal | null>(null);

  // Set default selected behavior
  useEffect(() => {
    if (behaviors.length > 0 && !selectedBehaviorId) {
      setSelectedBehaviorId(behaviors[0].id);
    } else if (behaviors.length === 0) {
      setSelectedBehaviorId(null);
    }
  }, [behaviors, selectedBehaviorId]);

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const [summary, behaviorStats] = await Promise.all([
        getOverallSummary(),
        selectedBehaviorId ? getBehaviorStats(selectedBehaviorId) : Promise.resolve(null),
      ]);
      setOverallSummary(summary);
      setStats(behaviorStats);
    } catch (err) {
      console.error('Failed to load insights:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedBehaviorId, getBehaviorStats, getOverallSummary]);

  useEffect(() => {
    loadStats();
  }, [loadStats, todayEntries, goals]);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  const handleDeleteGoal = (goal: Goal) => {
    Alert.alert(
      'Remove Goal',
      `Are you sure you want to remove the goal "${goal.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteGoal(goal.id);
            } catch (err) {
              console.error('Failed to delete goal:', err);
            }
          },
        },
      ]
    );
  };

  const selectedBehavior = behaviors.find((b) => b.id === selectedBehaviorId);

  return (
    <ScreenWrapper scrollable>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Insights</Text>
        <Text style={styles.subtitle}>
          Honest trends, averages, and independently calculated streaks
        </Text>
      </View>

      {/* Habit Selector Chips */}
      {behaviors.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.habitsScroll}>
          {behaviors.map((b) => {
            const isSelected = b.id === selectedBehaviorId;
            return (
              <Pressable
                key={b.id}
                onPress={() => setSelectedBehaviorId(b.id)}
                style={[styles.habitChip, isSelected && styles.habitChipSelected]}
              >
                <Text style={[styles.habitChipText, isSelected && styles.habitChipTextSelected]}>
                  {b.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Main Content */}
      {behaviors.length === 0 ? (
        <Card style={styles.emptyCard}>
          <EmptyState
            icon={<Ionicons name="stats-chart-outline" size={26} color={colors.primary} />}
            title="No Habits Tracked"
            description="Create behaviors in the Behaviors tab and log occurrences to unlock real trends and averages."
          />
        </Card>
      ) : isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>Calculating insights...</Text>
        </View>
      ) : stats ? (
        <>
          {/* Behavior Detail Card */}
          <Card style={styles.statsCard}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>{stats.behaviorName}</Text>
                <Text style={styles.cardSubtitle}>
                  7-Day Breakdown ({stats.behaviorUnit})
                </Text>
              </View>
              {stats.dailyLimit !== null && (
                <Badge
                  label={
                    stats.currentStreakDays > 0
                      ? `${stats.currentStreakDays}-day streak under limit`
                      : 'Limit tracking active'
                  }
                  variant={stats.currentStreakDays > 0 ? 'sage' : 'neutral'}
                />
              )}
            </View>

            {/* 7-Day Chart */}
            <WeekBarChart
              data={stats.past7Days}
              dailyLimit={stats.dailyLimit}
              unit={stats.behaviorUnit}
            />

            {/* Key Metrics Grid */}
            <View style={styles.metricsGrid}>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>7-Day Total</Text>
                <Text style={styles.metricValue}>
                  {stats.total7Days} <Text style={styles.metricUnit}>{stats.behaviorUnit}</Text>
                </Text>
                <Text style={styles.metricSub}>Avg {stats.avg7Days}/day</Text>
              </View>

              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>30-Day Total</Text>
                <Text style={styles.metricValue}>
                  {stats.total30Days} <Text style={styles.metricUnit}>{stats.behaviorUnit}</Text>
                </Text>
                <Text style={styles.metricSub}>Avg {stats.avg30Days}/day</Text>
              </View>
            </View>

            {/* Trend Indicator */}
            {stats.trendPercent7Days !== null && (
              <View style={styles.trendRow}>
                <Ionicons
                  name={
                    stats.trendPercent7Days < 0
                      ? 'trending-down-outline'
                      : stats.trendPercent7Days > 0
                      ? 'trending-up-outline'
                      : 'remove-outline'
                  }
                  size={18}
                  color={stats.trendPercent7Days <= 0 ? colors.sageText : colors.peachText}
                />
                <Text style={styles.trendText}>
                  {stats.trendPercent7Days < 0
                    ? `Reduced by ${Math.abs(stats.trendPercent7Days)}% compared to prior 7 days`
                    : stats.trendPercent7Days > 0
                    ? `Increased by ${stats.trendPercent7Days}% compared to prior 7 days`
                    : 'Steady compared to prior 7 days'}
                </Text>
              </View>
            )}

            {/* Peak day */}
            {stats.peakDay && stats.peakDay.value > 0 && (
              <View style={styles.peakRow}>
                <Ionicons name="flag-outline" size={14} color={colors.textTertiary} />
                <Text style={styles.peakText}>
                  Peak day: {stats.peakDay.value} {stats.behaviorUnit} on {stats.peakDay.date}
                </Text>
              </View>
            )}
          </Card>

          {/* Active Goals Section */}
          <View style={styles.goalsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Goals</Text>
              <Button
                label="New Goal"
                onPress={() => {
                  setGoalToEdit(null);
                  setGoalModalVisible(true);
                }}
                variant="secondary"
                size="sm"
                icon={<Ionicons name="add" size={14} color={colors.primary} />}
              />
            </View>

            {goals.length === 0 ? (
              <Card variant="subtle" style={styles.emptyGoalsCard}>
                <Text style={styles.emptyGoalsTitle}>No Goals Set</Text>
                <Text style={styles.emptyGoalsDesc}>
                  Set a daily ceiling or adherence streak goal to track your
                  progress toward cutting down.
                </Text>
              </Card>
            ) : (
              goals.map((g) => {
                const associatedHabit = behaviors.find((b) => b.id === g.behaviorId);
                return (
                  <Card key={g.id} style={styles.goalCard}>
                    <View style={styles.goalHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.goalTitle}>{g.title}</Text>
                        <Text style={styles.goalMeta}>
                          {associatedHabit ? associatedHabit.name : 'All habits'} •{' '}
                          {g.targetValue ? `Target: ≤ ${g.targetValue}` : 'Tracking'}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => handleDeleteGoal(g)}
                        hitSlop={8}
                        accessibilityLabel="Delete goal"
                      >
                        <Ionicons name="trash-outline" size={16} color={colors.danger} />
                      </Pressable>
                    </View>
                  </Card>
                );
              })
            )}
          </View>
        </>
      ) : null}

      {/* Goal Modal */}
      <GoalModal
        visible={goalModalVisible}
        behaviors={behaviors}
        goalToEdit={goalToEdit}
        onClose={() => setGoalModalVisible(false)}
        onSave={async (data) => {
          await createGoal(data);
          await loadStats();
        }}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    ...typography.titleLarge,
  },
  subtitle: {
    ...typography.bodyMedium,
    marginTop: spacing.xs,
  },
  habitsScroll: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  habitChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSubtle,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  habitChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  habitChipText: {
    ...typography.labelLarge,
    fontSize: 13,
    color: colors.textSecondary,
  },
  habitChipTextSelected: {
    color: colors.textInverse,
  },
  emptyCard: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  loadingContainer: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  loadingText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  statsCard: {
    marginBottom: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  cardTitle: {
    ...typography.titleMedium,
    fontSize: 18,
  },
  cardSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  metricBox: {
    flex: 1,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  metricLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  metricValue: {
    ...typography.titleMedium,
    fontSize: 20,
    color: colors.textPrimary,
  },
  metricUnit: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  metricSub: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    marginTop: 4,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  trendText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
  },
  peakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  peakText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontSize: 11,
  },
  goalsSection: {
    marginBottom: spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm + 2,
  },
  sectionTitle: {
    ...typography.titleMedium,
    fontSize: 17,
  },
  emptyGoalsCard: {
    paddingVertical: spacing.md,
  },
  emptyGoalsTitle: {
    ...typography.labelLarge,
    fontSize: 13,
    marginBottom: 4,
  },
  emptyGoalsDesc: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  goalCard: {
    marginBottom: spacing.sm,
    paddingVertical: spacing.md,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalTitle: {
    ...typography.labelLarge,
    fontSize: 14,
    color: colors.textPrimary,
  },
  goalMeta: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
