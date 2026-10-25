import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { colors, radii, spacing, typography } from '@/theme';
import { type DailyBehaviorSummary } from '@/types/database';

interface BehaviorHomeCardProps {
  summary: DailyBehaviorSummary;
  onQuickAdd: (behaviorId: string) => void;
  onPressCard: (behaviorId: string) => void;
}

export const BehaviorHomeCard: React.FC<BehaviorHomeCardProps> = ({
  summary,
  onQuickAdd,
  onPressCard,
}) => {
  const {
    behaviorId,
    behaviorName,
    behaviorUnit,
    behaviorCategory,
    dailyLimit,
    totalValue,
    isLimitReached,
  } = summary;

  // Calculate percentage if daily limit exists
  const progressPercent = dailyLimit ? Math.min(100, Math.round((totalValue / dailyLimit) * 100)) : null;

  return (
    <Card style={styles.card}>
      <Pressable
        onPress={() => onPressCard(behaviorId)}
        style={styles.cardContent}
        android_ripple={{ color: colors.surfaceHover }}
      >
        <View style={styles.mainInfo}>
          {/* Top row: Name & Category */}
          <View style={styles.titleRow}>
            <Text style={styles.behaviorName} numberOfLines={1}>
              {behaviorName}
            </Text>
            {behaviorCategory && (
              <Badge label={behaviorCategory} variant="lavender" />
            )}
          </View>

          {/* Value and Unit */}
          <View style={styles.valueRow}>
            <Text style={styles.valueText}>{totalValue}</Text>
            <Text style={styles.unitText}>{behaviorUnit} today</Text>

            {dailyLimit !== null && (
              <View style={styles.limitContainer}>
                {isLimitReached ? (
                  <Badge label="Limit Reached" variant="sage" />
                ) : (
                  <Text style={styles.limitText}>
                    Limit: {dailyLimit} {behaviorUnit}
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Progress bar if limit is defined */}
          {dailyLimit !== null && progressPercent !== null && (
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progressPercent}%` },
                  isLimitReached && styles.progressFillReached,
                ]}
              />
            </View>
          )}
        </View>

        {/* Quick +1 Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Quick add 1 ${behaviorUnit} to ${behaviorName}`}
          onPress={() => onQuickAdd(behaviorId)}
          hitSlop={8}
          style={({ pressed }) => [styles.quickAddButton, pressed && styles.quickAddButtonPressed]}
        >
          <Ionicons name="add" size={24} color={colors.primary} />
        </Pressable>
      </Pressable>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  cardContent: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mainInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  behaviorName: {
    ...typography.titleSmall,
    fontSize: 16,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
    marginTop: 2,
  },
  valueText: {
    ...typography.titleLarge,
    fontSize: 22,
    color: colors.textPrimary,
  },
  unitText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    fontSize: 13,
  },
  limitContainer: {
    marginLeft: spacing.sm,
  },
  limitText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontSize: 12,
  },
  progressTrack: {
    height: 5,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.full,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radii.full,
  },
  progressFillReached: {
    backgroundColor: colors.sageText,
  },
  quickAddButton: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAddButtonPressed: {
    backgroundColor: colors.border,
    transform: [{ scale: 0.94 }],
  },
});
