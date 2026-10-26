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
import { colors, radii, shadows, spacing, typography } from '@/theme';
import { type Behavior, type CreateBehaviorInput } from '@/types/database';

interface BehaviorModalProps {
  visible: boolean;
  behaviorToEdit?: Behavior | null;
  onClose: () => void;
  onSave: (data: CreateBehaviorInput) => Promise<void>;
}

const CATEGORY_SUGGESTIONS = ['Health', 'Focus', 'Habits', 'Wellness', 'Daily'];
const UNIT_SUGGESTIONS = ['times', 'minutes', 'cups', 'pages', 'hours'];

export const BehaviorModal: React.FC<BehaviorModalProps> = ({
  visible,
  behaviorToEdit,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState('times');
  const [dailyLimit, setDailyLimit] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (behaviorToEdit) {
      setName(behaviorToEdit.name);
      setCategory(behaviorToEdit.category || '');
      setUnit(behaviorToEdit.unit || 'times');
      setDailyLimit(behaviorToEdit.dailyLimit ? String(behaviorToEdit.dailyLimit) : '');
      setDescription(behaviorToEdit.description || '');
    } else {
      setName('');
      setCategory('');
      setUnit('times');
      setDailyLimit('');
      setDescription('');
    }
    setError(null);
  }, [behaviorToEdit, visible]);

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Behavior name is required.');
      return;
    }

    let parsedLimit: number | null = null;
    if (dailyLimit.trim()) {
      const num = Number(dailyLimit.trim());
      if (isNaN(num) || num <= 0) {
        setError('Daily limit must be a positive number.');
        return;
      }
      parsedLimit = num;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        name: trimmedName,
        category: category.trim() || null,
        unit: unit.trim() || 'times',
        dailyLimit: parsedLimit,
        description: description.trim() || null,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save behavior.');
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
            <Text style={styles.title}>
              {behaviorToEdit ? 'Edit Behavior' : 'New Behavior'}
            </Text>
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

            {/* Name */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Mindful Breathing, Water, Reading"
                placeholderTextColor={colors.textTertiary}
                value={name}
                onChangeText={(val) => {
                  setName(val);
                  if (error) setError(null);
                }}
                maxLength={60}
              />
            </View>

            {/* Category */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Category (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Health, Focus, Routine"
                placeholderTextColor={colors.textTertiary}
                value={category}
                onChangeText={setCategory}
                maxLength={40}
              />
              <View style={styles.chipsRow}>
                {CATEGORY_SUGGESTIONS.map((cat) => (
                  <Pressable
                    key={cat}
                    onPress={() => setCategory(cat)}
                    style={[
                      styles.chip,
                      category.toLowerCase() === cat.toLowerCase() && styles.chipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        category.toLowerCase() === cat.toLowerCase() && styles.chipTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Unit */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Measurement Unit</Text>
              <TextInput
                style={styles.input}
                placeholder="times, minutes, cups, pages"
                placeholderTextColor={colors.textTertiary}
                value={unit}
                onChangeText={setUnit}
                maxLength={30}
              />
              <View style={styles.chipsRow}>
                {UNIT_SUGGESTIONS.map((u) => (
                  <Pressable
                    key={u}
                    onPress={() => setUnit(u)}
                    style={[
                      styles.chip,
                      unit.toLowerCase() === u.toLowerCase() && styles.chipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        unit.toLowerCase() === u.toLowerCase() && styles.chipTextActive,
                      ]}
                    >
                      {u}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Daily Limit */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Daily Target / Limit (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 15 (minutes) or 3 (cups)"
                placeholderTextColor={colors.textTertiary}
                value={dailyLimit}
                onChangeText={(val) => {
                  setDailyLimit(val);
                  if (error) setError(null);
                }}
                keyboardType="numeric"
              />
              <Text style={styles.helperText}>
                Optional guideline for daily progress tracking.
              </Text>
            </View>

            {/* Description */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add optional notes or intention..."
                placeholderTextColor={colors.textTertiary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                maxLength={200}
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsRow}>
              <Button
                label="Cancel"
                onPress={onClose}
                variant="secondary"
                size="md"
                style={{ flex: 1 }}
              />
              <Button
                label={behaviorToEdit ? 'Save Changes' : 'Create Behavior'}
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
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
  label: {
    ...typography.labelLarge,
    fontSize: 13,
    marginBottom: 6,
    color: colors.textPrimary,
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
  textArea: {
    minHeight: 68,
    textAlignVertical: 'top',
  },
  helperText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    marginTop: 4,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
    marginTop: spacing.xs + 2,
  },
  chip: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  chipActive: {
    backgroundColor: colors.accentPrimarySubtle,
    borderColor: colors.accentPrimaryDark,
  },
  chipText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.accentPrimaryDark,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
});
