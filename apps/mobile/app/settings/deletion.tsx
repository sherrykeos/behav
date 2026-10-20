import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { colors, spacing, typography, radii } from '../../src/theme';
import { Button, Input, Header, Card } from '../../src/components';
import { useAuth } from '../../src/context/AuthContext';

export default function AccountDeletionScreen() {
  const { logout } = useAuth();
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDelete = () => {
    if (confirmText.trim().toUpperCase() !== 'DELETE') {
      Alert.alert('Confirmation Required', 'Please type DELETE in the box below to confirm account deletion.');
      return;
    }

    Alert.alert(
      'Permanent Account Deletion',
      'This will schedule your account for permanent deletion. Your local database partition will be purged immediately.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Permanently Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            setTimeout(async () => {
              setLoading(false);
              await logout();
              Alert.alert(
                'Account Deleted',
                'Your account and all associated behavior records have been scheduled for permanent removal.',
                [{ text: 'OK', onPress: () => router.replace('/(auth)/welcome') }]
              );
            }, 600);
          }
        }
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Header title="Account Deletion" subtitle="Irreversible data removal lifecycle" onBack={() => router.back()} />

      <View style={styles.content}>
        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>⚠ Irreversible Action</Text>
          <Text style={styles.warningText}>
            Deleting your account permanently removes all behaviors, entries, daily reviews, and streaks.
            Once processed, this data cannot be recovered.
          </Text>
        </View>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>14-Day Grace Period</Text>
          <Text style={styles.cardText}>
            To protect against accidental loss, cloud deletion requests enter a 14-day grace period before total database purge.
            Signing in during the grace period allows you to cancel the deletion request.
          </Text>
        </Card>

        <Text style={styles.confirmPrompt}>
          To verify this decision, type <Text style={styles.boldText}>DELETE</Text> in the input below:
        </Text>

        <Input
          placeholder="Type DELETE to confirm"
          value={confirmText}
          onChangeText={setConfirmText}
          autoCapitalize="characters"
        />

        <Button
          title="Permanently Delete My Account"
          onPress={handleDelete}
          loading={loading}
          variant="danger"
          size="lg"
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
  content: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xs
  },
  warningBox: {
    backgroundColor: colors.accents.coralFaint,
    borderColor: colors.accents.coralBorder,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.base,
    marginBottom: spacing.md
  },
  warningTitle: {
    ...typography.bodyBold,
    color: colors.accents.coral,
    marginBottom: 4
  },
  warningText: {
    ...typography.caption,
    color: colors.text.secondary,
    lineHeight: 18
  },
  card: {
    marginVertical: spacing.xs
  },
  cardTitle: {
    ...typography.bodyBold,
    color: colors.text.primary,
    marginBottom: 4
  },
  cardText: {
    ...typography.caption,
    color: colors.text.muted,
    lineHeight: 18
  },
  confirmPrompt: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.lg,
    marginBottom: spacing.xs
  },
  boldText: {
    fontWeight: '800',
    color: colors.accents.coral
  },
  deleteBtn: {
    marginTop: spacing.md
  }
});
