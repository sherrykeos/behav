import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { colors, spacing, typography, radii } from '../../../src/theme';
import { Button, Input, Header } from '../../../src/components';
import { useAuth } from '../../../src/context/AuthContext';
import { useDatabase } from '../../../src/context/DatabaseContext';
import { Behavior } from '@behav/domain';

const ACCENT_COLORS = [
  '#4ADE80',
  '#10B981',
  '#6EE7B7',
  '#60A5FA',
  '#FBBF24',
  '#F87171',
  '#C084FC'
];

export default function EditBehaviorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { behaviorRepo } = useDatabase();

  const [behavior, setBehavior] = useState<Behavior | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('');
  const [accentColor, setAccentColor] = useState(ACCENT_COLORS[0]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      if (!user || !id) return;
      const b = await behaviorRepo.findById(id, user.id);
      if (b) {
        setBehavior(b);
        setName(b.name);
        setDescription(b.description || '');
        setUnit(b.unit || '');
        setAccentColor(b.accentColor);
      }
    }
    load();
  }, [user, id]);

  const handleUpdate = async () => {
    if (!user || !id) return;
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Name cannot be empty.');
      return;
    }

    setLoading(true);
    try {
      await behaviorRepo.update(id, user.id, {
        name: name.trim(),
        description: description.trim() || null,
        unit: unit.trim() || null,
        accentColor
      });
      Alert.alert('Saved', 'Behavior updated successfully.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch {
      Alert.alert('Error', 'Could not update behavior.');
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveToggle = async () => {
    if (!user || !id || !behavior) return;
    try {
      if (behavior.archivedAt) {
        await behaviorRepo.unarchive(id, user.id);
        setBehavior({ ...behavior, archivedAt: null });
        Alert.alert('Unarchived', `${behavior.name} has been restored to active list.`);
      } else {
        await behaviorRepo.archive(id, user.id);
        setBehavior({ ...behavior, archivedAt: new Date().toISOString() });
        Alert.alert('Archived', `${behavior.name} has been archived.`);
      }
    } catch {
      Alert.alert('Error', 'Could not modify archive status.');
    }
  };

  const handleDelete = () => {
    if (!user || !id) return;
    Alert.alert(
      'Delete Behavior',
      'Are you sure you want to delete this behavior? All entries and streaks will be removed from your active workspace.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await behaviorRepo.softDelete(id, user.id);
            router.replace('/(tabs)/behaviors');
          }
        }
      ]
    );
  };

  if (!behavior) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Header title="Edit Behavior" subtitle={behavior.name} onBack={() => router.back()} />

      <View style={styles.form}>
        <Input
          label="Behavior Name"
          value={name}
          onChangeText={setName}
        />

        <Input
          label="Description"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={2}
        />

        <Input
          label="Unit Label"
          value={unit}
          onChangeText={setUnit}
        />

        <Text style={styles.label}>Accent Color</Text>
        <View style={styles.paletteRow}>
          {ACCENT_COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setAccentColor(c)}
              style={[
                styles.colorCircle,
                { backgroundColor: c },
                accentColor === c && styles.colorCircleActive
              ]}
            />
          ))}
        </View>

        <Button
          title="Save Changes"
          onPress={handleUpdate}
          loading={loading}
          variant="primary"
          size="lg"
          style={styles.saveBtn}
        />

        <View style={styles.dangerZone}>
          <Text style={styles.dangerTitle}>Behavior Lifecycle</Text>

          <Button
            title={behavior.archivedAt ? 'Unarchive Behavior' : 'Archive Behavior (Hide from active list)'}
            onPress={handleArchiveToggle}
            variant="secondary"
            size="md"
            style={styles.lifecycleBtn}
          />

          <Button
            title="Delete Behavior"
            onPress={handleDelete}
            variant="danger"
            size="md"
            style={styles.lifecycleBtn}
          />
        </View>
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
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.base
  },
  loadingText: {
    color: colors.text.muted
  },
  form: {
    paddingTop: spacing.xs
  },
  label: {
    ...typography.captionBold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.md,
    marginBottom: spacing.xs
  },
  paletteRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginVertical: spacing.xs
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16
  },
  colorCircleActive: {
    borderColor: colors.text.primary,
    borderWidth: 2.5
  },
  saveBtn: {
    marginTop: spacing.xl
  },
  dangerZone: {
    marginTop: spacing.xxl,
    paddingTop: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.background.border
  },
  dangerTitle: {
    ...typography.captionBold,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs
  },
  lifecycleBtn: {
    marginVertical: 4
  }
});
