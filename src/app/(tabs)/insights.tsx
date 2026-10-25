import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper, Card, Badge } from '@/components/common';
import { colors, radii, spacing, typography } from '@/theme';

export default function InsightsScreen() {
  return (
    <ScreenWrapper scrollable>
      <View style={styles.header}>
        <Text style={styles.title}>Insights</Text>
        <Text style={styles.subtitle}>
          Honest trends, averages, and independently calculated streaks
        </Text>
      </View>

      <Card style={styles.contentCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.sectionTitle}>Goal Progress & Totals</Text>
          <Badge label="Phase 5" variant="peach" />
        </View>

        <View style={styles.emptyContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="stats-chart-outline" size={28} color={colors.peachText} />
          </View>
          <Text style={styles.emptyTitle}>No Recorded Data Yet</Text>
          <Text style={styles.emptyDescription}>
            In Phase 5, this screen will calculate real daily, weekly, and
            monthly totals and streak progress based strictly on your recorded
            SQLite data—with no fabricated metrics.
          </Text>
        </View>
      </Card>

      <Card variant="subtle">
        <Text style={styles.infoTitle}>Anti-Slop Metric Rules</Text>
        <Text style={styles.infoText}>• Zero fake gamification or arbitrary percentages</Text>
        <Text style={styles.infoText}>• Streaks calculated only from explicit goal rules</Text>
        <Text style={styles.infoText}>• Missing data is never shamed or punished</Text>
      </Card>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  title: {
    ...typography.titleLarge,
  },
  subtitle: {
    ...typography.bodyMedium,
    marginTop: spacing.xs,
  },
  contentCard: {
    marginBottom: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.titleSmall,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: radii.full,
    backgroundColor: colors.peach,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.titleSmall,
    marginBottom: spacing.xs,
  },
  emptyDescription: {
    ...typography.bodyMedium,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  infoTitle: {
    ...typography.titleSmall,
    fontSize: 15,
    marginBottom: spacing.sm,
  },
  infoText: {
    ...typography.bodyMedium,
    fontSize: 13,
    marginBottom: spacing.xs,
  },
});
