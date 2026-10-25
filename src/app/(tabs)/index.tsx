import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper, Card, Button, Badge } from '@/components/common';
import { colors, radii, shadows, spacing, typography } from '@/theme';

export default function HomeScreen() {
  const router = useRouter();
  const [quickLogNoticeVisible, setQuickLogNoticeVisible] = useState(false);

  // Real date calculation
  const today = new Date();
  const formattedDate = today.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const getGreeting = () => {
    const hour = today.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <ScreenWrapper scrollable>
      {/* Soft Ambient Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.dateText}>{formattedDate}</Text>
          </View>
          <Badge label="Offline" variant="sage" />
        </View>
      </View>

      {/* Primary Action: Quick Log */}
      <View style={styles.actionContainer}>
        <Button
          label="Quick Log"
          onPress={() => setQuickLogNoticeVisible(true)}
          variant="primary"
          size="lg"
          icon={<Ionicons name="add-circle-outline" size={20} color={colors.textInverse} />}
        />
        <Text style={styles.actionSubtext}>
          Record a behavior in just a few taps
        </Text>
      </View>

      {/* Today's Summary Card */}
      <Card style={styles.summaryCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Today's Behaviors</Text>
          <Badge label="0 tracked" variant="neutral" />
        </View>

        {/* Real Empty State */}
        <View style={styles.emptyContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="sparkles-outline" size={26} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Welcome to Behav</Text>
          <Text style={styles.emptyDescription}>
            Your personal, offline behavior tracker. Create your first habit or
            action to start recording daily progress.
          </Text>
          <Button
            label="Configure Behaviors"
            onPress={() => router.push('/behaviors')}
            variant="secondary"
            size="sm"
            style={styles.emptyButton}
          />
        </View>
      </Card>

      {/* How Behav Works Card */}
      <Card variant="subtle" style={styles.infoCard}>
        <Text style={styles.infoTitle}>Getting Started</Text>
        <View style={styles.stepRow}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>1</Text>
          </View>
          <Text style={styles.stepText}>
            Add behaviors with optional daily limits in the Behaviors tab.
          </Text>
        </View>
        <View style={styles.stepRow}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>2</Text>
          </View>
          <Text style={styles.stepText}>
            Log occurrences throughout the day with a single tap.
          </Text>
        </View>
        <View style={styles.stepRow}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>3</Text>
          </View>
          <Text style={styles.stepText}>
            Review honest trends, streaks, and history offline.
          </Text>
        </View>
      </Card>

      {/* Notice Modal for Quick Log (Phase 1 placeholder requirement) */}
      <Modal
        visible={quickLogNoticeVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setQuickLogNoticeVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setQuickLogNoticeVisible(false)}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalIcon}>
              <Ionicons name="information-circle-outline" size={32} color={colors.primary} />
            </View>
            <Text style={styles.modalTitle}>Quick Log</Text>
            <Text style={styles.modalMessage}>
              Quick logging requires behaviors and local SQLite storage.
              {'\n\n'}
              In Phase 2, the SQLite persistence layer will be created, and in
              Phase 3, full quick logging and behavior management will be active.
            </Text>
            <Button
              label="Understood"
              onPress={() => setQuickLogNoticeVisible(false)}
              variant="primary"
              size="md"
              style={styles.modalButton}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    ...typography.titleLarge,
    color: colors.textPrimary,
  },
  dateText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  actionContainer: {
    marginBottom: spacing.lg,
  },
  actionSubtext: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  summaryCard: {
    marginBottom: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typography.titleMedium,
    fontSize: 18,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: radii.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.titleSmall,
    marginBottom: spacing.xs,
  },
  emptyDescription: {
    ...typography.bodyMedium,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  emptyButton: {
    alignSelf: 'center',
  },
  infoCard: {
    marginBottom: spacing.xl,
  },
  infoTitle: {
    ...typography.titleSmall,
    fontSize: 15,
    marginBottom: spacing.md,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: radii.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  stepNumberText: {
    ...typography.labelSmall,
    fontSize: 11,
    color: colors.primary,
  },
  stepText: {
    ...typography.bodyMedium,
    flex: 1,
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(32, 30, 38, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.soft,
  },
  modalIcon: {
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.titleMedium,
    marginBottom: spacing.xs,
  },
  modalMessage: {
    ...typography.bodyMedium,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  modalButton: {
    width: '100%',
  },
});
