import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper, Card, Badge } from '@/components/common';
import { colors, radii, spacing, typography } from '@/theme';

export default function HistoryScreen() {
  const today = new Date().toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <ScreenWrapper scrollable>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        <Text style={styles.subtitle}>
          Browse past dates, review entries, and correct records
        </Text>
      </View>

      <Card style={styles.contentCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.sectionTitle}>Selected Date: {today}</Text>
          <Badge label="Phase 4" variant="sky" />
        </View>

        <View style={styles.emptyContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="calendar-outline" size={28} color={colors.skyText} />
          </View>
          <Text style={styles.emptyTitle}>No Entries Recorded</Text>
          <Text style={styles.emptyDescription}>
            In Phase 4, you will be able to navigate to any date, review daily
            totals, and edit or delete logged entries with complete data integrity.
          </Text>
        </View>
      </Card>

      <Card variant="subtle">
        <Text style={styles.infoTitle}>History Guarantees</Text>
        <Text style={styles.infoText}>• Never silently shift timezones or dates</Text>
        <Text style={styles.infoText}>• Ability to correct or delete mistaken entries</Text>
        <Text style={styles.infoText}>• Clear empty states for days with no activity</Text>
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
    backgroundColor: colors.sky,
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
