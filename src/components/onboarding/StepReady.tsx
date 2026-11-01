import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '@/theme';
import { Button } from '@/components/common/Button';

interface StepReadyProps {
  name: string;
  onEnter: () => void;
  loading?: boolean;
}

export const StepReady: React.FC<StepReadyProps> = ({ name, onEnter, loading = false }) => {
  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        {/* Celebration Check Badge */}
        <View style={styles.badgeFrame}>
          <View style={styles.badgeInner}>
            <Ionicons name="checkmark-sharp" size={32} color={colors.brand.obsidian} />
          </View>
        </View>

        <Text style={styles.headline}>You're all set, {name}.</Text>

        <Text style={styles.supportingText}>
          Your space is ready. Start tracking, understand your patterns, and take things one day at a
          time.
        </Text>

        {/* Personalized Identity Card */}
        <View style={styles.identityCard}>
          <View style={styles.userRow}>
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={24} color={colors.brand.mint} />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{name}</Text>
              <Text style={styles.userStatus}>Local private profile</Text>
            </View>
            <View style={styles.statusPill}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Ready</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.attributesRow}>
            <View style={styles.attributeItem}>
              <Ionicons name="shield-checkmark" size={14} color={colors.brand.mint} />
              <Text style={styles.attributeText}>100% Offline</Text>
            </View>
            <View style={styles.attributeItem}>
              <Ionicons name="lock-closed" size={14} color={colors.brand.mint} />
              <Text style={styles.attributeText}>Encrypted SQLite</Text>
            </View>
            <View style={styles.attributeItem}>
              <Ionicons name="heart" size={14} color={colors.brand.mint} />
              <Text style={styles.attributeText}>Judgment-free</Text>
            </View>
          </View>
        </View>

        {/* Closing Philosophy Message */}
        <View style={styles.closingCard}>
          <Text style={styles.closingText}>
            “Remember, progress isn't about never slipping. It's about understanding yourself and
            continuing forward.”
          </Text>
        </View>
      </View>

      {/* CTA Button */}
      <View style={styles.footer}>
        <Button
          label="Enter Behav"
          size="lg"
          variant="primary"
          onPress={onEnter}
          loading={loading}
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
  topSection: {
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  badgeFrame: {
    width: 80,
    height: 80,
    borderRadius: 26,
    backgroundColor: `${colors.brand.mint}15`,
    borderWidth: 1,
    borderColor: `${colors.brand.mint}35`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  badgeInner: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.brand.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headline: {
    ...typography.titleLarge,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
    letterSpacing: -0.3,
  },
  supportingText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
    marginBottom: spacing.lg,
  },
  identityCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: `${colors.brand.mint}40`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    ...typography.titleMedium,
    color: colors.textPrimary,
  },
  userStatus: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontSize: 12,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: `${colors.brand.mint}15`,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: `${colors.brand.mint}30`,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: radii.full,
    backgroundColor: colors.brand.mint,
  },
  statusText: {
    ...typography.labelSmall,
    color: colors.brand.mint,
    fontSize: 11,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: spacing.md,
  },
  attributesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attributeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  attributeText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 11,
  },
  closingCard: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
    width: '100%',
  },
  closingText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
});
