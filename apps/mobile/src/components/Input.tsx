import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { colors, radii, spacing, typography } from '../theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  style,
  ...props
}) => {
  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.text.muted}
        selectionColor={colors.primary.base}
        style={[
          styles.input,
          error ? styles.inputError : null,
          style
        ]}
        {...props}
      />
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 6
  },
  label: {
    ...typography.caption,
    color: colors.text.muted,
    marginBottom: 6,
    letterSpacing: 0.2
  },
  input: {
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderWidth: 1,
    borderRadius: radii.sm + 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
    color: colors.text.primary,
    ...typography.body
  },
  inputError: {
    borderColor: colors.accents.coral
  },
  errorText: {
    ...typography.caption,
    color: colors.accents.coral,
    marginTop: 4
  },
  helperText: {
    ...typography.caption,
    color: colors.text.muted,
    marginTop: 4
  }
});
