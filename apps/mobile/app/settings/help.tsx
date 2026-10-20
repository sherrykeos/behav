import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { colors, spacing, typography, radii } from '../../src/theme';
import { Card, Header } from '../../src/components';

export default function HelpAndAboutScreen() {
  const faqs = [
    {
      q: 'Why do unconfirmed days remain pending?',
      a: 'Unlike conventional habit trackers that assume an absence of logs means zero activity, Behav requires your explicit daily review. This ensures streaks represent verified reality rather than forgotten logs.'
    },
    {
      q: 'What are independent goal streaks?',
      a: 'You can set multiple goals for a single behavior (e.g. abstinence from smoking vs a reduction target). A lapse in one goal does not reset another. Each streak is independently calculated.'
    },
    {
      q: 'How does Behav treat broken streaks?',
      a: 'Behav never uses shame or manipulative gamification. A lapse is simply a measured observation. Your cumulative progress, total smoke-free days, or reduced intake records remain intact.'
    },
    {
      q: 'Can Behav work completely offline?',
      a: 'Yes. Behav operates as an offline-first mobile application. All database transactions, streak recalculations, and statistical insights execute locally on your device.'
    }
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Header title="Help & About" subtitle="The Behav engineering philosophy" onBack={() => router.back()} />

      <View style={styles.content}>
        <View style={styles.brandHero}>
          <Text style={styles.brandName}>Behav</Text>
          <Text style={styles.versionText}>Version 1.0.0 • Production Build</Text>
          <Text style={styles.tagline}>Measure. Understand. Change.</Text>
        </View>

        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        {faqs.map((faq, idx) => (
          <Card key={idx} style={styles.faqCard}>
            <Text style={styles.faqQuestion}>{faq.q}</Text>
            <Text style={styles.faqAnswer}>{faq.a}</Text>
          </Card>
        ))}

        <Card style={styles.architectCard}>
          <Text style={styles.architectTitle}>Architectural Principles</Text>
          <Text style={styles.architectText}>
            Built with React Native, Expo Router, TypeScript strict mode, Fastify, and SQLite.
            All core domain rules are isolated in pure TypeScript engines completely independent of UI or database drivers.
          </Text>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.background.base
  },
  content: {
    paddingTop: spacing.xs
  },
  brandHero: {
    alignItems: 'center',
    marginVertical: spacing.lg
  },
  brandName: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.primary.light,
    letterSpacing: -1
  },
  versionText: {
    ...typography.caption,
    color: colors.text.muted,
    marginTop: 2
  },
  tagline: {
    ...typography.bodyBold,
    color: colors.primary.base,
    marginTop: spacing.xs
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.xs
  },
  faqCard: {
    marginVertical: 4
  },
  faqQuestion: {
    ...typography.bodyBold,
    color: colors.text.primary,
    marginBottom: 4
  },
  faqAnswer: {
    ...typography.caption,
    color: colors.text.secondary,
    lineHeight: 18
  },
  architectCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.background.elevated
  },
  architectTitle: {
    ...typography.bodyBold,
    color: colors.primary.light,
    marginBottom: 4
  },
  architectText: {
    ...typography.caption,
    color: colors.text.muted,
    lineHeight: 18
  }
});
