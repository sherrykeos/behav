import React from 'react';
import {
  Text,
  StyleSheet,
  Pressable,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { colors, radii, shadows, spacing, typography } from '@/theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
}) => {
  const getContainerStyle = (pressed: boolean): ViewStyle[] => {
    const list: ViewStyle[] = [styles.base];

    // Size
    if (size === 'sm') list.push(styles.sizeSm);
    else if (size === 'lg') list.push(styles.sizeLg);
    else list.push(styles.sizeMd);

    // Variant
    if (variant === 'primary') {
      list.push(styles.primary);
      if (!disabled) list.push(shadows.floating);
    } else if (variant === 'secondary') {
      list.push(styles.secondary);
    } else if (variant === 'danger') {
      list.push(styles.danger);
    } else if (variant === 'ghost') {
      list.push(styles.ghost);
    }

    if (disabled) {
      list.push(styles.disabled);
    } else if (pressed) {
      list.push(styles.pressed);
    }

    if (style) list.push(style);
    return list;
  };

  const getLabelStyle = (): TextStyle[] => {
    const list: TextStyle[] = [styles.label];

    if (size === 'sm') list.push(styles.labelSm);
    else if (size === 'lg') list.push(styles.labelLg);

    if (variant === 'primary' || variant === 'danger') {
      list.push(styles.labelInverse);
    } else if (variant === 'secondary') {
      list.push(styles.labelSecondary);
    } else if (variant === 'ghost') {
      list.push(styles.labelGhost);
    }

    if (disabled) list.push(styles.labelDisabled);
    if (textStyle) list.push(textStyle);
    return list;
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, busy: loading }}
      accessibilityLabel={label}
      onPress={disabled || loading ? undefined : onPress}
      style={({ pressed }) => getContainerStyle(pressed)}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? colors.textInverse : colors.primary}
        />
      ) : (
        <>
          {icon}
          <Text style={getLabelStyle()}>{label}</Text>
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    gap: spacing.sm,
  },
  sizeSm: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    minHeight: 36,
  },
  sizeMd: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minHeight: 48,
  },
  sizeLg: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
    minHeight: 56,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.borderSubtle,
    opacity: 0.6,
  },
  label: {
    ...typography.labelLarge,
    textAlign: 'center',
  },
  labelSm: {
    fontSize: 13,
  },
  labelLg: {
    fontSize: 16,
  },
  labelInverse: {
    color: colors.textInverse,
  },
  labelSecondary: {
    color: colors.textPrimary,
  },
  labelGhost: {
    color: colors.primary,
  },
  labelDisabled: {
    color: colors.textTertiary,
  },
});
