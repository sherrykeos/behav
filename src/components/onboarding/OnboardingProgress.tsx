import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radii, spacing } from '@/theme';

interface OnboardingProgressProps {
  totalSteps: number;
  currentStep: number;
}

export const OnboardingProgress: React.FC<OnboardingProgressProps> = ({
  totalSteps,
  currentStep,
}) => {
  return (
    <View style={styles.container} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: totalSteps, now: currentStep }}>
      {Array.from({ length: totalSteps }, (_, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === currentStep;
        const isCompleted = stepNum < currentStep;

        return (
          <View
            key={stepNum}
            style={[
              styles.segment,
              isActive && styles.segmentActive,
              isCompleted && styles.segmentCompleted,
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: 4,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceHover,
  },
  segmentActive: {
    backgroundColor: colors.brand.mint,
  },
  segmentCompleted: {
    backgroundColor: `${colors.brand.mint}80`,
  },
});
