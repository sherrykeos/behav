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
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '@/theme';
import { type Behavior, type CreateBehaviorInput } from '@/types/database';
import { useBehaviors } from '@/context/BehaviorContext';
import { exportFile } from '@/utils/fileExport';
import { toDayString } from '@/utils/date';

interface BehaviorModalProps {
  visible: boolean;
  behaviorToEdit?: Behavior | null;
  onClose: () => void;
  onSave: (data: CreateBehaviorInput) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export interface HabitLogoOption {
  id: string;
  name: string;
  source: 'ionicons' | 'material';
  icon: string;
}

export const HABIT_LOGO_OPTIONS: HabitLogoOption[] = [
  // Primary habit logos
  { id: 'smoking', name: 'Smoke', source: 'material', icon: 'smoking' },
  { id: 'cafe', name: 'Coffee', source: 'material', icon: 'coffee' },
  { id: 'wine', name: 'Wine', source: 'material', icon: 'glass-wine' },
  { id: 'beer', name: 'Beer', source: 'material', icon: 'beer' },
  { id: 'leaf', name: 'Leaf', source: 'ionicons', icon: 'leaf' },
  { id: 'flame', name: 'Flame', source: 'ionicons', icon: 'flame' },
  { id: 'water', name: 'Water', source: 'material', icon: 'water' },
  { id: 'fitness', name: 'Fitness', source: 'ionicons', icon: 'fitness' },
  { id: 'food-apple', name: 'Food', source: 'material', icon: 'food-apple' },
  { id: 'controller', name: 'Gaming', source: 'material', icon: 'controller' },
  { id: 'cellphone', name: 'Phone', source: 'material', icon: 'cellphone' },
  { id: 'barbell', name: 'Gym', source: 'material', icon: 'dumbbell' },
  { id: 'walk', name: 'Walk', source: 'material', icon: 'walk' },
  { id: 'book', name: 'Read', source: 'material', icon: 'book-open-variant' },
  { id: 'bed', name: 'Sleep', source: 'material', icon: 'bed' },
  { id: 'heart', name: 'Heart', source: 'ionicons', icon: 'heart' },
  { id: 'sparkles', name: 'Mindset', source: 'ionicons', icon: 'sparkles' },
  { id: 'moon', name: 'Rest', source: 'ionicons', icon: 'moon' },
  { id: 'repeat', name: 'General', source: 'material', icon: 'repeat' },
];

export const PRESET_HABITS = [
  { name: 'Smoking', icon: 'smoking', unit: 'cigarettes' },
  { name: 'Coffee', icon: 'cafe', unit: 'cups' },
  { name: 'Alcohol', icon: 'wine', unit: 'drinks' },
  { name: 'Vaping', icon: 'smoking', unit: 'times' },
  { name: 'NoFap', icon: 'repeat', unit: 'times' },
  { name: 'Junk Food', icon: 'food-apple', unit: 'times' },
  { name: 'Gaming', icon: 'controller', unit: 'hours' },
  { name: 'Screen Time', icon: 'cellphone', unit: 'hours' },
  { name: 'Workout', icon: 'barbell', unit: 'times' },
  { name: 'Meditation', icon: 'leaf', unit: 'minutes' },
];

const COMMON_UNITS = ['times', 'cigarettes', 'cups', 'minutes', 'hours', 'drinks'];
const COMMON_LIMITS = ['1', '2', '3', '5', '10'];

export function renderHabitLogo(
  iconId?: string | null,
  size = 22,
  color: string = colors.textPrimary
) {
  if (!iconId) {
    return <MaterialCommunityIcons name="repeat" size={size} color={color} />;
  }
  const match = HABIT_LOGO_OPTIONS.find((opt) => opt.id === iconId);
  if (match) {
    if (match.source === 'ionicons') {
      return <Ionicons name={match.icon as any} size={size} color={color} />;
    }
    return <MaterialCommunityIcons name={match.icon as any} size={size} color={color} />;
  }
  return <Ionicons name={iconId as any} size={size} color={color} />;
}

export const BehaviorModal: React.FC<BehaviorModalProps> = ({
  visible,
  behaviorToEdit,
  onClose,
  onSave,
  onDelete,
}) => {
  const { createBackupData, deleteBehavior } = useBehaviors();

  // Core essential fields
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<string>('repeat');
  const [unit, setUnit] = useState('times');
  const [dailyLimit, setDailyLimit] = useState('');

  // Optional collapsible fields
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deletion & Warning states
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);

