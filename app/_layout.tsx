import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEffect, useState } from 'react';
import { StorageService, StorageKeys } from '@/lib/storage';

export const unstable_settings = {
  anchor: '(customer)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [initialRoute, setInitialRoute] = useState<'login' | 'customer'>('login');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      const clientId = await StorageService.getItem(StorageKeys.CLIENT_ID);
      if (clientId) {
        setInitialRoute('customer');
      }
    } catch (err) {
      console.error('Auth check failed:', err);
    } finally {
      setIsReady(true);
    }
  };

  if (!isReady) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        {initialRoute === 'login' ? (
          <Stack.Screen name="login" options={{ headerShown: false }} />
        ) : (
          <Stack.Screen name="(customer)" options={{ headerShown: false }} />
        )}
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
