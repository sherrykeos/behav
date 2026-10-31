import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '@/theme';
import type { RecordBounds } from '@/db';

interface ClearDataModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirmClear: () => Promise<void>;
  onShortcutBackup: () => Promise<boolean>;
  recordBounds: RecordBounds;
  habitCount: number;
}

export const ClearDataModal: React.FC<ClearDataModalProps> = ({
  visible,
  onClose,
  onConfirmClear,
  onShortcutBackup,
  recordBounds,
  habitCount,
}) => {
  const [confirmInput, setConfirmInput] = useState('');
  const [isClearing, setIsClearing] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupSuccess, setBackupSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfirmed = confirmInput.trim().toUpperCase() === 'CLEAR';

  const handleResetModal = () => {
    setConfirmInput('');
    setIsClearing(false);
    setIsBackingUp(false);
    setBackupSuccess(false);
    setError(null);
    onClose();
  };

  const handleBackupShortcut = async () => {
    setIsBackingUp(true);
    setError(null);
    try {
      const ok = await onShortcutBackup();
      if (ok) {
        setBackupSuccess(true);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to generate backup.');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleClear = async () => {
    if (!isConfirmed) return;
    setIsClearing(true);
    setError(null);
    try {
      await onConfirmClear();
      handleResetModal();
    } catch (err: any) {
      setError(err?.message || 'Failed to clear app data.');
      setIsClearing(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleResetModal}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
        >
          <View style={styles.modalCard}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.headerTitleGroup}>
                <View style={styles.dangerIconBadge}>
                  <Ionicons name="warning-outline" size={20} color={colors.danger} />
                </View>
                <Text style={styles.modalTitle}>Clear App Data</Text>
              </View>
              <TouchableOpacity
                onPress={handleResetModal}
                style={styles.closeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Warning Aura Card */}
              <View style={styles.warningBox}>
                <Ionicons name="alert-circle" size={32} color={colors.danger} />
                <View style={styles.warningTextCol}>
                  <Text style={styles.warningTitle}>Permanent & Irreversible</Text>
                  <Text style={styles.warningDescription}>
                    Clearing the app will erase all your habits, daily logged entries, goals,
                    and streak records from this device.
                  </Text>
                </View>
              </View>

              {/* Data impact summary */}
              <View style={styles.impactGrid}>
                <View style={styles.impactCard}>
                  <Text style={styles.impactValue}>{habitCount}</Text>
                  <Text style={styles.impactLabel}>Habits</Text>
                </View>
                <View style={styles.impactCard}>
                  <Text style={styles.impactValue}>{recordBounds.recordedDaysCount}</Text>
                  <Text style={styles.impactLabel}>Days Tracked</Text>
                </View>
                <View style={styles.impactCard}>
                  <Text style={styles.impactValue}>{recordBounds.totalEntries}</Text>
                  <Text style={styles.impactLabel}>Log Records</Text>
                </View>
              </View>

              {/* Strongly Recommended Full Backup Section */}
              <View style={styles.recommendationCard}>
                <View style={styles.recommendationHeader}>
                  <Ionicons name="shield-checkmark" size={18} color={colors.accentPrimary} />
                  <Text style={styles.recommendationTitle}>Recommended: Create Backup First</Text>
                </View>
                <Text style={styles.recommendationBody}>
                  Save all your records from the beginning to now into a single JSON file.
                  You can restore your complete progress anytime.
                </Text>

                {backupSuccess ? (
                  <View style={styles.backupSuccessBadge}>
                    <Ionicons name="checkmark-circle" size={18} color={colors.accentPrimary} />
                    <Text style={styles.backupSuccessText}>
                      Full backup created & exported safely!
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.backupShortcutBtn}
                    onPress={handleBackupShortcut}
                    disabled={isBackingUp}
                    activeOpacity={0.8}
                  >
                    {isBackingUp ? (
                      <ActivityIndicator size="small" color="#101412" />
                    ) : (
                      <Ionicons name="flash" size={16} color="#101412" />
                    )}
                    <Text style={styles.backupShortcutBtnText}>
                      {isBackingUp ? 'Exporting All Data...' : '⚡ Backup Entire App Data Now'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Error Banner */}
              {error && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color={colors.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Type CLEAR verification */}
              <View style={styles.confirmSection}>
                <Text style={styles.confirmLabel}>
                  Type <Text style={styles.boldWord}>CLEAR</Text> to authorize data erasure:
                </Text>
                <TextInput
                  style={[
                    styles.confirmInput,
                    isConfirmed && styles.confirmInputValid,
                  ]}
                  value={confirmInput}
                  onChangeText={setConfirmInput}
                  placeholder="CLEAR"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={!isClearing}
                />
              </View>

              {/* Action Buttons */}
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={handleResetModal}
                  disabled={isClearing}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>Keep My Data</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.dangerBtn,
                    !isConfirmed && styles.dangerBtnDisabled,
                  ]}
                  onPress={handleClear}
                  disabled={!isConfirmed || isClearing}
                  activeOpacity={0.8}
                >
                  {isClearing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                  )}
                  <Text style={styles.dangerBtnText}>
                    {isClearing ? 'Erasing...' : 'Erase All Data'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  keyboardContainer: {
    width: '100%',
    maxWidth: 440,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: `${colors.danger}40`,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dangerIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${colors.danger}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    ...typography.titleMedium,
    color: colors.textPrimary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: `${colors.danger}15`,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.danger}35`,
  },
  warningTextCol: {
    flex: 1,
  },
  warningTitle: {
    ...typography.labelLarge,
    color: colors.danger,
    marginBottom: 4,
  },
  warningDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  impactGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  impactCard: {
    flex: 1,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  impactValue: {
    ...typography.labelLarge,
    fontSize: 16,
    color: colors.textPrimary,
  },
  impactLabel: {
    ...typography.labelSmall,
    color: colors.textTertiary,
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  recommendationCard: {
    backgroundColor: `${colors.accentPrimary}10`,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.accentPrimary}30`,
    gap: spacing.sm,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  recommendationTitle: {
    ...typography.labelMedium,
    color: colors.accentPrimary,
  },
  recommendationBody: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  backupShortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accentPrimary,
    paddingVertical: 10,
    borderRadius: radii.sm,
    marginTop: 4,
  },
  backupShortcutBtnText: {
    ...typography.labelMedium,
    color: '#101412',
    fontWeight: '700',
  },
  backupSuccessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: `${colors.accentPrimary}20`,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radii.sm,
    marginTop: 4,
  },
  backupSuccessText: {
    ...typography.labelSmall,
    color: colors.accentPrimary,
    fontWeight: '600',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: `${colors.danger}15`,
    padding: spacing.sm,
    borderRadius: radii.sm,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.danger,
    fontSize: 12,
  },
  confirmSection: {
    marginTop: spacing.xs,
  },
  confirmLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  boldWord: {
    fontWeight: '700',
    color: colors.danger,
  },
  confirmInput: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    ...typography.bodyMedium,
    color: colors.textPrimary,
    fontSize: 15,
    letterSpacing: 2,
    textAlign: 'center',
  },
  confirmInputValid: {
    borderColor: colors.danger,
    backgroundColor: `${colors.danger}10`,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  cancelBtnText: {
    ...typography.labelMedium,
    color: colors.textSecondary,
  },
  dangerBtn: {
    flex: 1.2,
    backgroundColor: colors.danger,
    borderRadius: radii.md,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dangerBtnDisabled: {
    opacity: 0.4,
  },
  dangerBtnText: {
    ...typography.labelMedium,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
