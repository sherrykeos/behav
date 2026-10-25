import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, spacing, typography } from '@/theme';

interface BadgeProps {
  label: string;
  variant?: 'lavender' | 'sage' | 'peach' | 'sky' | 'neutral' | 'primary';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'neutral',
  style,
}) => {
  const getBadgeStyle = () => {
    switch (variant) {
      case 'lavender':
        return { bg: colors.lavender, text: colors.lavenderText };
      case 'sage':
        return { bg: colors.sage, text: colors.sageText };
      case 'peach':
        return { bg: colors.peach, text: colors.peachText };
      case 'sky':
        return { bg: colors.sky, text: colors.skyText };
      case 'primary':
        return { bg: colors.primaryLight, text: colors.primary };
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
  },
  text: {
    ...typography.labelSmall,
    fontSize: 11,
  },
});
