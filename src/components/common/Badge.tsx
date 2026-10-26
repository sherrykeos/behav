import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, spacing, typography } from '@/theme';

interface BadgeProps {
  label: string;
  variant?: 'lavender' | 'sage' | 'peach' | 'sky' | 'neutral' | 'primary' | 'mint' | 'amber';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'neutral',
  style,
}) => {
  const getBadgeStyle = () => {
    switch (variant) {
      case 'mint':
      case 'sage':
        return { bg: colors.accentPrimarySubtle, text: colors.accentPrimaryDark };
      case 'amber':
      case 'peach':
        return { bg: colors.accentActivitySubtle, text: colors.accentActivityDark };
      case 'primary':
        return { bg: colors.accentPrimarySubtle, text: colors.accentPrimaryDark };
      case 'lavender':
      case 'sky':
        return { bg: colors.surfaceSubtle, text: colors.textSecondary };
      case 'neutral':
      default:
        return { bg: colors.surfaceSubtle, text: colors.textSecondary };
    }
  };

  const current = getBadgeStyle();

  return (
    <View style={[styles.badge, { backgroundColor: current.bg }, style]}>
      <Text style={[styles.text, { color: current.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  text: {
    ...typography.labelSmall,
    fontSize: 11,
  },
});
