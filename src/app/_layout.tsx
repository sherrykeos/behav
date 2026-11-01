import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { colors, radii, spacing, typography } from '@/theme';
import { DATABASE_NAME, initializeDatabase } from '@/db';
import { BehaviorProvider, useBehaviors } from '@/context/BehaviorContext';
import { Button } from '@/components/common/Button';

// Keep the native Android launch screen visible until app initialization completes
SplashScreen.preventAutoHideAsync().catch(() => {});

function AppNavigator() {
  const { isLoading, isOnboardingCompleted } = useBehaviors();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isOnboardingCompleted !== null) {
      const inOnboarding = segments[0] === 'onboarding';

      if (!isOnboardingCompleted && !inOnboarding) {
        router.replace('/onboarding');
      }

      // Transition smoothly from the native launch screen without white flash
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isLoading, isOnboardingCompleted, segments, router]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [initError, setInitError] = useState<Error | null>(null);
  const [retryKey, setRetryKey] = useState<number>(0);

  // If initialization fails, dismiss the native splash screen so the user sees the error & recovery options
  useEffect(() => {
    if (initError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [initError]);

  const handleRetry = () => {
    setInitError(null);
    setRetryKey((prev) => prev + 1);
  };

  if (initError) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <View style={styles.errorContainer}>
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Storage Initialization Error</Text>
            <Text style={styles.errorMessage}>
              Behav could not open or initialize local SQLite storage:
              {'\n\n'}
              {initError.message}
            </Text>
            <View style={styles.retryButtonWrapper}>
              <Button
                label="Retry Initialization"
                variant="primary"
                onPress={handleRetry}
              />
            </View>
          </View>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SQLiteProvider
        key={retryKey}
        databaseName={DATABASE_NAME}
        onInit={initializeDatabase}
        onError={setInitError}
      >
        <BehaviorProvider>
          <AppNavigator />
        </BehaviorProvider>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
  },
  errorTitle: {
    ...typography.titleMedium,
    color: colors.danger,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  errorMessage: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  retryButtonWrapper: {
    width: '100%',
  },
});

