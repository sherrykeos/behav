import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Badge } from '@/components/common';
import { colors, radii, shadows, spacing, typography } from '@/theme';
import type { BehavBackupFile, RestoreResult } from '@/db';
import { formatFriendlyDate } from '@/utils/date';

interface RestoreModalProps {
  visible: boolean;
  backup: BehavBackupFile | null;
  filename: string;
  onClose: () => void;
  onConfirmRestore: (mode: 'merge' | 'replace') => Promise<RestoreResult>;
}

export const RestoreModal: React.FC<RestoreModalProps> = ({
  visible,
  backup,
  filename,
  onClose,
  onConfirmRestore,
}) => {
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [isRestoring, setIsRestoring] = useState(false);
  const [result, setResult] = useState<RestoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!backup) return null;

  const handleRestore = async () => {
    setIsRestoring(true);
    setError(null);
    try {
      const res = await onConfirmRestore(mode);
      setResult(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to restore backup');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleModalClose = () => {
    setResult(null);
    setError(null);
    setIsRestoring(false);
    setMode('merge');
    onClose();
  };

  const behaviorCount = backup.data.behaviors.length;
  const logCount = backup.data.log_entries.length;
  const goalCount = backup.data.goals.length;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleModalClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {result ? (
            /* Success View */
            <View style={styles.content}>
              <View style={styles.successIconContainer}>
                <Ionicons name="checkmark-circle" size={48} color={colors.sageText} />
              </View>

              <Text style={styles.title}>Restore Completed</Text>
              <Text style={styles.subtitle}>
                Your database has been successfully updated with data from {filename}.
              </Text>

              <Card variant="subtle" style={styles.summaryCard}>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Restore Mode</Text>
                  <Text style={styles.statValue}>
                    {result.mode === 'merge' ? 'Merge (Preserved existing)' : 'Complete Replace'}
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Behaviors Processed</Text>
                  <Text style={styles.statValue}>{result.restoredBehaviors}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Log Entries Restored</Text>
                  <Text style={styles.statValue}>{result.restoredLogs}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Goals Restored</Text>
                  <Text style={styles.statValue}>{result.restoredGoals}</Text>
                </View>
                {result.skippedLogs > 0 && (
                  <View style={styles.statRow}>
                    <Text style={[styles.statLabel, { color: colors.peachText }]}>Skipped Orphaned Logs</Text>
                    <Text style={[styles.statValue, { color: colors.peachText }]}>{result.skippedLogs}</Text>
                  </View>
                )}
              </Card>

              <Button
                label="Done"
                variant="primary"
                onPress={handleModalClose}
                style={{ marginTop: spacing.md, width: '100%' }}
              />
            </View>
          ) : (
            /* Preview & Confirmation View */
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.header}>
                <Text style={styles.title}>Preview Backup</Text>
                <TouchableOpacity onPress={handleModalClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.filenameText} numberOfLines={1}>
                {filename}
              </Text>

              <Text style={styles.exportedText}>
                Exported: {formatFriendlyDate(backup.exportedAt.slice(0, 10))} ({backup.exportedAt.slice(11, 16)})
              </Text>

              {/* Counts Preview Card */}
              <Card variant="subtle" style={styles.previewCard}>
                <Text style={styles.previewSectionTitle}>Records in this backup</Text>
                <View style={styles.countsRow}>
                  <View style={styles.countItem}>
                    <Text style={styles.countNumber}>{behaviorCount}</Text>
                    <Text style={styles.countLabel}>Behaviors</Text>
                  </View>
                  <View style={styles.countDivider} />
                  <View style={styles.countItem}>
                    <Text style={styles.countNumber}>{logCount}</Text>
                    <Text style={styles.countLabel}>Logs</Text>
                  </View>
                  <View style={styles.countDivider} />
                  <View style={styles.countItem}>
                    <Text style={styles.countNumber}>{goalCount}</Text>
                    <Text style={styles.countLabel}>Goals</Text>
                  </View>
                </View>
              </Card>

              {/* Mode Selection */}
              <Text style={styles.sectionHeading}>Choose Restore Method</Text>

              <TouchableOpacity
                style={[styles.modeCard, mode === 'merge' && styles.modeCardSelected]}
                onPress={() => setMode('merge')}
                activeOpacity={0.8}
              >
                <View style={styles.modeHeader}>
                  <Ionicons
                    name={mode === 'merge' ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={mode === 'merge' ? colors.primary : colors.textTertiary}
                  />
                  <Text style={styles.modeTitle}>Merge (Safe & Non-Destructive)</Text>
                  <Badge label="Recommended" variant="sage" />
                </View>
                <Text style={styles.modeDesc}>
                  Adds records from this backup to your current database. Existing habits and logs will not be erased.
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeCard, mode === 'replace' && styles.modeCardDangerSelected]}
                onPress={() => setMode('replace')}
                activeOpacity={0.8}
              >
                <View style={styles.modeHeader}>
                  <Ionicons
                    name={mode === 'replace' ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={mode === 'replace' ? colors.peachText : colors.textTertiary}
                  />
                  <Text style={[styles.modeTitle, mode === 'replace' && { color: colors.peachText }]}>
                    Replace (Destructive)
                  </Text>
                </View>
                <Text style={styles.modeDesc}>
                  Completely wipes the current database and replaces all records with this backup.
                </Text>
              </TouchableOpacity>

              {mode === 'replace' && (
                <View style={styles.warningBox}>
                  <Ionicons name="warning" size={18} color={colors.peachText} />
                  <Text style={styles.warningText}>
                    Caution: All current records on this device will be deleted before restoring. This action cannot be undone.
                  </Text>
                </View>
              )}

              {error && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={18} color={colors.peachText} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.actions}>
                <Button
                  label="Cancel"
                  variant="secondary"
                  onPress={handleModalClose}
                  disabled={isRestoring}
                  style={styles.actionBtn}
                />
                <Button
                  label={
                    isRestoring ? 'Restoring...' : mode === 'replace' ? 'Replace All' : 'Merge & Restore'
                  }
                  variant={mode === 'replace' ? 'danger' : 'primary'}
                  onPress={handleRestore}
                  disabled={isRestoring}
                  loading={isRestoring}
                  style={styles.actionBtn}
                />
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(32, 30, 38, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  container: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    padding: spacing.lg,
    ...shadows.soft,
  },
  content: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.titleMedium,
    fontSize: 18,
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  filenameText: {
    ...typography.labelLarge,
    color: colors.primary,
    marginBottom: 2,
  },
  exportedText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  previewCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  previewSectionTitle: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  countsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  countItem: {
    alignItems: 'center',
  },
  countNumber: {
    ...typography.titleLarge,
    fontSize: 22,
    color: colors.textPrimary,
  },
  countLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  countDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.borderSubtle,
  },
  sectionHeading: {
    ...typography.titleSmall,
    fontSize: 14,
    marginBottom: spacing.xs,
  },
  modeCard: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  modeCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  modeCardDangerSelected: {
    borderColor: colors.peachText,
    backgroundColor: colors.peach,
  },
  modeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: spacing.xs,
  },
  modeTitle: {
    ...typography.labelLarge,
    flex: 1,
    marginLeft: 6,
    fontSize: 14,
  },
  modeDesc: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginLeft: 26,
    lineHeight: 18,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.peach,
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  warningText: {
    ...typography.bodySmall,
    color: colors.peachText,
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.peach,
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.peachText,
    flex: 1,
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionBtn: {
    flex: 1,
  },
  successIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  summaryCard: {
    width: '100%',
    padding: spacing.md,
    marginVertical: spacing.md,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  statLabel: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    fontSize: 13,
  },
  statValue: {
    ...typography.labelLarge,
    fontSize: 13,
    color: colors.textPrimary,
  },
});
