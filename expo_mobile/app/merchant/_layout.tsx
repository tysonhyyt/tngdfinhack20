import { Stack } from 'expo-router';

export default function MerchantLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#533483' },
        headerTintColor: '#fff',
        contentStyle: { backgroundColor: '#16213e' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Merchant Dashboard' }} />
      <Stack.Screen name="receive" options={{ title: 'Receive Payment' }} />
      <Stack.Screen name="history" options={{ title: 'Transaction History' }} />
    </Stack>
  );
}
