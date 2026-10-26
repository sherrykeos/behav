import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper, Card, Button, Badge } from '@/components/common';
import { BehaviorModal } from '@/components/behaviors/BehaviorModal';
import { useBehaviors } from '@/context/BehaviorContext';
import { colors, radii, shadows, spacing, typography } from '@/theme';
import { type Behavior } from '@/types/database';

export default function BehaviorsScreen() {
  const {
    behaviors,
    archivedBehaviors,
    createBehavior,
    updateBehavior,
    archiveBehavior,
    unarchiveBehavior,
    deleteBehavior,
  } = useBehaviors();

  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBehavior, setEditingBehavior] = useState<Behavior | null>(null);

  const handleOpenCreate = () => {
    setEditingBehavior(null);
    setModalVisible(true);
  };

  const handleOpenEdit = (behavior: Behavior) => {
    setEditingBehavior(behavior);
    setModalVisible(true);
  };

  const handleArchive = (behavior: Behavior) => {
    Alert.alert(
      'Archive Behavior',
      `Archive "${behavior.name}"?\n\nIt will be hidden from daily tracking, but all past records will remain safe in your history.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          onPress: async () => {
            try {
              await archiveBehavior(behavior.id);
            } catch (err) {
              console.error('Failed to archive behavior:', err);
            }
          },
        },
      ]
    );
  };

  const handleUnarchive = async (behavior: Behavior) => {
    try {
      await unarchiveBehavior(behavior.id);
    } catch (err) {
      console.error('Failed to unarchive behavior:', err);
    }
  };

  const handleDelete = (behavior: Behavior) => {
    Alert.alert(
      'Delete Behavior Permanently',
      `Are you sure you want to delete "${behavior.name}"?\n\nCAUTION: This will permanently delete the behavior and ALL its past logged records. This cannot be undone.\n\nTip: If you only want to stop tracking it, choose Archive instead.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBehavior(behavior.id);
            } catch (err) {
              console.error('Failed to delete behavior:', err);
            }
          },
        },
      ]
    );
  };

  const displayedList = activeTab === 'active' ? behaviors : archivedBehaviors;

  return (
    <ScreenWrapper scrollable>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Behaviors</Text>
            <Text style={styles.subtitle}>
              Manage habits, units, and optional daily targets
            </Text>
          </View>
          <Button
            label="New"
            onPress={handleOpenCreate}
            variant="primary"
            size="sm"
            icon={<Ionicons name="add" size={16} color={colors.textInverse} />}
          />
        </View>
      </View>

      {/* Segmented Tab: Active vs Archived */}
      <View style={styles.tabBar}>
        <Pressable
          onPress={() => setActiveTab('active')}
          style={[styles.tabButton, activeTab === 'active' && styles.tabButtonActive]}
        >
          <Text
            style={[styles.tabButtonText, activeTab === 'active' && styles.tabButtonTextActive]}
          >
            Active ({behaviors.length})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('archived')}
          style={[styles.tabButton, activeTab === 'archived' && styles.tabButtonActive]}
        >
          <Text
            style={[styles.tabButtonText, activeTab === 'archived' && styles.tabButtonTextActive]}
          >
            Archived ({archivedBehaviors.length})
          </Text>
        </Pressable>
      </View>

      {/* List */}
      {displayedList.length === 0 ? (
        <Card style={styles.emptyCard}>
          <View style={styles.emptyContainer}>
            <View style={styles.iconCircle}>
              <Ionicons
                name={activeTab === 'active' ? 'list-outline' : 'archive-outline'}
                size={26}
                color={colors.textPrimary}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {activeTab === 'active' ? 'No Active Behaviors' : 'No Archived Behaviors'}
            </Text>
            <Text style={styles.emptyDescription}>
              {activeTab === 'active'
                ? 'Create a behavior like "Water", "Mindful Breathing", or "Reading" to start tracking.'
                : 'Archived behaviors will appear here. Archiving stops daily logging while preserving past records.'}
            </Text>
            {activeTab === 'active' && (
              <Button
                label="Create New Behavior"
                onPress={handleOpenCreate}
                variant="secondary"
                size="sm"
                icon={<Ionicons name="add" size={16} color={colors.textPrimary} />}
                style={styles.emptyButton}
              />
            )}
          </View>
        </Card>
      ) : (
        displayedList.map((behavior) => (
          <Card key={behavior.id} style={styles.behaviorCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Text style={styles.behaviorName}>{behavior.name}</Text>
                <View style={styles.tagsRow}>
                  {behavior.category && (
                    <Badge label={behavior.category} variant="lavender" />
                  )}
                  <Badge label={`Unit: ${behavior.unit}`} variant="neutral" />
                  {behavior.dailyLimit !== null && (
                    <Badge
                      label={`Limit: ${behavior.dailyLimit} ${behavior.unit}`}
                      variant="peach"
                    />
                  )}
                </View>
              </View>
            </View>

            {behavior.description ? (
              <Text style={styles.descriptionText}>{behavior.description}</Text>
            ) : null}

            {/* Action Buttons */}
            <View style={styles.cardActions}>
              {activeTab === 'active' ? (
                <>
                  <Button
                    label="Edit"
                    onPress={() => handleOpenEdit(behavior)}
                    variant="secondary"
                    size="sm"
                    icon={<Ionicons name="create-outline" size={14} color={colors.textPrimary} />}
                  />
                  <Button
                    label="Archive"
                    onPress={() => handleArchive(behavior)}
                    variant="secondary"
                    size="sm"
                    icon={<Ionicons name="archive-outline" size={14} color={colors.textPrimary} />}
                  />
                  <Button
                    label="Delete"
                    onPress={() => handleDelete(behavior)}
                    variant="ghost"
                    size="sm"
                    textStyle={{ color: colors.danger }}
                    icon={<Ionicons name="trash-outline" size={14} color={colors.danger} />}
                  />
                </>
              ) : (
                <>
                  <Button
                    label="Restore"
                    onPress={() => handleUnarchive(behavior)}
                    variant="secondary"
                    size="sm"
                    icon={<Ionicons name="refresh-outline" size={14} color={colors.textPrimary} />}
                  />
                  <Button
                    label="Delete Permanently"
                    onPress={() => handleDelete(behavior)}
                    variant="ghost"
                    size="sm"
                    textStyle={{ color: colors.danger }}
                    icon={<Ionicons name="trash-outline" size={14} color={colors.danger} />}
                  />
                </>
              )}
            </View>
          </Card>
        ))
      )}

      {/* Create / Edit Modal */}
      <BehaviorModal
        visible={modalVisible}
        behaviorToEdit={editingBehavior}
        onClose={() => setModalVisible(false)}
        onSave={async (data) => {
          if (editingBehavior) {
            await updateBehavior(editingBehavior.id, data);
          } else {
            await createBehavior(data);
          }
        }}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    ...typography.titleLarge,
  },
  subtitle: {
    ...typography.bodyMedium,
    marginTop: spacing.xs,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.full,
    padding: 3,
    marginBottom: spacing.md,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radii.full,
  },
  tabButtonActive: {
    backgroundColor: colors.surface,
    ...shadows.soft,
  },
  tabButtonText: {
    ...typography.labelLarge,
    fontSize: 13,
    color: colors.textSecondary,
  },
  tabButtonTextActive: {
    color: colors.textPrimary,
  },
  emptyCard: {
    marginBottom: spacing.lg,
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
    backgroundColor: colors.accentPrimarySubtle,
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
  behaviorCard: {
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardHeaderLeft: {
    flex: 1,
  },
  behaviorName: {
    ...typography.titleMedium,
    fontSize: 17,
    marginBottom: spacing.xs,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
    marginTop: 2,
  },
  descriptionText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
});
