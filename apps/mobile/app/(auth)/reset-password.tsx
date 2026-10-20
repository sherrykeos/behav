import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { colors, spacing, typography } from '../../src/theme';
import { Button, Input, Header } from '../../src/components';
import { PasswordResetConfirmSchema } from '@behav/domain';

export default function ResetPasswordScreen() {
  const [step, setStep] = useState<'request' | 'confirm'>('request');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequest = () => {
    if (!email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep('confirm');
      Alert.alert('Instructions Dispatched', 'If registered, a reset code was sent to your email.');
    }, 600);
  };

  const handleConfirm = () => {
    const parse = PasswordResetConfirmSchema.safeParse({ token, newPassword });
    if (!parse.success) {
      Alert.alert('Validation Error', parse.error.issues[0].message);
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert('Password Updated', 'Your password was reset successfully. Please log in with your new credentials.', [
        { text: 'Sign In', onPress: () => router.replace('/(auth)/login') }
      ]);
    }, 600);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Header title="Reset Password" subtitle="Recover access to your records" onBack={() => router.back()} />

      <View style={styles.form}>
        {step === 'request' ? (
          <>
            <Text style={styles.instructions}>
              Enter your account email. If it exists in our system, we'll send you a password reset code.
            </Text>
            <Input
              label="Account Email"
              placeholder="alex@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Button
              title="Send Reset Code"
              onPress={handleRequest}
              loading={loading}
              variant="primary"
              size="lg"
              style={styles.btn}
            />
          </>
        ) : (
          <>
            <Text style={styles.instructions}>
              Enter the reset code sent to your email and your new password.
            </Text>
            <Input
              label="Reset Code"
              placeholder="e.g. 123456"
              value={token}
              onChangeText={setToken}
              keyboardType="number-pad"
            />
            <Input
              label="New Password"
              placeholder="Min 8 chars, 1 uppercase, 1 number"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
            <Button
              title="Save New Password"
              onPress={handleConfirm}
              loading={loading}
              variant="primary"
              size="lg"
              style={styles.btn}
            />
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.background.base,
    paddingBottom: spacing.xxl
  },
  form: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.base
  },
  instructions: {
    ...typography.body,
    color: colors.text.secondary,
    lineHeight: 22,
    marginBottom: spacing.lg
  },
  btn: {
    marginTop: spacing.base
  }
});
