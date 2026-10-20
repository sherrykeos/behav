import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, spacing, typography } from '../theme';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  badgeText?: string;
  badgeType?: 'positive' | 'negative' | 'neutral';
  accentColor?: string;
  style?: ViewStyle;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  subtext,
  badgeText,
  badgeType = 'positive',
  accentColor = colors.text.primary,
  style
}) => {
  const getBadgeColors = () => {
    switch (badgeType) {
      case 'negative':
        return {
          bg: colors.accents.coralFaint,
          text: colors.accents.coral,
          border: colors.accents.coralBorder
        };
      case 'neutral':
        return {
          bg: colors.background.highlight,
          text: colors.text.secondary,
          border: colors.background.border
        };
      case 'positive':
      default:
        return {
          bg: colors.primary.faint,
          text: colors.primary.base,
          border: colors.primary.border
        };
    }
  };

  const badgeColors = getBadgeColors();

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: accentColor }]}>{value}</Text>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>

      <View style={styles.bottomRow}>
        {badgeText && (
          <View
            style={[
              styles.badge,
              {
                backgroundColor: badgeColors.bg,
                borderColor: badgeColors.border
              }
            ]}
          >
            <Text style={[styles.badgeText, { color: badgeColors.text }]}>{badgeText}</Text>
          </View>
        )}
        {subtext ? <Text style={styles.subtext}>{subtext}</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.base,
    flex: 1
  },
  label: {
    ...typography.caption,
    color: colors.text.muted,
    marginBottom: 6
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline'
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4
  },
  unit: {
    ...typography.caption,
    color: colors.text.secondary,
    marginLeft: 4
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radii.full,
    borderWidth: 1,
    marginRight: 6
  },
  badgeText: {
    ...typography.captionBold,
    fontSize: 10
  },
  subtext: {
    ...typography.caption,
    color: colors.text.muted,
    fontSize: 11
  }
});
