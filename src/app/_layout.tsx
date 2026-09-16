import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { palette } from '@/constants/theme';
import { OrderStoreProvider } from '@/state/order-store';

export default function RootLayout() {
  return (
    <OrderStoreProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.canvas },
          animation: 'slide_from_right',
        }}
      />
    </OrderStoreProvider>
  );
}
