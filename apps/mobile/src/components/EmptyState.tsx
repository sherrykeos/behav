import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing, typography } from '../theme';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  actionTitle?: string;
  onAction?: () => void;
  iconText?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionTitle,
  onAction,
  iconText = '✦'
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Text style={styles.icon}>{iconText}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionTitle && onAction ? (
        <Button
          title={actionTitle}
          onPress={onAction}
          variant="primary"
          style={styles.button}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xl
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.background.elevated,
    borderColor: colors.background.border,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.base
  },
  icon: {
    fontSize: 24,
    color: colors.primary.base
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xs
  },
  description: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
    marginBottom: spacing.lg
  },
  button: {
    minWidth: 180
  }
});
