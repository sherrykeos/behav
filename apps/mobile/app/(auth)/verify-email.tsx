import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { colors, spacing, typography } from '../../src/theme';
import { Button, Input, Header } from '../../src/components';

export default function VerifyEmailScreen() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = () => {
    if (code.length < 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit verification code.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert('Email Verified', 'Your account is verified. You now have full cloud backup access.', [
        { text: 'Go to Dashboard', onPress: () => router.replace('/(tabs)') }
      ]);
    }, 600);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Header title="Verify Email" subtitle="Confirm your account ownership" onBack={() => router.back()} />

      <View style={styles.form}>
        <Text style={styles.instructions}>
          We sent a 6-digit verification code to your registered email address. Enter it below to verify your account.
        </Text>

        <Input
          label="Verification Code"
          placeholder="e.g. 123456"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={6}
          style={styles.codeInput}
        />

        <Button
          title="Verify Account"
          onPress={handleVerify}
          loading={loading}
          variant="primary"
          size="lg"
          style={styles.submitBtn}
        />

        <Button
          title="Resend Code"
          onPress={() => Alert.alert('Code Dispatched', 'A new verification code was sent to your email.')}
          variant="secondary"
          size="md"
          style={styles.resendBtn}
        />
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
  codeInput: {
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center'
  },
  submitBtn: {
    marginTop: spacing.base
  },
  resendBtn: {
    marginTop: spacing.sm
  }
});
