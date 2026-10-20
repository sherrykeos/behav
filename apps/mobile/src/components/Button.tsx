import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle
} from 'react-native';
import { colors, radii, typography } from '../theme';

interface ButtonProps {
  title?: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'mint' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
  children
}) => {
  const getContainerStyle = (): ViewStyle => {
    switch (variant) {
      case 'primary':
        // Signature warm cream/ivory button with dark text
        return {
          backgroundColor: colors.warm.cream,
          borderWidth: 0
        };
      case 'mint':
        return {
          backgroundColor: colors.primary.base,
          borderWidth: 0
        };
      case 'secondary':
        return {
          backgroundColor: colors.background.elevated,
          borderWidth: 1,
          borderColor: colors.background.border
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: colors.background.border
        };
      case 'danger':
        return {
          backgroundColor: colors.accents.coral,
          borderWidth: 0
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderWidth: 0
        };
      default:
        return {};
    }
  };

  const getTextStyle = (): TextStyle => {
    switch (variant) {
      case 'primary':
        return {
          color: colors.warm.creamDark,
          fontWeight: '700'
        };
      case 'mint':
        return {
          color: colors.text.inverse,
          fontWeight: '700'
        };
      case 'secondary':
      case 'outline':
        return {
          color: colors.text.primary,
          fontWeight: '600'
        };
      case 'danger':
        return {
          color: '#FFFFFF',
          fontWeight: '600'
        };
      case 'ghost':
        return {
          color: colors.text.secondary,
          fontWeight: '500'
        };
      default:
        return {};
    }
  };

  const getSizeStyle = (): { container: ViewStyle; text: TextStyle } => {
    switch (size) {
      case 'sm':
        return {
          container: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: radii.full },
          text: { fontSize: 12, lineHeight: 16 }
        };
      case 'lg':
        return {
          container: { paddingVertical: 16, paddingHorizontal: 24, borderRadius: radii.full },
          text: { fontSize: 16, lineHeight: 22 }
        };
      case 'md':
      default:
        return {
          container: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: radii.full },
          text: { fontSize: 14, lineHeight: 20 }
        };
    }
  };

  const sizeStyles = getSizeStyle();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.base,
        getContainerStyle(),
        sizeStyles.container,
        disabled && styles.disabled,
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? colors.warm.creamDark : colors.text.primary}
        />
      ) : (
        <>
          {icon}
          {title ? (
            <Text style={[styles.text, getTextStyle(), sizeStyles.text, icon ? { marginLeft: 8 } : null, textStyle]}>
              {title}
            </Text>
          ) : (
            children
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  text: {
    textAlign: 'center',
    letterSpacing: -0.1
  },
  disabled: {
    opacity: 0.4
  }
});
