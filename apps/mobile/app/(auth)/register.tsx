import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { colors, spacing, typography } from '../../src/theme';
import { Button, Input, Header } from '../../src/components';
import { RegisterInputSchema } from '@behav/domain';
import { useAuth } from '../../src/context/AuthContext';

export default function RegisterScreen() {
  const { register } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleRegister = async () => {
    setErrors({});
    if (password !== confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }

    const parse = RegisterInputSchema.safeParse({ email, password, displayName });
    if (!parse.success) {
      const issueMap: Record<string, string> = {};
      parse.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          issueMap[String(issue.path[0])] = issue.message;
        }
      });
      setErrors(issueMap);
      return;
    }

    setLoading(true);
    try {
      const ok = await register(email, password, displayName);
      if (ok) {
        Alert.alert(
          'Account Created',
          'Welcome to Behav! Your local workspace has been initialized.',
          [{ text: 'Continue', onPress: () => router.replace('/(tabs)') }]
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      Alert.alert('Registration Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Header title="Create Account" subtitle="Step into supportive behavioral tracking" onBack={() => router.back()} />

      <View style={styles.form}>
        <Input
          label="Display Name"
          placeholder="e.g. Alex"
          value={displayName}
          onChangeText={setDisplayName}
          error={errors.displayName}
          autoCapitalize="words"
        />

        <Input
          label="Email Address"
          placeholder="alex@example.com"
          value={email}
          onChangeText={setEmail}
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Input
          label="Password"
          placeholder="Min 8 characters, 1 uppercase, 1 number"
          value={password}
          onChangeText={setPassword}
          error={errors.password}
          secureTextEntry
        />

        <Input
          label="Confirm Password"
          placeholder="Re-enter password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          error={errors.confirmPassword}
          secureTextEntry
        />

        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>
            🔒 Your data is private, user-owned, and never shared with advertisers or third-party brokers.
          </Text>
        </View>

        <Button
          title="Register & Initialize Workspace"
          onPress={handleRegister}
          loading={loading}
          variant="primary"
          size="lg"
          style={styles.submitBtn}
        />

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.linkText}>Sign In</Text>
          </TouchableOpacity>
        </View>
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
  noticeBox: {
    backgroundColor: colors.background.surface,
    borderColor: colors.background.border,
    borderWidth: 1,
    padding: spacing.md,
    borderRadius: 8,
    marginVertical: spacing.md
  },
  noticeText: {
    ...typography.caption,
    color: colors.text.secondary,
    lineHeight: 18
  },
  submitBtn: {
    marginTop: spacing.sm
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl
  },
  footerText: {
    ...typography.body,
    color: colors.text.muted
  },
  linkText: {
    ...typography.bodyBold,
    color: colors.primary.base
  }
});
