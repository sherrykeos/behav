import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, typography } from '../theme';
import { AppIcon, IconName } from './AppIcon';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: {
    label?: string;
    icon?: IconName | string;
    onPress: () => void;
  };
  style?: ViewStyle;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onBack,
  rightAction,
  style
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.leftRow}>
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            activeOpacity={0.7}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <AppIcon name="chevron-left" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        ) : null}
        <View style={styles.titleColumn}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {rightAction ? (
        <TouchableOpacity
          onPress={rightAction.onPress}
          activeOpacity={0.7}
          style={styles.rightButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {rightAction.icon ? (
            <AppIcon name={rightAction.icon} size={22} color={colors.text.primary} />
          ) : rightAction.label ? (
            <Text style={styles.rightActionText}>{rightAction.label}</Text>
          ) : null}
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background.base
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6
  },
  titleColumn: {
    flex: 1
  },
  title: {
    ...typography.h2,
    color: colors.text.primary
  },
  subtitle: {
    ...typography.caption,
    color: colors.text.muted,
    marginTop: 1
  },
  rightButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  rightActionText: {
    ...typography.bodyBold,
    color: colors.primary.base
  }
});
