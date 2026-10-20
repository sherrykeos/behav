import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl
} from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { colors, spacing, typography, radii } from '../../../src/theme';
import { Card, Header, EmptyState } from '../../../src/components';
import { useAuth } from '../../../src/context/AuthContext';
import { useDatabase } from '../../../src/context/DatabaseContext';
import { Behavior, BehaviorEntry } from '@behav/domain';

export default function EntryHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { behaviorRepo, entryRepo } = useDatabase();

  const [behavior, setBehavior] = useState<Behavior | null>(null);
  const [entries, setEntries] = useState<BehaviorEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadEntries = async () => {
    if (!user || !id) return;
    try {
      const b = await behaviorRepo.findById(id, user.id);
      setBehavior(b);

      const list = await entryRepo.listByBehaviorAndRange(user.id, id, '2000-01-01', '2100-01-01');
      setEntries(list);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadEntries();
    }, [user, id])
  );

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadEntries(); }} tintColor={colors.primary.base} />}
    >
      <Header
        title="Entry History"
        subtitle={behavior?.name || 'All recorded events'}
        onBack={() => router.back()}
        rightAction={{
          label: '+ Log',
          onPress: () => router.push(`/behavior/${id}/log`)
        }}
      />

      <View style={styles.content}>
        {entries.length === 0 ? (
          <EmptyState
            title="No Records Yet"
            description="All logged entries for this behavior will appear here in reverse chronological order."
            actionTitle="+ Log First Event"
            onAction={() => router.push(`/behavior/${id}/log`)}
          />
        ) : (
          entries.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => router.push(`/behavior/${id}/entry/${item.id}`)}
              activeOpacity={0.75}
            >
              <Card style={styles.entryCard}>
                <View style={styles.topRow}>
                  <Text style={styles.qtyText}>
                    +{item.quantity} {behavior?.unit || 'events'}
                  </Text>
                  <Text style={styles.dateText}>
                    {item.occurredAt.replace('T', ' ').substring(0, 16)}
                  </Text>
                </View>

                {item.contextTags.length > 0 ? (
                  <View style={styles.tagsRow}>
                    {item.contextTags.map((t, idx) => (
                      <View key={idx} style={styles.tagPill}>
                        <Text style={styles.tagPillText}>#{t}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {item.notes ? (
                  <Text style={styles.notesText}>{item.notes}</Text>
                ) : null}

                <View style={styles.editRow}>
                  <Text style={styles.editText}>Tap to edit or correct entry ›</Text>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}
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
  entryCard: {
    marginVertical: 4
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline'
  },
  qtyText: {
    ...typography.bodyBold,
    color: colors.primary.light,
    fontSize: 16
  },
  dateText: {
    ...typography.caption,
    color: colors.text.muted
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6
  },
  tagPill: {
    backgroundColor: colors.background.elevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.full
  },
  tagPillText: {
    fontSize: 11,
    color: colors.text.secondary
  },
  notesText: {
    ...typography.caption,
    color: colors.text.secondary,
    lineHeight: 18,
    marginTop: 6
  },
  editRow: {
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.background.borderSubtle,
    paddingTop: 4
  },
  editText: {
    fontSize: 11,
    color: colors.primary.base
  }
});
