import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '@/theme';
import { Button } from '@/components/common/Button';

interface StepNameProps {
  initialName: string;
  onNext: (name: string) => void;
}

const MAX_NAME_LENGTH = 36;

export const StepName: React.FC<StepNameProps> = ({ initialName, onNext }) => {
  const [name, setName] = useState<string>(initialName || '');
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState<boolean>(false);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter a name or nickname to continue.');
      return;
    }
    setError(null);
    onNext(trimmed);
  };

  const handleChangeText = (text: string) => {
    setName(text);
    if (error) {
      setError(null);
    }
  };

  const trimmedLength = name.trim().length;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardContainer}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topSection}>
          {/* Friendly Icon Badge */}
          <View style={styles.badgeFrame}>
            <Ionicons name="sparkles" size={28} color={colors.brand.mint} />
          </View>

          <Text style={styles.headline}>First, what should we call you?</Text>

          <Text style={styles.supportingText}>
            Let's make this space yours. What name would you like us to use?
          </Text>

          {/* Name Input Field */}
          <View style={styles.inputContainer}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>Your preferred name</Text>
              <Text style={styles.charCounter}>
                {name.length}/{MAX_NAME_LENGTH}
              </Text>
            </View>

            <View
              style={[
                styles.inputWrapper,
                isFocused && styles.inputWrapperFocused,
                !!error && styles.inputWrapperError,
              ]}
            >
              <Ionicons
                name="person-outline"
                size={20}
                color={isFocused ? colors.brand.mint : colors.textTertiary}
                style={styles.inputIcon}
              />
              <TextInput
                value={name}
                onChangeText={handleChangeText}
                placeholder="Enter your name"
                placeholderTextColor={colors.textTertiary}
                maxLength={MAX_NAME_LENGTH}
                autoCorrect={false}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                style={styles.textInput}
                accessibilityLabel="Preferred Name Input"
              />
            </View>

            {error ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={14} color={colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : (
              <Text style={styles.helperText}>
                Use your first name, a nickname, or whatever feels right.
              </Text>
            )}
          </View>

          {/* Privacy Note */}
          <View style={styles.privacyCard}>
            <Ionicons name="lock-closed-outline" size={16} color={colors.brand.mint} />
            <Text style={styles.privacyText}>
              Stored exclusively on this device. No account, email, or cloud sync needed. You can change
              this anytime in your Profile.
            </Text>
          </View>
        </View>

        {/* CTA Button */}
        <View style={styles.footer}>
          <Button
            label="Continue"
            size="lg"
            variant="primary"
            onPress={handleSubmit}
            disabled={trimmedLength === 0}
            icon={<Ionicons name="arrow-forward" size={18} color={colors.brand.obsidian} />}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  topSection: {
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  badgeFrame: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: `${colors.brand.mint}15`,
    borderWidth: 1,
    borderColor: `${colors.brand.mint}40`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  headline: {
    ...typography.titleLarge,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
    letterSpacing: -0.3,
  },
  supportingText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
    marginBottom: spacing.xl,
  },
  inputContainer: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  inputLabel: {
    ...typography.labelMedium,
    color: colors.textSecondary,
  },
  charCounter: {
    ...typography.labelSmall,
    color: colors.textTertiary,
    fontSize: 11,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 56,
  },
  inputWrapperFocused: {
    borderColor: colors.brand.mint,
    backgroundColor: colors.surface,
  },
  inputWrapperError: {
    borderColor: colors.danger,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  textInput: {
    flex: 1,
    ...typography.bodyLarge,
    color: colors.textPrimary,
    paddingVertical: 0,
    fontSize: 16,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.danger,
    fontSize: 12,
  },
  helperText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
    fontSize: 12,
  },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
    width: '100%',
  },
  privacyText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 18,
    fontSize: 12,
  },
  footer: {
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
});
