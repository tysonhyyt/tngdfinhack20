import { Stack } from 'expo-router';
import { TNG } from '../../lib/theme';

export default function MerchantLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: TNG.blue },
        headerTintColor: TNG.textWhite,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: TNG.bgSecondary },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Merchant Dashboard' }} />
      <Stack.Screen name="receive" options={{ title: 'Receive Payment' }} />
      <Stack.Screen name="history" options={{ title: 'Transaction History' }} />
    </Stack>
  );
}
