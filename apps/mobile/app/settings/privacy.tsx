import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { colors, spacing, typography, radii } from '../../src/theme';
import { Card, Header, Button } from '../../src/components';

export default function PrivacySettingsScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Header title="Privacy & Data Isolation" subtitle="User-owned behavioral architecture" onBack={() => router.back()} />

      <View style={styles.content}>
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>🔒 Strict Per-User Data Isolation</Text>
          <Text style={styles.cardText}>
            All behaviors, entries, daily confirmations, and streaks are partitioned in SQLite by your unique account identifier.
            Switching accounts or signing out completely isolates cached data, preventing cross-account exposure.
          </Text>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>◈ Zero Third-Party Trackers</Text>
          <Text style={styles.cardText}>
            Behav contains no analytics pixels, advertising SDKs, or behavioral data brokers.
            Your entries never leave your device unless you explicitly trigger remote synchronization.
          </Text>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>❖ Offline-First Sovereign Tracking</Text>
          <Text style={styles.cardText}>
            All streak evaluations, statistical calculations, moving averages, and pattern engines run locally on your device.
            You can use Behav seamlessly indefinitely without network access.
          </Text>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>📥 Complete Data Portability</Text>
          <Text style={styles.cardText}>
            You have the right to export your complete behavioral records at any time in standardized JSON and CSV formats.
          </Text>
          <Button
            title="Export Records Now"
            onPress={() => router.push('/settings/export')}
            variant="outline"
            size="sm"
            style={styles.exportBtn}
          />
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
  card: {
    marginVertical: spacing.xs
  },
  cardTitle: {
    ...typography.bodyBold,
    color: colors.primary.light,
    marginBottom: 6
  },
  cardText: {
    ...typography.caption,
    color: colors.text.secondary,
    lineHeight: 20
  },
  exportBtn: {
    marginTop: spacing.md
  }
});
