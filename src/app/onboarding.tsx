import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  BackHandler,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '@/theme';
import { useBehaviors } from '@/context/BehaviorContext';
import {
  OnboardingProgress,
  StepWelcome,
  StepPhilosophy,
  StepName,
  StepReady,
} from '@/components/onboarding';

const TOTAL_STEPS = 4;

export default function OnboardingScreen() {
  const router = useRouter();
  const {
    userProfile,
    onboardingStep: savedStep,
    saveOnboardingProgress,
    completeOnboarding,
  } = useBehaviors();

  const [currentStep, setCurrentStep] = useState<number>(savedStep >= 1 && savedStep <= 4 ? savedStep : 1);
  const [preferredName, setPreferredName] = useState<string>(
    userProfile.name && userProfile.name !== 'Sherry' ? userProfile.name : ''
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sync state if initial saved step loads later
  useEffect(() => {
    if (savedStep && savedStep >= 1 && savedStep <= 4) {
      setCurrentStep((prev) => (prev === 1 && savedStep > 1 ? savedStep : prev));
    }
  }, [savedStep]);

  // Handle Android hardware back button
  useEffect(() => {
    const onHardwareBack = () => {
      if (currentStep > 1) {
        handleBack();
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => subscription.remove();
  }, [currentStep, preferredName]);

  const goToStep = useCallback(
    (step: number, nameToSave?: string) => {
      setCurrentStep(step);
      saveOnboardingProgress(step, nameToSave ?? preferredName).catch(() => {});
    },
    [saveOnboardingProgress, preferredName]
  );

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      goToStep(currentStep - 1);
    }
  }, [currentStep, goToStep]);

  const handleSkip = useCallback(() => {
    // Skip intro steps directly to name entry (Step 3) since preferred name is required
    goToStep(3);
  }, [goToStep]);

  const handleStep1Next = useCallback(() => {
    goToStep(2);
  }, [goToStep]);

  const handleStep2Next = useCallback(() => {
    goToStep(3);
  }, [goToStep]);

  const handleStep3Next = useCallback(
    (enteredName: string) => {
      setPreferredName(enteredName);
      goToStep(4, enteredName);
    },
    [goToStep]
  );

  const handleEnterBehav = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const finalName = preferredName.trim() || userProfile.name || 'Friend';
      await completeOnboarding(finalName);
      router.replace('/(tabs)');
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
      setIsSubmitting(false);
    }
  }, [isSubmitting, preferredName, userProfile.name, completeOnboarding, router]);

  // Only show skip on introductory steps (1 & 2)
  const canSkip = currentStep === 1 || currentStep === 2;
  const canGoBack = currentStep > 1;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      {/* Top Navigation Bar: Back Button, Progress Indicators, Skip Button */}
      <View style={styles.navBar}>
        <View style={styles.navSlotLeft}>
          {canGoBack ? (
            <Pressable
              onPress={handleBack}
              style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}
              accessibilityLabel="Go back to previous step"
              accessibilityRole="button"
            >
              <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
              <Text style={styles.navText}>Back</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.navSlotCenter}>
          <OnboardingProgress totalSteps={TOTAL_STEPS} currentStep={currentStep} />
        </View>

        <View style={styles.navSlotRight}>
          {canSkip ? (
            <Pressable
              onPress={handleSkip}
              style={({ pressed }) => [styles.skipButton, pressed && styles.buttonPressed]}
              accessibilityLabel="Skip intro to name setup"
              accessibilityRole="button"
            >
              <Text style={styles.navText}>Skip</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Step Content Container */}
      <View style={styles.content}>
        {currentStep === 1 && <StepWelcome onNext={handleStep1Next} />}
        {currentStep === 2 && <StepPhilosophy onNext={handleStep2Next} />}
        {currentStep === 3 && (
          <StepName initialName={preferredName} onNext={handleStep3Next} />
        )}
        {currentStep === 4 && (
          <StepReady
            name={preferredName || userProfile.name || 'Friend'}
            onEnter={handleEnterBehav}
            loading={isSubmitting}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    height: 48,
  },
  navSlotLeft: {
    width: 72,
    alignItems: 'flex-start',
  },
  navSlotCenter: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
  navSlotRight: {
    width: 72,
    alignItems: 'flex-end',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 6,
    paddingRight: 8,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 6,
    paddingLeft: 8,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  navText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    fontSize: 14,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
});
