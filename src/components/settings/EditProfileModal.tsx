import React, { useState, useEffect } from 'react';
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
import type { UserProfile } from '@/context/BehaviorContext';

interface EditProfileModalProps {
  visible: boolean;
  initialProfile: UserProfile;
  onClose: () => void;
  onSave: (profile: Partial<UserProfile>) => Promise<void>;
}

const AVATAR_ICONS: Array<keyof typeof Ionicons.glyphMap> = [
  'person',
  'sparkles',
  'leaf',
  'flame',
  'fitness',
  'water',
  'star',
  'compass',
  'heart',
  'moon',
];

const AVATAR_COLORS = [
  '#B9F6CA', // Electric Mint (Primary)
  '#FF9F43', // Signal Amber
  '#64B5F6', // Sky Blue
  '#BA68C8', // Lavender
  '#FF8A80', // Coral Peach
  '#00E676', // Emerald
];

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  visible,
  initialProfile,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(initialProfile.name);
  const [bio, setBio] = useState(initialProfile.bio);
  const [selectedIcon, setSelectedIcon] = useState(initialProfile.avatarIcon);
  const [selectedColor, setSelectedColor] = useState(initialProfile.avatarColor);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setName(initialProfile.name);
      setBio(initialProfile.bio);
      setSelectedIcon(initialProfile.avatarIcon);
      setSelectedColor(initialProfile.avatarColor);
      setError(null);
    }
  }, [visible, initialProfile]);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Name cannot be empty.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onSave({
        name: trimmedName,
        bio: bio.trim(),
        avatarIcon: selectedIcon,
        avatarColor: selectedColor,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save profile changes.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Edit Profile</Text>
              <Text style={styles.subtitle}>Customize your personal details</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Feedback error */}
          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={colors.dangerText} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Live Avatar Preview */}
            <View style={styles.avatarPreviewSection}>
              <View
                style={[
                  styles.avatarCircle,
                  { backgroundColor: `${selectedColor}22`, borderColor: selectedColor },
                ]}
              >
                <Ionicons
                  name={selectedIcon as any}
                  size={36}
                  color={selectedColor}
                />
              </View>
              <Text style={styles.previewName}>{name.trim() || 'Your Name'}</Text>
              <Text style={styles.previewBio} numberOfLines={1}>
                {bio.trim() || 'Personal focus or motto'}
              </Text>
            </View>

            {/* Display Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Display Name</Text>
              <TextInput
                style={styles.textInput}
                value={name}
                onChangeText={(val) => {
                  setName(val);
                  if (error) setError(null);
                }}
                placeholder="Enter your name"
                placeholderTextColor={colors.textTertiary}
                maxLength={30}
              />
            </View>

            {/* Bio / Motto Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Focus / Bio</Text>
              <TextInput
                style={[styles.textInput, styles.bioInput]}
                value={bio}
                onChangeText={setBio}
                placeholder="e.g. Building consistent daily habits"
                placeholderTextColor={colors.textTertiary}
                maxLength={70}
                multiline
              />
            </View>

            {/* Avatar Icon Picker */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Avatar Icon</Text>
              <View style={styles.iconGrid}>
                {AVATAR_ICONS.map((iconName) => {
                  const isSelected = selectedIcon === iconName;
                  return (
                    <TouchableOpacity
                      key={iconName}
                      style={[
                        styles.iconOption,
                        isSelected && {
                          borderColor: selectedColor,
                          backgroundColor: `${selectedColor}22`,
                        },
                      ]}
                      onPress={() => setSelectedIcon(iconName)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={iconName}
                        size={20}
                        color={isSelected ? selectedColor : colors.textSecondary}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Avatar Accent Color Picker */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Theme Accent Color</Text>
              <View style={styles.colorRow}>
                {AVATAR_COLORS.map((colorHex) => {
                  const isSelected = selectedColor === colorHex;
                  return (
                    <TouchableOpacity
                      key={colorHex}
                      style={[
                        styles.colorCircle,
                        { backgroundColor: colorHex },
                        isSelected && styles.colorCircleSelected,
                      ]}
                      onPress={() => setSelectedColor(colorHex)}
                      activeOpacity={0.7}
                    >
                      {isSelected && (
                        <Ionicons name="checkmark" size={16} color="#101412" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Modal Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={isSaving}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, isSaving && styles.btnDisabled]}
              onPress={handleSave}
              disabled={isSaving}
              activeOpacity={0.7}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#101412" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={16} color="#101412" />
                  <Text style={styles.saveBtnText}>Save Profile</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
  modalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: {
    ...typography.titleMedium,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.danger,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xs,
    padding: spacing.sm,
    borderRadius: radii.sm,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.dangerText,
    flex: 1,
  },
  scrollArea: {
    paddingHorizontal: spacing.lg,
  },
  scrollContent: {
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  avatarPreviewSection: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  previewName: {
    ...typography.labelLarge,
    color: colors.textPrimary,
    fontSize: 16,
  },
  previewBio: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  textInput: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  bioInput: {
    minHeight: 52,
    textAlignVertical: 'top',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  colorCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.1 }],
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    backgroundColor: colors.surfaceSubtle,
  },
  cancelBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  cancelBtnText: {
    ...typography.labelMedium,
    color: colors.textSecondary,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accentPrimary,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  saveBtnText: {
    ...typography.labelLarge,
    color: '#101412',
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