  useEffect(() => {
    if (visible) {
      if (behaviorToEdit) {
        setName(behaviorToEdit.nickname || behaviorToEdit.name);
        setSelectedIcon(behaviorToEdit.icon || 'repeat');
        setUnit(behaviorToEdit.unit || 'times');
        setDailyLimit(behaviorToEdit.dailyLimit ? String(behaviorToEdit.dailyLimit) : '');
        setSubtitle(behaviorToEdit.subtitle || '');
        setCategory(behaviorToEdit.category || '');
        setDescription(behaviorToEdit.description || '');

        // Auto-expand advanced options if the existing habit has them filled
        const hasExtraData = !!(
          behaviorToEdit.subtitle ||
          behaviorToEdit.category ||
          behaviorToEdit.description
        );
        setShowAdvanced(hasExtraData);
      } else {
        setName('');
        setSelectedIcon('repeat');
        setUnit('times');
        setDailyLimit('');
        setSubtitle('');
        setCategory('');
        setDescription('');
        setShowAdvanced(false);
      }
      setError(null);
      setShowDeleteWarning(false);
      setIsDeleting(false);
      setIsBackingUp(false);
    }
  }, [behaviorToEdit, visible]);

  const handleSelectPreset = (preset: (typeof PRESET_HABITS)[0]) => {
    setName(preset.name);
    setSelectedIcon(preset.icon);
    setUnit(preset.unit);
    setError(null);
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please enter a habit name.');
      return;
    }

