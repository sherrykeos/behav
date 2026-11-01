import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '@/theme';
import { Button } from '@/components/common/Button';

interface StepWelcomeProps {
  onNext: () => void;
}

export const StepWelcome: React.FC<StepWelcomeProps> = ({ onNext }) => {
  return (
    <View style={styles.container}>
      {/* Brand Logo & Subtle Ambient Frame */}
      <View style={styles.heroSection}>
        <View style={styles.logoFrame}>
          <Image
            source={require('@/../assets/appLogo.png')}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="Behav Logo"
          />
        </View>

        <Text style={styles.headline}>Your journey starts with awareness.</Text>

        <Text style={styles.supportingText}>
          Welcome to Behav. A personal space to understand your habits, recognize patterns, and take
          control of the behaviors you want to change.
        </Text>
      </View>

      {/* Visual representation of calendar & streak progress */}
      <View style={styles.previewContainer}>
        <View style={styles.previewHeader}>
          <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.previewTitle}>Awareness at a glance</Text>
        </View>

        {/* 7-Day Micro Representation */}
        <View style={styles.calendarStrip}>
          {[
            { label: 'M', status: 'green' },
            { label: 'T', status: 'green' },
            { label: 'W', status: 'amber' },
            { label: 'T', status: 'green' },
            { label: 'F', status: 'green' },
            { label: 'S', status: 'amber' },
            { label: 'S', status: 'green' },
          ].map((item, idx) => (
            <View key={idx} style={styles.dayCol}>
              <Text style={styles.dayLabel}>{item.label}</Text>
              <View
                style={[
                  styles.dayDot,
                  item.status === 'green' && styles.dotGreen,
                  item.status === 'amber' && styles.dotAmber,
                ]}
              >
                {item.status === 'green' ? (
                  <Ionicons name="checkmark" size={10} color={colors.brand.obsidian} />
                ) : (
                  <View style={styles.dotInnerAmber} />
                )}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.miniDot, styles.dotGreen]} />
            <Text style={styles.legendText}>Clean day</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.miniDot, styles.dotAmber]} />
            <Text style={styles.legendText}>Logged activity</Text>
          </View>
        </View>
      </View>

      {/* Supportive Philosophy Callout */}
      <View style={styles.philosophyPill}>
        <Ionicons name="shield-checkmark-outline" size={16} color={colors.brand.mint} />
        <Text style={styles.philosophyText}>
          No pressure. No judgment. Just you, your data, and your progress.
        </Text>
      </View>

      {/* CTA Button */}
      <View style={styles.actionContainer}>
        <Button
          label="Let's get started"
          size="lg"
          variant="primary"
          onPress={onNext}
          icon={<Ionicons name="arrow-forward" size={18} color={colors.brand.obsidian} />}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  logoFrame: {
    width: 84,
    height: 84,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  logo: {
    width: 64,
    height: 64,
  },
  headline: {
    ...typography.titleLarge,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
    letterSpacing: -0.3,
  },
  supportingText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 340,
  },
  previewContainer: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginVertical: spacing.md,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  previewTitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  calendarStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  dayCol: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  dayLabel: {
    ...typography.labelSmall,
    color: colors.textTertiary,
  },
  dayDot: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotGreen: {
    backgroundColor: colors.brand.mint,
  },
  dotAmber: {
    backgroundColor: colors.brand.amber,
  },
  dotInnerAmber: {
    width: 6,
    height: 6,
    borderRadius: radii.full,
    backgroundColor: colors.brand.obsidian,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniDot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
  },
  legendText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontSize: 11,
  },
  philosophyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  philosophyText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  actionContainer: {
    paddingTop: spacing.xs,
  },
});
