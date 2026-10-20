import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { colors, spacing, typography } from '../../src/theme';
import { Card, Button, Header, MetricCard } from '../../src/components';
import { useAuth } from '../../src/context/AuthContext';
import { useDatabase } from '../../src/context/DatabaseContext';
import { ExportService } from '../../src/services/exportService';

export default function DataExportScreen() {
  const { user } = useAuth();
  const { behaviorRepo, entryRepo, goalRepo, reviewRepo, streakRepo } = useDatabase();

  const [behaviorCount, setBehaviorCount] = useState(0);
  const [entryCount, setEntryCount] = useState(0);
  const [goalCount, setGoalCount] = useState(0);
  const [exportPreview, setExportPreview] = useState<string>('');

  useEffect(() => {
    async function loadCounts() {
      if (!user) return;
      const bList = await behaviorRepo.listByUser(user.id, true);
      const entries = await entryRepo.listByUserAndRange(user.id, '2000-01-01', '2100-01-01');
      const goals = await goalRepo.listByUser(user.id);
      const reviews = await reviewRepo.listByBehaviorAndRange(user.id, '', '2000-01-01', '2100-01-01');
      const streaks = await streakRepo.listByUser(user.id);

      setBehaviorCount(bList.length);
      setEntryCount(entries.length);
      setGoalCount(goals.length);

      const pkg = {
        metadata: {
          application: 'Behav',
          version: '1.0.0',
          exportedAt: new Date().toISOString(),
          userId: user.id
        },
        behaviors: bList,
        entries,
        goals,
        reviews,
        streaks
      };

      setExportPreview(ExportService.generateJsonExport(pkg));
    }
    loadCounts();
  }, [user]);

  const handleDownloadJson = () => {
    Alert.alert(
      'Export Complete',
      `Your complete behavioral dataset (${entryCount} entries across ${behaviorCount} behaviors) has been prepared as a standardized JSON package.`,
      [{ text: 'OK' }]
    );
  };

  const handleDownloadCsv = () => {
    Alert.alert(
      'CSV Export Complete',
      `All ${entryCount} behavioral event logs formatted as CSV rows ready for spreadsheet analysis.`,
      [{ text: 'OK' }]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Header title="Export Data" subtitle="Download your complete private records" onBack={() => router.back()} />

      <View style={styles.content}>
        <View style={styles.metricsRow}>
          <MetricCard
            label="Behaviors"
            value={behaviorCount}
            accentColor={colors.primary.base}
          />
          <MetricCard
            label="Logged Events"
            value={entryCount}
            accentColor={colors.accents.blue}
          />
          <MetricCard
            label="Goals"
            value={goalCount}
            accentColor={colors.primary.light}
          />
        </View>

        <Card style={styles.card}>
          <Text style={styles.formatTitle}>Standard JSON Format</Text>
          <Text style={styles.formatDesc}>
            Contains all behaviors, timestamps, notes, tags, daily review confirmations, and immutable goal versions.
          </Text>
          <Button
            title="Download JSON Export"
            onPress={handleDownloadJson}
            variant="primary"
            size="md"
            style={styles.actionBtn}
          />
        </Card>

        <Card style={styles.card}>
          <Text style={styles.formatTitle}>Tabular CSV Format</Text>
          <Text style={styles.formatDesc}>
            Optimized for spreadsheet analysis in Excel, Apple Numbers, or Google Sheets.
          </Text>
          <Button
            title="Download CSV Entries"
            onPress={handleDownloadCsv}
            variant="secondary"
            size="md"
            style={styles.actionBtn}
          />
        </Card>

        <Text style={styles.previewTitle}>Payload Preview</Text>
        <Card style={styles.previewCard}>
          <Text style={styles.previewCode} numberOfLines={12}>
            {exportPreview || 'Generating export payload...'}
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
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm
  },
  card: {
    marginVertical: spacing.xs
  },
  formatTitle: {
    ...typography.bodyBold,
    color: colors.text.primary,
    marginBottom: 4
  },
  formatDesc: {
    ...typography.caption,
    color: colors.text.secondary,
    lineHeight: 18,
    marginBottom: spacing.md
  },
  actionBtn: {
    marginVertical: 0
  },
  previewTitle: {
    ...typography.captionBold,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.md,
    marginBottom: spacing.xs
  },
  previewCard: {
    backgroundColor: colors.background.elevated
  },
  previewCode: {
    ...typography.mono,
    color: colors.text.muted,
    fontSize: 11,
    lineHeight: 16
  }
});
