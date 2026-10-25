import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, shadows, spacing } from '@/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'surface' | 'subtle' | 'accentLavender' | 'accentSage' | 'accentPeach';
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
      case 'accentLavender':
        return colors.lavender;
      case 'accentSage':
        return colors.sage;
      case 'accentPeach':
        return colors.peach;
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
        variant === 'surface' && shadows.soft,
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
