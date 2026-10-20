import React from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, spacing } from '../theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'card' | 'surface' | 'elevated' | 'warm' | 'outlined';
  onPress?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'card',
  onPress
}) => {
  const getBackgroundColor = () => {
    switch (variant) {
      case 'elevated':
        return colors.background.elevated;
      case 'warm':
        return colors.warm.card;
      case 'surface':
        return colors.background.surface;
      case 'outlined':
        return 'transparent';
      case 'card':
      default:
        return colors.background.card;
    }
  };

  const getBorderColor = () => {
    switch (variant) {
      case 'warm':
        return colors.warm.border;
      case 'outlined':
        return colors.primary.border;
      default:
        return colors.background.border;
    }
  };

  const containerStyle = [
    styles.card,
    {
      backgroundColor: getBackgroundColor(),
      borderColor: getBorderColor()
    },
    style
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={containerStyle}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={containerStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.md,
    padding: spacing.base,
    borderWidth: 1,
    marginVertical: spacing.xs
  }
});
