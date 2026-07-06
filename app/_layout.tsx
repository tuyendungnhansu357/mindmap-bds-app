import 'react-native-get-random-values';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useSettingsStore } from '../src/store/settingsStore';
import { isProActivated } from '../src/services/licenseService';

export default function RootLayout() {
  const { loadSettings, setPlan } = useSettingsStore();

  useEffect(() => {
    (async () => {
      await loadSettings();
      const pro = await isProActivated();
      if (pro) setPlan('pro');
    })();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0f1117' },
          headerTintColor: '#e0e7ff',
          contentStyle: { backgroundColor: '#0f1117' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="editor/[mapId]"
          options={{ headerShown: true, title: 'MindMap' }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
