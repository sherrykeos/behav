import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radii } from '../../src/theme';
import { Button, MountainSunsetIllustration } from '../../src/components';

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      {/* Sunset Mountain Landscape Illustration matching Screen 12 */}
      <MountainSunsetIllustration height={340} />

      <SafeAreaView style={styles.contentWrap} edges={['bottom']}>
        {/* Editorial Serif Quote / Headline */}
        <View style={styles.textSection}>
          <Text style={styles.headline}>
            Small steps{'\n'}create big change.
          </Text>
          <Text style={styles.subheadline}>
            You're building a healthier,{'\n'}more intentional you.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          {/* Signature wide warm cream button */}
          <Button
            title="Keep Going"
            onPress={() => router.replace('/(tabs)')}
            variant="primary"
            size="lg"
            style={styles.primaryBtn}
          />

          <View style={styles.secondaryLinksRow}>
            <TouchableOpacity
              onPress={() => router.push('/(auth)/login')}
              style={styles.secondaryLink}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.secondaryLinkText}>Sign In</Text>
            </TouchableOpacity>

            <Text style={styles.dotSeparator}>•</Text>

            <TouchableOpacity
              onPress={() => router.push('/(auth)/register')}
              style={styles.secondaryLink}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.secondaryLinkText}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.base,
    justifyContent: 'space-between'
  },
  contentWrap: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg
  },
  textSection: {
    alignItems: 'center',
    marginTop: spacing.md
  },
  headline: {
    ...typography.displayHero,
    fontFamily: typography.serifFamily,
    color: colors.warm.cream,
    textAlign: 'center',
    fontSize: 34,
    lineHeight: 42,
    letterSpacing: -0.5,
    marginBottom: spacing.md
  },
  subheadline: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 280
  },
  actionSection: {
    width: '100%',
    paddingBottom: spacing.sm
  },
  primaryBtn: {
    width: '100%',
    marginBottom: spacing.md
  },
  secondaryLinksRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12
  },
  secondaryLink: {
    paddingVertical: 6
  },
  secondaryLinkText: {
    ...typography.captionBold,
    color: colors.text.muted,
    fontSize: 13
  },
  dotSeparator: {
    color: colors.text.muted,
    fontSize: 12
  }
});
