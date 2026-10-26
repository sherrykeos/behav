import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, shadows, spacing } from '@/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'surface' | 'subtle' | 'elevated' | 'mint' | 'amber' | 'accentLavender' | 'accentSage' | 'accentPeach';
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'surface',
}) => {
  const getBackgroundColor = () => {
    switch (variant) {
      case 'subtle':
        return colors.surfaceSubtle;
      case 'elevated':
        return colors.surfaceElevated;
      case 'mint':
      case 'accentSage':
        return colors.accentPrimarySubtle;
      case 'amber':
      case 'accentPeach':
        return colors.accentActivitySubtle;
      case 'accentLavender':
        return colors.surfaceSubtle;
      case 'surface':
      default:
        return colors.surface;
    }
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: getBackgroundColor() },
        (variant === 'surface' || variant === 'elevated') && shadows.soft,
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.md,
  },
});
