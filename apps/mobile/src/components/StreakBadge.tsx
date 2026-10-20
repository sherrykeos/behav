import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, spacing, typography } from '../theme';
import { AppIcon } from './AppIcon';

interface StreakBadgeProps {
  currentStreak: number;
  longestStreak?: number;
  goalType?: string;
  isQualifiedToday?: boolean | null;
  variant?: 'compact' | 'card';
  style?: ViewStyle;
}

export const StreakBadge: React.FC<StreakBadgeProps> = ({
  currentStreak,
  longestStreak,
  isQualifiedToday,
  variant = 'compact',
  style
}) => {
  if (variant === 'compact') {
    return (
      <View style={[styles.compactPill, style]}>
        <AppIcon name="flame" size={12} color={colors.primary.base} style={{ marginRight: 4 }} />
        <Text style={styles.compactText}>{currentStreak} day streak</Text>
      </View>
    );
  }

  return (
    <View style={[styles.cardContainer, style]}>
      <Text style={styles.cardLabel}>Current Streak</Text>
      <View style={styles.streakRow}>
        <Text style={styles.streakNumber}>{currentStreak}</Text>
        <Text style={styles.streakDays}>days</Text>
      </View>
      {longestStreak !== undefined && (
        <Text style={styles.longestText}>Best: {longestStreak} days</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  compactPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#162019',
    borderColor: '#223326',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.full
  },
  compactText: {
    ...typography.captionBold,
    color: colors.primary.base,
    fontSize: 11
  },
  cardContainer: {
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.base,
    flex: 1
  },
  cardLabel: {
    ...typography.caption,
    color: colors.text.muted,
    marginBottom: 4
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'baseline'
  },
  streakNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: -0.5
  },
  streakDays: {
    ...typography.caption,
    color: colors.text.secondary,
    marginLeft: 4
  },
  longestText: {
    ...typography.caption,
    color: colors.text.muted,
    marginTop: 4,
    fontSize: 11
  }
});
