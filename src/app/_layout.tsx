import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { palette } from '@/constants/theme';
import { OrderDataProvider } from '@/state/order-queries';
import { UiProvider } from '@/state/ui-store';

export default function RootLayout() {
  return (
    <OrderDataProvider><UiProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.canvas },
          animation: 'slide_from_right',
        }}
      />
    </UiProvider></OrderDataProvider>
  );
}
