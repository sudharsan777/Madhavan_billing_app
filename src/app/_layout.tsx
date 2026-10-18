import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { registerAndSavePushToken } from '../services/fcmTokenService';
import { ProductProvider } from '../context/ProductContext';

export default function RootLayout() {
  // Register device push token on app startup so Cloud Function
  // can send notifications to both the tablet and the phone.
  useEffect(() => {
    registerAndSavePushToken();
  }, []);

  return (
    <ProductProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: '#FAF9F6' },
        }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen
          name="dashboard"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
      </Stack>
    </ProductProvider>
  );
}