    let parsedLimit: number | null = null;
    if (dailyLimit.trim()) {
      const num = Number(dailyLimit.trim());
      if (isNaN(num) || num <= 0) {
        setError('Daily target/limit must be a positive number.');
        return;
      }
      parsedLimit = num;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        name: trimmedName,
        nickname: trimmedName,
        subtitle: subtitle.trim() || null,
        category: category.trim() || null,
        unit: unit.trim() || 'times',
        dailyLimit: parsedLimit,
        description: description.trim() || null,
        icon: selectedIcon || null,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save habit.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Delete habit directly without backup
   */
  const handleDirectDelete = async () => {
    if (!behaviorToEdit) return;
    setIsDeleting(true);
    setError(null);
    try {
      if (onDelete) {
        await onDelete(behaviorToEdit.id);
      } else {
        await deleteBehavior(behaviorToEdit.id);
      }
      setShowDeleteWarning(false);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete habit.');
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Export backup file first, then delete habit
   */
  const handleBackupAndDelete = async () => {
    if (!behaviorToEdit) return;
    setIsBackingUp(true);
    setError(null);
    try {
      const backup = await createBackupData();
      const today = toDayString();
      const habitSlug = (behaviorToEdit.nickname || behaviorToEdit.name)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-');
      const filename = `Behav-Backup-BeforeDeleting-${habitSlug}-${today}.json`;
      const jsonContent = JSON.stringify(backup, null, 2);

      const result = await exportFile(jsonContent, filename, 'application/json');
      if (!result.success && result.error && !result.uri) {
        throw new Error(result.error || 'Failed to export backup file before deleting.');
      }

      // Proceed to delete
      setIsDeleting(true);
      if (onDelete) {
        await onDelete(behaviorToEdit.id);
      } else {
        await deleteBehavior(behaviorToEdit.id);
      }
      setShowDeleteWarning(false);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Backup before delete failed.');
    } finally {
      setIsBackingUp(false);
      setIsDeleting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleCol}>
              <Text style={styles.title}>
                {behaviorToEdit ? 'Edit Habit' : 'New Habit'}
              </Text>
              <Text style={styles.subtitle}>
                {behaviorToEdit ? 'Update your habit settings' : 'What habit would you like to track?'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.closeBtn}
              accessibilityLabel="Close modal"
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={17} color={colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Quick Suggestion Pills (Only shown when creating new habit) */}
            {!behaviorToEdit && (
              <View style={styles.presetsSection}>
                <Text style={styles.sectionCaption}>Quick suggestions</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.presetsScroll}
                >
                  {PRESET_HABITS.map((p) => {
                    const isSelected = name.toLowerCase() === p.name.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={p.name}
                        style={[styles.presetChip, isSelected && styles.presetChipActive]}
                        onPress={() => handleSelectPreset(p)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.presetIconWrap}>
                          {renderHabitLogo(p.icon, 14, isSelected ? colors.textInverse : colors.accentPrimary)}
                        </View>
                        <Text style={[styles.presetChipText, isSelected && styles.presetChipTextActive]}>
                          {p.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Habit Identity Card: Icon + Name */}
            <View style={styles.card}>
              <View style={styles.identityRow}>
                {/* Selected Icon Avatar Button */}
                <View style={styles.iconAvatar}>
                  {renderHabitLogo(selectedIcon, 26, colors.accentPrimary)}
                </View>

                {/* Name Input */}
                <View style={styles.nameInputContainer}>
                  <Text style={styles.fieldLabel}>Habit Name *</Text>
                  <TextInput
                    style={styles.mainInput}
                    placeholder="e.g. Smoking, Coffee, Reading"
                    placeholderTextColor={colors.textTertiary}
                    value={name}
                    onChangeText={(val) => {
                      setName(val);
                      if (error) setError(null);
                    }}
                    maxLength={60}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              {/* Icon Picker Carousel */}
              <View style={styles.iconSelectorRow}>
                <Text style={styles.iconPickerLabel}>Select Icon</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.iconPickerScroll}
                >
                  {HABIT_LOGO_OPTIONS.map((opt) => {
                    const isSelected = selectedIcon === opt.id;
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        style={[styles.iconChoice, isSelected && styles.iconChoiceActive]}
                        onPress={() => setSelectedIcon(opt.id)}
                        activeOpacity={0.7}
                      >
                        {renderHabitLogo(
                          opt.id,
                          18,
                          isSelected ? colors.accentPrimary : colors.textSecondary
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>

            {/* Tracking Config Card: Unit & Limit */}
            <View style={styles.card}>
              {/* Unit Selection */}
              <View style={styles.formGroup}>
                <View style={styles.rowBetween}>
                  <Text style={styles.fieldLabel}>Logged Unit</Text>
                  <TextInput
                    style={styles.unitInlineInput}
                    value={unit}
                    onChangeText={setUnit}
                    placeholder="custom..."
                    placeholderTextColor={colors.textTertiary}
                    maxLength={20}
                  />
                </View>
                <View style={styles.chipsRow}>
                  {COMMON_UNITS.map((u) => {
                    const isSelected = unit.toLowerCase() === u.toLowerCase();
                    return (
                      <Pressable
                        key={u}
                        onPress={() => setUnit(u)}
                        style={[styles.chip, isSelected && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                          {u}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.divider} />

              {/* Daily Limit / Target (Optional) */}
              <View style={styles.formGroupNoMargin}>
                <View style={styles.rowBetween}>
                  <View>
                    <Text style={styles.fieldLabel}>Daily Target / Limit</Text>
                    <Text style={styles.fieldCaption}>Threshold for daily status</Text>
                  </View>
                  <TextInput
                    style={styles.limitInput}
                    placeholder="None"
                    placeholderTextColor={colors.textTertiary}
                    value={dailyLimit}
                    onChangeText={(val) => {
                      setDailyLimit(val);
                      if (error) setError(null);
                    }}
                    keyboardType="numeric"
                    maxLength={6}
                  />
                </View>

                {/* Quick limit suggestion buttons */}
                <View style={styles.limitChipsRow}>
                  <TouchableOpacity
                    style={[styles.limitChip, !dailyLimit && styles.limitChipActive]}
                    onPress={() => setDailyLimit('')}
                  >
                    <Text style={[styles.limitChipText, !dailyLimit && styles.limitChipTextActive]}>
                      No Limit
                    </Text>
                  </TouchableOpacity>
                  {COMMON_LIMITS.map((lim) => {
                    const isSelected = dailyLimit === lim;
                    return (
                      <TouchableOpacity
                        key={lim}
                        style={[styles.limitChip, isSelected && styles.limitChipActive]}
                        onPress={() => setDailyLimit(lim)}
                      >
                        <Text style={[styles.limitChipText, isSelected && styles.limitChipTextActive]}>
                          {lim}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* Collapsible More Options Accordion */}
            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() => setShowAdvanced((prev) => !prev)}
              activeOpacity={0.7}
            >
              <Text style={styles.accordionTitle}>
                {showAdvanced ? 'Hide Additional Options' : 'More Options (Subtitle, Notes)'}
              </Text>
              <Ionicons
                name={showAdvanced ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            {showAdvanced && (
              <View style={[styles.card, styles.advancedCard]}>
                {/* Subtitle */}
                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>Subtitle</Text>
                  <TextInput
                    style={styles.subInput}
                    placeholder="e.g. Keep it down, 2L daily goal"
                    placeholderTextColor={colors.textTertiary}
                    value={subtitle}
                    onChangeText={setSubtitle}
                    maxLength={80}
                  />
                </View>

                {/* Category */}
                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>Category</Text>
                  <TextInput
                    style={styles.subInput}
                    placeholder="e.g. Health, Focus, Routine"
                    placeholderTextColor={colors.textTertiary}
                    value={category}
                    onChangeText={setCategory}
                    maxLength={40}
                  />
                </View>

                {/* Notes */}
                <View style={styles.formGroupNoMargin}>
                  <Text style={styles.fieldLabel}>Notes & Cues</Text>
                  <TextInput
                    style={[styles.subInput, styles.textArea]}
                    placeholder="Add personal reminders or motivation..."
                    placeholderTextColor={colors.textTertiary}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={2}
                    maxLength={150}
                  />
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onClose}
                disabled={isSubmitting}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, isSubmitting && styles.btnDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={colors.textInverse} />
                ) : (
                  <>
                    <Ionicons
                      name={behaviorToEdit ? 'checkmark' : 'add'}
                      size={18}
                      color={colors.textInverse}
                    />
                    <Text style={styles.saveBtnText}>
                      {behaviorToEdit ? 'Save Changes' : 'Create Habit'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Delete Habit Trigger Button (Only in edit mode) */}
            {behaviorToEdit && (
              <View style={styles.deleteSection}>
                <TouchableOpacity
                  style={styles.deleteTriggerBtn}
                  onPress={() => setShowDeleteWarning(true)}
                  activeOpacity={0.7}
                  disabled={isSubmitting || isDeleting || isBackingUp}
                >
                  <Ionicons name="trash-outline" size={15} color={colors.danger} />
                  <Text style={styles.deleteTriggerText}>Delete Habit</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* Delete Confirmation & Safe Backup Dialog */}
          <Modal
            visible={showDeleteWarning}
            transparent
            animationType="fade"
            onRequestClose={() => {
              if (!isDeleting && !isBackingUp) setShowDeleteWarning(false);
            }}
          >
            <View style={styles.warningOverlay}>
              <View style={styles.warningCard}>
                <View style={styles.warningBadge}>
                  <Ionicons name="alert-circle" size={28} color={colors.danger} />
                </View>

                <Text style={styles.warningTitle}>
                  Delete "{behaviorToEdit?.nickname || behaviorToEdit?.name}"?
                </Text>

                <Text style={styles.warningDesc}>
                  Permanently deletes this habit and its historical logs from your device.
                </Text>

                <View style={styles.backupCallout}>
                  <Ionicons name="shield-checkmark" size={16} color={colors.accentPrimary} />
                  <Text style={styles.backupCalloutText}>
                    Export a backup file now to keep your records safe before deleting.
                  </Text>
                </View>

                <View style={styles.warningActions}>
                  <TouchableOpacity
                    style={[styles.backupDeleteBtn, (isBackingUp || isDeleting) && styles.btnDisabled]}
                    onPress={handleBackupAndDelete}
                    disabled={isBackingUp || isDeleting}
                    activeOpacity={0.7}
                  >
                    {isBackingUp ? (
                      <ActivityIndicator size="small" color="#101412" />
                    ) : (
                      <>
                        <Ionicons name="cloud-upload" size={16} color="#101412" />
                        <Text style={styles.backupDeleteBtnText}>Backup & Delete</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.directDeleteBtn, (isBackingUp || isDeleting) && styles.btnDisabled]}
                    onPress={handleDirectDelete}
                    disabled={isBackingUp || isDeleting}
                    activeOpacity={0.7}
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" color={colors.dangerText} />
                    ) : (
                      <>
                        <Ionicons name="trash-outline" size={15} color={colors.dangerText} />
                        <Text style={styles.directDeleteBtnText}>Delete Without Backup</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.warningCancelBtn}
                    onPress={() => setShowDeleteWarning(false)}
                    disabled={isBackingUp || isDeleting}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.warningCancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheetContainer: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  headerTitleCol: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 12.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  scrollContent: {
    paddingBottom: spacing.sm,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 82, 82, 0.12)',
    borderColor: 'rgba(255, 82, 82, 0.3)',
    borderWidth: 1,
    padding: spacing.sm,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12.5,
    fontWeight: '500',
    flex: 1,
  },
  // Presets Section
  presetsSection: {
    marginBottom: spacing.md,
  },
  sectionCaption: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  presetsScroll: {
    gap: 8,
    paddingBottom: 2,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  presetChipActive: {
    backgroundColor: colors.accentPrimary,
    borderColor: colors.accentPrimary,
  },
  presetIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  presetChipTextActive: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  // Card Containers
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 18,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.md,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: spacing.sm,
  },
  iconAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(185, 246, 202, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(185, 246, 202, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameInputContainer: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  fieldCaption: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  mainInput: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  // Icon Picker
  iconSelectorRow: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  iconPickerLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  iconPickerScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  iconChoice: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconChoiceActive: {
    backgroundColor: 'rgba(185, 246, 202, 0.15)',
    borderColor: colors.accentPrimary,
  },
  // Form groups & Units
  formGroup: {
    marginBottom: spacing.sm,
  },
  formGroupNoMargin: {
    marginBottom: 0,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  unitInlineInput: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    minWidth: 70,
    textAlign: 'right',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  chipActive: {
    backgroundColor: 'rgba(185, 246, 202, 0.14)',
    borderColor: 'rgba(185, 246, 202, 0.4)',
  },
  chipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  chipTextActive: {
    color: colors.accentPrimary,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: spacing.sm,
  },
  limitInput: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    minWidth: 60,
    textAlign: 'center',
  },
  limitChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  limitChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  limitChipActive: {
    backgroundColor: 'rgba(185, 246, 202, 0.12)',
    borderColor: 'rgba(185, 246, 202, 0.35)',
  },
  limitChipText: {
    fontSize: 11.5,
    color: colors.textTertiary,
    fontWeight: '600',
  },
  limitChipTextActive: {
    color: colors.accentPrimary,
    fontWeight: '700',
  },
  // Accordion
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: spacing.xs,
  },
  accordionTitle: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  advancedCard: {
    marginTop: 4,
  },
  subInput: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 11,
    paddingVertical: 7,
    fontSize: 13,
    color: colors.textPrimary,
  },
  textArea: {
    minHeight: 52,
    textAlignVertical: 'top',
  },
  // Actions
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: spacing.sm,
  },
  cancelBtn: {
    flex: 0.35,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  cancelBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  saveBtn: {
    flex: 0.65,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: colors.accentPrimary,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textInverse,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  // Delete Section
  deleteSection: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  deleteTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  deleteTriggerText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.danger,
  },
  // Warning Dialog
  warningOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  warningCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  warningBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 82, 82, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  warningDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  backupCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(185, 246, 202, 0.1)',
    borderRadius: 12,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(185, 246, 202, 0.25)',
    marginBottom: spacing.lg,
  },
  backupCalloutText: {
    flex: 1,
    fontSize: 12,
    color: colors.textPrimary,
    lineHeight: 16,
  },
  warningActions: {
    width: '100%',
    gap: 10,
  },
  backupDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.accentPrimary,
    paddingVertical: 12,
    borderRadius: 14,
  },
  backupDeleteBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#101412',
  },
  directDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 82, 82, 0.12)',
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.3)',
  },
  directDeleteBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.dangerText,
  },
  warningCancelBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  warningCancelText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
