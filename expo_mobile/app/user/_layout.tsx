import { Stack } from 'expo-router';

export default function UserLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#0f3460' },
        headerTintColor: '#fff',
        contentStyle: { backgroundColor: '#16213e' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'My Wallet' }} />
      <Stack.Screen name="scan" options={{ title: 'Scan QR Code' }} />
      <Stack.Screen name="pay" options={{ title: 'Payment' }} />
      <Stack.Screen name="result" options={{ title: 'Result', headerBackVisible: false }} />
    </Stack>
  );
}
