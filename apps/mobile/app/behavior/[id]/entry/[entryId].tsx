import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { colors, spacing, typography } from '../../../../src/theme';
import { Button, Input, Header, TagChip } from '../../../../src/components';
import { useAuth } from '../../../../src/context/AuthContext';
import { useDatabase } from '../../../../src/context/DatabaseContext';
import { BehaviorEntry } from '@behav/domain';

const DEFAULT_TAGS = ['stress', 'social', 'evening', 'routine', 'craving', 'work', 'weekend'];

export default function EditEntryScreen() {
  const { id: behaviorId, entryId } = useLocalSearchParams<{ id: string; entryId: string }>();
  const { user } = useAuth();
  const { entryRepo, recalculateBehavior } = useDatabase();

  const [entry, setEntry] = useState<BehaviorEntry | null>(null);
  const [quantity, setQuantity] = useState<string>('1');
  const [notes, setNotes] = useState<string>('');
  const [contextTags, setContextTags] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    async function load() {
      if (!user || !entryId) return;
      const e = await entryRepo.findById(entryId, user.id);
      if (e) {
        setEntry(e);
        setQuantity(String(e.quantity));
        setNotes(e.notes || '');
        setContextTags(e.contextTags || []);
      }
    }
    load();
  }, [user, entryId]);

  const toggleTag = (tag: string) => {
    if (contextTags.includes(tag)) {
      setContextTags(contextTags.filter((t) => t !== tag));
    } else {
      setContextTags([...contextTags, tag]);
    }
  };

  const handleUpdate = async () => {
    if (!user || !entryId || !behaviorId) return;
    const numQty = parseFloat(quantity);
    if (isNaN(numQty) || numQty <= 0) {
      Alert.alert('Validation Error', 'Quantity must be a positive number.');
      return;
    }

    setLoading(true);
    try {
      await entryRepo.update(entryId, user.id, {
        quantity: numQty,
        notes: notes.trim() || null,
        contextTags
      });

      // Historical recalculation
      await recalculateBehavior(behaviorId);

      Alert.alert('Updated', 'Entry corrected and dependent calculations updated.', [
        { text: 'Done', onPress: () => router.back() }
      ]);
    } catch {
      Alert.alert('Error', 'Could not update entry.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!user || !entryId || !behaviorId) return;
    Alert.alert(
      'Remove Entry',
      'Are you sure you want to delete this recorded event? Dependent streaks and aggregates will be recalculated.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await entryRepo.softDelete(entryId, user.id);
            await recalculateBehavior(behaviorId);
            router.back();
          }
        }
      ]
    );
  };

  if (!entry) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading entry...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Header
        title="Edit Entry"
        subtitle={entry.occurredAt.replace('T', ' ').substring(0, 16)}
        onBack={() => router.back()}
      />

      <View style={styles.content}>
        <Input
          label="Quantity"
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="numeric"
        />

        <Text style={styles.sectionLabel}>Contextual Tags</Text>
        <View style={styles.tagsContainer}>
          {DEFAULT_TAGS.map((tag) => (
            <TagChip
              key={tag}
              label={tag}
              selected={contextTags.includes(tag)}
              onPress={() => toggleTag(tag)}
            />
          ))}
        </View>

        <Input
          label="Notes"
          placeholder="Personal context, triggers, or surroundings"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />

        <Button
          title="Save Corrections"
          onPress={handleUpdate}
          loading={loading}
          variant="primary"
          size="lg"
          style={styles.saveBtn}
        />

        <Button
          title="Delete Entry"
          onPress={handleDelete}
          variant="danger"
          size="md"
          style={styles.deleteBtn}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.background.base,
    paddingBottom: spacing.xxl
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.base
  },
  loadingText: {
    color: colors.text.muted
  },
  content: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xs
  },
  sectionLabel: {
    ...typography.captionBold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.md,
    marginBottom: spacing.xs
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md
  },
  saveBtn: {
    marginTop: spacing.xl
  },
  deleteBtn: {
    marginTop: spacing.xs
  }
});
