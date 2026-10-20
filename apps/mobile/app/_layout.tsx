import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/context/AuthContext';
import { DatabaseProvider } from '../src/context/DatabaseContext';
import { colors } from '../src/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <DatabaseProvider>
          <View style={styles.container}>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background.base },
                animation: 'slide_from_right'
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="behavior/create" options={{ presentation: 'modal' }} />
              <Stack.Screen name="behavior/quick-log" options={{ presentation: 'modal' }} />
              <Stack.Screen name="behavior/[id]/log" options={{ presentation: 'modal' }} />
              <Stack.Screen name="behavior/[id]/index" options={{ headerShown: false }} />
              <Stack.Screen name="behavior/[id]/edit" options={{ headerShown: false }} />
              <Stack.Screen name="behavior/[id]/history" options={{ headerShown: false }} />
              <Stack.Screen name="behavior/[id]/entry/[entryId]" options={{ headerShown: false }} />
              <Stack.Screen name="behavior/[id]/goals" options={{ headerShown: false }} />
              <Stack.Screen name="behavior/[id]/streaks" options={{ headerShown: false }} />
              <Stack.Screen name="behavior/[id]/insights" options={{ headerShown: false }} />
              <Stack.Screen name="settings/profile" options={{ headerShown: false }} />
              <Stack.Screen name="settings/appearance" options={{ headerShown: false }} />
              <Stack.Screen name="settings/privacy" options={{ headerShown: false }} />
              <Stack.Screen name="settings/export" options={{ headerShown: false }} />
              <Stack.Screen name="settings/deletion" options={{ headerShown: false }} />
              <Stack.Screen name="settings/help" options={{ headerShown: false }} />
            </Stack>
          </View>
        </DatabaseProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.base
  }
});
