import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '@/theme';
import { Button } from '@/components/common/Button';

interface StepPhilosophyProps {
  onNext: () => void;
}

interface FeatureItem {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  accentColor: string;
}

const FEATURES: FeatureItem[] = [
  {
    icon: 'flame-outline',
    title: 'Track undesirable behaviors',
    description: 'Keep an honest log of behaviors you wish to reduce, without judgment or shame.',
    accentColor: colors.brand.amber,
  },
  {
    icon: 'options-outline',
    title: 'Custom units & quantities',
    description: 'Log counts, minutes, or custom amounts tailored to how you measure your habits.',
    accentColor: colors.brand.mint,
  },
  {
    icon: 'calendar-outline',
    title: 'Green days & activity map',
    description: 'See clean days highlighted in mint and logged activity in amber at a glance.',
    accentColor: colors.brand.mint,
  },
  {
    icon: 'trending-up-outline',
    title: 'Patterns & trends',
    description: 'Understand weekday vs. weekend spikes, monthly distributions, and streaks over time.',
    accentColor: colors.brand.amber,
  },
  {
    icon: 'cloud-offline-outline',
    title: '100% Offline & Private',
    description: 'Your data lives only in your local SQLite storage. No accounts, no cloud, no tracking.',
    accentColor: colors.brand.mint,
  },
];

export const StepPhilosophy: React.FC<StepPhilosophyProps> = ({ onNext }) => {
  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.headline}>Understand yourself, one day at a time.</Text>
          <Text style={styles.subtext}>
            Behav is designed around awareness before change. Here is how your space works:
          </Text>
        </View>

        {/* Feature Cards */}
        <View style={styles.featureList}>
          {FEATURES.map((item, idx) => (
            <View key={idx} style={styles.featureCard}>
              <View style={[styles.iconWell, { borderColor: `${item.accentColor}30` }]}>
                <Ionicons name={item.icon} size={20} color={item.accentColor} />
              </View>
              <View style={styles.featureTextCol}>
                <Text style={styles.featureTitle}>{item.title}</Text>
                <Text style={styles.featureDesc}>{item.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Philosophy Reassurance Note */}
        <View style={styles.quoteCard}>
          <Ionicons name="heart-outline" size={18} color={colors.brand.mint} />
          <Text style={styles.quoteText}>
            “Behav doesn't expect you to be perfect. It helps you see what's happening so you can make
            more informed decisions.”
          </Text>
        </View>
      </ScrollView>

      {/* CTA Button */}
      <View style={styles.footer}>
        <Button
          label="Sounds good"
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
  },
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  header: {
    marginBottom: spacing.md,
  },
  headline: {
    ...typography.titleLarge,
    color: colors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: spacing.xs,
  },
  subtext: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  featureList: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  iconWell: {
    width: 38,
    height: 38,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTextCol: {
    flex: 1,
    gap: 2,
  },
  featureTitle: {
    ...typography.titleSmall,
    color: colors.textPrimary,
  },
  featureDesc: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  quoteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  quoteText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontStyle: 'italic',
    flex: 1,
    lineHeight: 18,
  },
  footer: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
});
