import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { colors, spacing, typography } from '../../src/theme';
import { Button, Input, Header } from '../../src/components';
import { LoginInputSchema } from '@behav/domain';
import { useAuth } from '../../src/context/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleLogin = async () => {
    setErrors({});
    const parse = LoginInputSchema.safeParse({ email, password });
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
      const ok = await login(email, password);
      if (ok) {
        router.replace('/(tabs)');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials. Please verify your details.';
      Alert.alert('Sign In Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Header title="Welcome Back" subtitle="Access your private behavior records" onBack={() => router.back()} />

      <View style={styles.form}>
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
          placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
          error={errors.password}
          secureTextEntry
        />

        <View style={styles.forgotRow}>
          <TouchableOpacity onPress={() => router.push('/(auth)/reset-password')}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>
        </View>

        <Button
          title="Sign In"
          onPress={handleLogin}
          loading={loading}
          variant="primary"
          size="lg"
          style={styles.submitBtn}
        />

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.linkText}>Create Account</Text>
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
  forgotRow: {
    alignItems: 'flex-end',
    marginBottom: spacing.md
  },
  forgotText: {
    ...typography.captionBold,
    color: colors.primary.base
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
