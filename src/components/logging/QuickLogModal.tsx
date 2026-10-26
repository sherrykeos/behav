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
import { type Behavior } from '@/types/database';

interface QuickLogModalProps {
  visible: boolean;
  behaviors: Behavior[];
  initialBehaviorId?: string | null;
  onClose: () => void;
  onLog: (behaviorId: string, value: number, note?: string) => Promise<void>;
}

const QUICK_AMOUNTS = [1, 2, 5, 10];

export const QuickLogModal: React.FC<QuickLogModalProps> = ({
  visible,
  behaviors,
  initialBehaviorId,
  onClose,
  onLog,
}) => {
  const [selectedId, setSelectedId] = useState<string>('');
  const [quantity, setQuantity] = useState('1');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialBehaviorId && behaviors.some((b) => b.id === initialBehaviorId)) {
      setSelectedId(initialBehaviorId);
    } else if (behaviors.length > 0) {
      setSelectedId(behaviors[0].id);
    } else {
      setSelectedId('');
    }
    setQuantity('1');
    setNote('');
    setError(null);
  }, [visible, initialBehaviorId, behaviors]);

  const selectedBehavior = behaviors.find((b) => b.id === selectedId);

  const handleSubmit = async () => {
    if (!selectedId) {
      setError('Please select a behavior.');
      return;
    }

    const num = Number(quantity.trim());
    if (isNaN(num) || num <= 0) {
      setError('Quantity must be a positive number.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onLog(selectedId, num, note.trim() || undefined);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to log entry.');
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
              <Text style={styles.title}>Quick Log</Text>
              <Text style={styles.subtitle}>Record today's occurrence</Text>
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

            {/* Behavior Selector */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Select Behavior</Text>
              {behaviors.length === 0 ? (
                <Text style={styles.emptyNote}>
                  No active behaviors. Create a behavior first.
                </Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.behaviorList}>
                  {behaviors.map((b) => {
                    const isSelected = b.id === selectedId;
                    return (
                      <Pressable
                        key={b.id}
                        onPress={() => {
                          setSelectedId(b.id);
                          if (error) setError(null);
                        }}
                        style={[styles.behaviorChip, isSelected && styles.behaviorChipActive]}
                      >
                        <Text style={[styles.behaviorChipText, isSelected && styles.behaviorChipTextActive]}>
                          {b.name}
                        </Text>
                        <Badge
                          label={b.unit}
                          variant={isSelected ? 'primary' : 'neutral'}
                          style={{ marginTop: 2 }}
                        />
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            {/* Quantity */}
            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Quantity / Amount</Text>
                {selectedBehavior && (
                  <Text style={styles.unitHint}>Unit: {selectedBehavior.unit}</Text>
                )}
              </View>

              {/* Quick amount chips */}
              <View style={styles.chipsRow}>
                {QUICK_AMOUNTS.map((amt) => (
                  <Pressable
                    key={amt}
                    onPress={() => setQuantity(String(amt))}
                    style={[
                      styles.amountChip,
                      quantity === String(amt) && styles.amountChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.amountChipText,
                        quantity === String(amt) && styles.amountChipTextActive,
                      ]}
                    >
                      +{amt}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <TextInput
                style={styles.input}
                placeholder="Or enter custom amount"
                placeholderTextColor={colors.textTertiary}
                value={quantity}
                onChangeText={(val) => {
                  setQuantity(val);
                  if (error) setError(null);
                }}
                keyboardType="numeric"
              />
            </View>

            {/* Optional Note */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Note (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Optional context, place, or thoughts..."
                placeholderTextColor={colors.textTertiary}
                value={note}
                onChangeText={setNote}
                maxLength={100}
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
                label="Save Entry"
                onPress={handleSubmit}
                variant="primary"
                size="md"
                loading={isSubmitting}
                disabled={behaviors.length === 0}
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
    maxHeight: '85%',
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
    color: colors.textPrimary,
  },
  unitHint: {
    ...typography.bodySmall,
    color: colors.accentPrimaryDark,
    fontWeight: '600',
  },
  emptyNote: {
    ...typography.bodyMedium,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  behaviorList: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  behaviorChip: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'flex-start',
    minWidth: 100,
  },
  behaviorChipActive: {
    backgroundColor: colors.accentPrimarySubtle,
    borderColor: colors.accentPrimaryDark,
  },
  behaviorChipText: {
    ...typography.labelLarge,
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  behaviorChipTextActive: {
    color: colors.accentPrimaryDark,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  amountChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountChipActive: {
    backgroundColor: colors.accentPrimarySubtle,
    borderColor: colors.accentPrimaryDark,
  },
  amountChipText: {
    ...typography.labelLarge,
    fontSize: 14,
    color: colors.textSecondary,
  },
  amountChipTextActive: {
    color: colors.accentPrimaryDark,
    fontWeight: '700',
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
