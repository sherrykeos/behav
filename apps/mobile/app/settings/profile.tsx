import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { colors, spacing } from '../../src/theme';
import { Button, Input, Header } from '../../src/components';
import { useAuth } from '../../src/context/AuthContext';

export default function UserProfileScreen() {
  const { user, updateUser } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [email] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);

  const handleSave = () => {
    if (!displayName.trim()) {
      Alert.alert('Validation Error', 'Display name cannot be empty.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      updateUser({ displayName: displayName.trim() });
      setLoading(false);
      Alert.alert('Profile Updated', 'Your profile details have been saved.', [
        { text: 'Done', onPress: () => router.back() }
      ]);
    }, 400);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Header title="User Profile" subtitle="Account and identity information" onBack={() => router.back()} />

      <View style={styles.form}>
        <Input
          label="Display Name"
          value={displayName}
          onChangeText={setDisplayName}
        />

        <Input
          label="Email Address (Verified)"
          value={email}
          editable={false}
          helperText="Email is bound to your account and identity context."
        />

        <Input
          label="Account Status"
          value={user?.accountStatus || 'ACTIVE'}
          editable={false}
        />

        <Button
          title="Save Profile"
          onPress={handleSave}
          loading={loading}
          variant="primary"
          size="lg"
          style={styles.saveBtn}
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
  form: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base
  },
  saveBtn: {
    marginTop: spacing.xl
  }
});
