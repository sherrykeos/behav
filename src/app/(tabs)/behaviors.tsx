import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper, Card, Button, Badge } from '@/components/common';
import { colors, radii, shadows, spacing, typography } from '@/theme';

export default function BehaviorsScreen() {
  const [noticeVisible, setNoticeVisible] = useState(false);

  return (
    <ScreenWrapper scrollable>
      <View style={styles.header}>
        <Text style={styles.title}>Behaviors</Text>
        <Text style={styles.subtitle}>
          Manage habits, quantities, and daily limits
        </Text>
      </View>

      <Card style={styles.contentCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.sectionTitle}>Active Behaviors</Text>
          <Badge label="Phase 3" variant="lavender" />
        </View>

        <View style={styles.emptyContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="list-outline" size={28} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No Behaviors Yet</Text>
          <Text style={styles.emptyDescription}>
            In Phase 2, SQLite database persistence will be set up. In Phase 3,
            you will be able to create, customize, edit, and archive behaviors
            with optional daily limits.
          </Text>
          <Button
            label="New Behavior"
            onPress={() => setNoticeVisible(true)}
            variant="primary"
            size="md"
            icon={<Ionicons name="add" size={18} color={colors.textInverse} />}
            style={styles.actionBtn}
          />
        </View>
      </Card>

      <Card variant="subtle">
        <Text style={styles.infoTitle}>Planned Capabilities</Text>
        <Text style={styles.infoText}>• Count or quantity measurement modes</Text>
        <Text style={styles.infoText}>• Optional daily targets and limits</Text>
        <Text style={styles.infoText}>• Safe archiving without losing past history</Text>
      </Card>

      <Modal
        visible={noticeVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNoticeVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setNoticeVisible(false)}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Behavior Management</Text>
            <Text style={styles.modalMessage}>
              Creating and editing behaviors will be fully operational in Phase 3
              once the SQLite persistence layer is established in Phase 2.
            </Text>
            <Button
              label="Close"
              onPress={() => setNoticeVisible(false)}
              variant="primary"
              size="md"
              style={{ width: '100%' }}
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
  title: {
    ...typography.titleLarge,
  },
  subtitle: {
    ...typography.bodyMedium,
    marginTop: spacing.xs,
  },
  contentCard: {
    marginBottom: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
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
    backgroundColor: colors.lavender,
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
  actionBtn: {
    marginTop: spacing.xs,
  },
  infoTitle: {
    ...typography.titleSmall,
    fontSize: 15,
    marginBottom: spacing.sm,
  },
  infoText: {
    ...typography.bodyMedium,
    fontSize: 13,
    marginBottom: spacing.xs,
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
});
