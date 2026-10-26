import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  GestureResponderEvent,
} from 'react-native';
import { colors, radii, spacing } from '@/theme';

export type GlassCardVariant =
  | 'default'
  | 'elevated'
  | 'subtle'
  | 'mint'
  | 'amber'
  | 'crystal';

export interface GlassCardProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  variant?: GlassCardVariant;
  borderRadius?: number;
  hasSheen?: boolean;
  noBorder?: boolean;
  onPress?: (event: GestureResponderEvent) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  activeOpacity?: number;
  testID?: string;
}

/**
 * GlassCard — Reusable Dark Glassmorphic Card for Behav
 *
 * Implements a refined frosted glass effect with:
 * - Translucent obsidian/graphite dark-toned background
 * - Specular refraction border
 * - Top-edge subtle glass reflection sheen
 * - Deep diffused ambient shadow
 */
export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  contentContainerStyle,
  variant = 'default',
  borderRadius = radii.lg,
  hasSheen = true,
  noBorder = false,
  onPress,
  onLongPress,
  activeOpacity = 0.78,
  testID,
}) => {
  const getVariantStyles = (): {
    backgroundColor: string;
    borderColor: string;
    sheenColor?: string;
  } => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: 'rgba(34, 41, 37, 0.85)',
          borderColor: 'rgba(255, 255, 255, 0.14)',
          sheenColor: 'rgba(255, 255, 255, 0.22)',
        };
      case 'subtle':
        return {
          backgroundColor: 'rgba(16, 20, 18, 0.52)',
          borderColor: 'rgba(255, 255, 255, 0.06)',
          sheenColor: 'rgba(255, 255, 255, 0.12)',
        };
      case 'mint':
        return {
          backgroundColor: 'rgba(185, 246, 202, 0.08)',
          borderColor: 'rgba(185, 246, 202, 0.26)',
          sheenColor: 'rgba(185, 246, 202, 0.35)',
        };
      case 'amber':
        return {
          backgroundColor: 'rgba(255, 159, 67, 0.08)',
          borderColor: 'rgba(255, 159, 67, 0.26)',
          sheenColor: 'rgba(255, 159, 67, 0.35)',
        };
      case 'crystal':
        return {
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderColor: 'rgba(255, 255, 255, 0.18)',
          sheenColor: 'rgba(255, 255, 255, 0.28)',
        };
      case 'default':
      default:
        return {
          backgroundColor: 'rgba(26, 33, 29, 0.76)',
          borderColor: 'rgba(255, 255, 255, 0.10)',
          sheenColor: 'rgba(255, 255, 255, 0.18)',
        };
    }
  };

  const { backgroundColor, borderColor, sheenColor } = getVariantStyles();

  const cardStyle: ViewStyle = {
    backgroundColor,
    borderRadius,
    borderWidth: noBorder ? 0 : 1,
    borderColor,
  };

  const content = (
    <>
      {/* Subtle top specular glass reflection */}
      {hasSheen && !noBorder && (
        <View
          style={[
            styles.sheenLine,
            { backgroundColor: sheenColor, borderTopLeftRadius: borderRadius, borderTopRightRadius: borderRadius },
          ]}
          pointerEvents="none"
        />
      )}
      <View style={[styles.contentContainer, contentContainerStyle]}>
        {children}
      </View>
    </>
  );

  if (onPress || onLongPress) {
    return (
      <TouchableOpacity
        testID={testID}
        activeOpacity={activeOpacity}
        onPress={onPress}
        onLongPress={onLongPress}
        style={[styles.base, cardStyle, style]}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View testID={testID} style={[styles.base, cardStyle, style]}>
      {content}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
    position: 'relative',
    // Ambient glass shadow
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 14,
    elevation: 4,
  },
  sheenLine: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    height: 1,
    opacity: 0.75,
  },
  contentContainer: {
    padding: spacing.lg,
  },
});

export default GlassCard;
