import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { colors, radii, shadows, spacing, typography } from '@/theme';
import { type Behavior, type Goal, type CreateGoalInput, type GoalType } from '@/types/database';
import { toDayString } from '@/utils/date';

interface GoalModalProps {
  visible: boolean;
  behaviors: Behavior[];
  goalToEdit?: Goal | null;
  onClose: () => void;
  onSave: (data: CreateGoalInput) => Promise<void>;
}

export const GoalModal: React.FC<GoalModalProps> = ({
  visible,
  behaviors,
  goalToEdit,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [behaviorId, setBehaviorId] = useState<string | null>(null);
  const [goalType, setGoalType] = useState<GoalType>('daily_limit');
  const [targetValue, setTargetValue] = useState('');
  const [startDate, setStartDate] = useState(toDayString());
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (goalToEdit) {
      setTitle(goalToEdit.title);
      setBehaviorId(goalToEdit.behaviorId);
      setGoalType(goalToEdit.goalType);
      setTargetValue(goalToEdit.targetValue ? String(goalToEdit.targetValue) : '');
      setStartDate(goalToEdit.startDate);
    } else {
      setTitle('');
      setBehaviorId(behaviors.length > 0 ? behaviors[0].id : null);
      setGoalType('daily_limit');
      setTargetValue(behaviors.length > 0 && behaviors[0].dailyLimit ? String(behaviors[0].dailyLimit) : '');
      setStartDate(toDayString());
    }
    setError(null);
  }, [goalToEdit, visible, behaviors]);

  const selectedBehavior = behaviors.find((b) => b.id === behaviorId);

  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Goal title is required.');
      return;
    }

    let parsedTarget: number | null = null;
    if (targetValue.trim()) {
      const num = Number(targetValue.trim());
      if (isNaN(num) || num <= 0) {
        setError('Target value must be a positive number.');
        return;
      }
      parsedTarget = num;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        title: trimmedTitle,
        behaviorId: behaviorId || null,
        goalType,
        targetValue: parsedTarget,
        startDate: startDate.trim() || toDayString(),
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save goal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{goalToEdit ? 'Edit Goal' : 'New Goal'}</Text>
              <Text style={styles.subtitle}>Define an honest limit or streak target</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close modal">
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Title */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Goal Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Max 5 cigarettes/day or Stay clean"
                placeholderTextColor={colors.textTertiary}
                value={title}
                onChangeText={(val) => {
                  setTitle(val);
                  if (error) setError(null);
                }}
                maxLength={60}
              />
            </View>

            {/* Behavior Association */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Associated Habit</Text>
              {behaviors.length === 0 ? (
                <Text style={styles.emptyNote}>No active habits. Create a habit first.</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                  {behaviors.map((b) => {
                    const isSelected = b.id === behaviorId;
                    return (
                      <Pressable
                        key={b.id}
                        onPress={() => {
                          setBehaviorId(b.id);
                          if (!targetValue && b.dailyLimit) {
                            setTargetValue(String(b.dailyLimit));
                          }
                        }}
                        style={[styles.chip, isSelected && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                          {b.name}
                        </Text>
                        <Badge label={b.unit} variant={isSelected ? 'primary' : 'neutral'} style={{ marginTop: 2 }} />
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            {/* Goal Type */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Goal Type</Text>
              <View style={styles.typeRow}>
                <Pressable
                  onPress={() => setGoalType('daily_limit')}
                  style={[styles.typeOption, goalType === 'daily_limit' && styles.typeOptionActive]}
                >
                  <Text style={[styles.typeTitle, goalType === 'daily_limit' && styles.typeTitleActive]}>
                    Daily Ceiling
                  </Text>
                  <Text style={styles.typeDesc}>Stay at or below daily limit</Text>
                </Pressable>

                <Pressable
                  onPress={() => setGoalType('streak')}
                  style={[styles.typeOption, goalType === 'streak' && styles.typeOptionActive]}
                >
                  <Text style={[styles.typeTitle, goalType === 'streak' && styles.typeTitleActive]}>
                    Streak
                  </Text>
                  <Text style={styles.typeDesc}>Consecutive clean / under-limit days</Text>
                </Pressable>
              </View>
            </View>

            {/* Target Value */}
            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Daily Target / Limit</Text>
                {selectedBehavior && (
                  <Text style={styles.unitHint}>Unit: {selectedBehavior.unit}</Text>
                )}
              </View>
              <TextInput
                style={styles.input}
                placeholder="e.g. 5"
                placeholderTextColor={colors.textTertiary}
                value={targetValue}
                onChangeText={(val) => {
                  setTargetValue(val);
                  if (error) setError(null);
                }}
                keyboardType="numeric"
              />
            </View>

            {/* Actions */}
            <View style={styles.actionsRow}>
              <Button
                label="Cancel"
                onPress={onClose}
                variant="secondary"
                size="md"
                style={{ flex: 1 }}
              />
              <Button
                label={goalToEdit ? 'Save Goal' : 'Create Goal'}
                onPress={handleSubmit}
                variant="primary"
                size="md"
                loading={isSubmitting}
                style={{ flex: 1.4 }}
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(32, 30, 38, 0.4)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: '88%',
    ...shadows.floating,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.titleMedium,
    fontSize: 19,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
    padding: spacing.sm + 2,
    borderRadius: radii.md,
    marginBottom: spacing.md,
    gap: spacing.xs + 2,
  },
  errorText: {
    ...typography.bodyMedium,
    color: colors.dangerText,
    fontSize: 13,
    flex: 1,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    ...typography.labelLarge,
    fontSize: 13,
    marginBottom: 6,
    color: colors.textPrimary,
  },
  unitHint: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  emptyNote: {
    ...typography.bodyMedium,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  chipsScroll: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  chip: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'flex-start',
  },
  chipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  chipText: {
    ...typography.labelLarge,
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  chipTextActive: {
    color: colors.primary,
  },
  typeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typeOption: {
    flex: 1,
    padding: spacing.sm + 2,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  typeOptionActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  typeTitle: {
    ...typography.labelLarge,
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  typeTitleActive: {
    color: colors.primary,
  },
  typeDesc: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 11,
  },
  input: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 15,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
});
