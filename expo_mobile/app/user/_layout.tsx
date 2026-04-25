import { Stack } from 'expo-router';
import { TNG } from '../../lib/theme';

export default function UserLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: TNG.blue },
        headerTintColor: TNG.textWhite,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: TNG.bgSecondary },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'My Wallet' }} />
      <Stack.Screen name="scan" options={{ title: 'Scan QR Code' }} />
      <Stack.Screen name="pay" options={{ title: 'Payment' }} />
      <Stack.Screen name="result" options={{ title: 'Result', headerBackVisible: false }} />
    </Stack>
  );
}
