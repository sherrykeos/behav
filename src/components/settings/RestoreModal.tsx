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
import type { BHFile, RestoreResult } from '@/db';
import { formatFriendlyDate } from '@/utils/date';

interface RestoreModalProps {
  visible: boolean;
  backup: BHFile | null;
  filename: string;
  onClose: () => void;
  onConfirmRestore: (mode: 'replace' | 'merge') => Promise<RestoreResult>;
}

export const RestoreModal: React.FC<RestoreModalProps> = ({
  visible,
  backup,
  filename,
  onClose,
  onConfirmRestore,
}) => {
  const [isRestoring, setIsRestoring] = useState(false);
  const [result, setResult] = useState<RestoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!backup) return null;

  const handleRestore = async () => {
    setIsRestoring(true);
    setError(null);
    try {
      // Default full restore policy is atomic replace-all
      const res = await onConfirmRestore('replace');
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
    onClose();
  };

  const isV1 = !!((backup as any).habits && (backup as any).days);
  const behaviorCount = (backup as any).habits?.length ?? (backup as any).data?.behaviors?.length ?? 0;
  const dayCount = (backup as any).days?.length ?? (backup as any).data?.records?.length ?? 0;
  const greenDays = (backup as any).summary?.greenDays;
  const maxStreak = (backup as any).summary?.maxStreak;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleModalClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {result ? (
            /* Success View */
            <View style={styles.content}>
              <View style={styles.successIconContainer}>
                <Ionicons name="checkmark-circle" size={48} color={colors.accentPrimaryDark} />
              </View>

              <Text style={styles.title}>Restore Completed</Text>
              <Text style={styles.subtitle}>
                Your database and history have been successfully reconstructed from {filename}.
              </Text>

              <Card variant="subtle" style={styles.summaryCard}>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Restore Policy</Text>
                  <Text style={styles.statValue}>Full Replace (Clean State)</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Habits Restored</Text>
                  <Text style={styles.statValue}>{result.restoredBehaviors}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Activity Records Restored</Text>
                  <Text style={styles.statValue}>{result.restoredLogs}</Text>
                </View>
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
                <View style={styles.headerTitleRow}>
                  <Text style={styles.title}>Preview Backup</Text>
                  <Badge label="JSON Backup" variant="lavender" />
                </View>
                <TouchableOpacity onPress={handleModalClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.filenameText} numberOfLines={1}>
                {filename}
              </Text>

              {/* Counts Preview Card */}
              <Card variant="subtle" style={styles.previewCard}>
                <Text style={styles.previewSectionTitle}>Data in this backup</Text>
                <View style={styles.countsRow}>
                  <View style={styles.countItem}>
                    <Text style={styles.countNumber}>{behaviorCount}</Text>
                    <Text style={styles.countLabel}>Habits</Text>
                  </View>
                  <View style={styles.countDivider} />
                  <View style={styles.countItem}>
                    <Text style={styles.countNumber}>{dayCount}</Text>
                    <Text style={styles.countLabel}>Days</Text>
                  </View>
                  {greenDays !== undefined && (
                    <>
                      <View style={styles.countDivider} />
                      <View style={styles.countItem}>
                        <Text style={styles.countNumber}>{greenDays}</Text>
                        <Text style={styles.countLabel}>Green Days</Text>
                      </View>
                    </>
                  )}
                  {maxStreak !== undefined && (
                    <>
                      <View style={styles.countDivider} />
                      <View style={styles.countItem}>
                        <Text style={styles.countNumber}>{maxStreak}</Text>
                        <Text style={styles.countLabel}>Max Streak</Text>
                      </View>
                    </>
                  )}
                </View>
              </Card>

              {/* Full Restore Policy Explanation */}
              <View style={styles.warningBox}>
                <Ionicons name="alert-circle" size={20} color={colors.peachText} />
                <View style={styles.warningContent}>
                  <Text style={styles.warningTitle}>Full Restore Notice</Text>
                  <Text style={styles.warningText}>
                    Restoring this backup will replace current local tracking data with the {dayCount} days
                    and {behaviorCount} habits from this file. Your calendar, daily totals, and statistics will be
                    recalculated automatically.
                  </Text>
                </View>
              </View>

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
                  label={isRestoring ? 'Restoring...' : 'Replace All & Restore'}
                  variant="danger"
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
    color: colors.textPrimary,
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
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.peach,
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    ...typography.labelLarge,
    color: colors.peachText,
    marginBottom: 2,
    fontSize: 13,
  },
  warningText: {
    ...typography.bodySmall,
    color: colors.peachText,
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
    marginTop: spacing.sm,
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
