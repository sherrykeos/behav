import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { colors, spacing, typography, radii } from '../../src/theme';
import { Button, Header } from '../../src/components';

export default function AuthErrorScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Header title="Authentication Status" onBack={() => router.back()} />

      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>⚠</Text>
        </View>

        <Text style={styles.title}>Session Notice</Text>
        <Text style={styles.description}>
          Your authentication token has either expired or the remote identity server is currently unreachable.
        </Text>

        <View style={styles.box}>
          <Text style={styles.boxTitle}>Offline Guarantee</Text>
          <Text style={styles.boxText}>
            Your local behavior records, daily reviews, and streak calculations are safely stored on this device.
            You can continue logging behaviors without an active internet connection.
          </Text>
        </View>

        <Button
          title="Continue Offline"
          onPress={() => router.replace('/(tabs)')}
          variant="primary"
          size="lg"
          style={styles.actionBtn}
        />

        <Button
          title="Sign In Again"
          onPress={() => router.push('/(auth)/login')}
          variant="secondary"
          size="md"
          style={styles.actionBtn}
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
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    alignItems: 'center'
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: radii.full,
    backgroundColor: colors.accents.amberFaint,
    borderColor: colors.accents.amber,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.base
  },
  icon: {
    fontSize: 28,
    color: colors.accents.amber
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.xs
  },
  description: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg
  },
  box: {
    backgroundColor: colors.background.surface,
    borderColor: colors.background.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.base,
    width: '100%',
    marginBottom: spacing.xl
  },
  boxTitle: {
    ...typography.bodyBold,
    color: colors.primary.light,
    marginBottom: 4
  },
  boxText: {
    ...typography.caption,
    color: colors.text.secondary,
    lineHeight: 18
  },
  actionBtn: {
    width: '100%',
    marginBottom: spacing.xs
  }
});
