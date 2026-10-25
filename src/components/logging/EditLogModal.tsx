import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/common/Button';
import { colors, radii, shadows, spacing, typography } from '@/theme';
import { type LogEntryWithBehavior } from '@/types/database';

interface EditLogModalProps {
  visible: boolean;
  entry: LogEntryWithBehavior | null;
  onClose: () => void;
  onSave: (id: string, value: number, note?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const EditLogModal: React.FC<EditLogModalProps> = ({
  visible,
  entry,
  onClose,
  onSave,
  onDelete,
}) => {
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (entry) {
      setValue(String(entry.value));
      setNote(entry.note || '');
    } else {
      setValue('');
      setNote('');
    }
    setError(null);
  }, [entry, visible]);

  if (!entry) return null;

  const handleSave = async () => {
    const num = Number(value.trim());
    if (isNaN(num) || num <= 0) {
      setError('Value must be a positive number.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave(entry.id, num, note.trim() || undefined);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update entry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Log Entry',
      `Are you sure you want to delete this ${entry.value} ${entry.behaviorUnit} entry?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsSubmitting(true);
              await onDelete(entry.id);
              onClose();
            } catch (err: any) {
              setError(err?.message || 'Failed to delete entry.');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const timeString = new Date(entry.occurredAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

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
              <Text style={styles.title}>Correct Entry</Text>
              <Text style={styles.subtitle}>
                {entry.behaviorName} • {timeString}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close modal">
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Value */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Quantity ({entry.behaviorUnit})</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 1"
              placeholderTextColor={colors.textTertiary}
              value={value}
              onChangeText={(val) => {
                setValue(val);
                if (error) setError(null);
              }}
              keyboardType="numeric"
            />
          </View>

          {/* Note */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Note (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Add or change note..."
              placeholderTextColor={colors.textTertiary}
              value={note}
              onChangeText={setNote}
              maxLength={100}
            />
          </View>

          {/* Actions */}
          <View style={styles.actionsRow}>
            <Button
              label="Delete"
              onPress={handleDelete}
              variant="danger"
              size="md"
              style={{ flex: 1 }}
              loading={isSubmitting}
            />
            <Button
              label="Save"
              onPress={handleSave}
              variant="primary"
              size="md"
              style={{ flex: 1.4 }}
              loading={isSubmitting}
            />
          </View>
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
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
});
