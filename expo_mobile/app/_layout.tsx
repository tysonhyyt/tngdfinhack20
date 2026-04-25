import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { initIdentity } from '../lib/crypto/identity';
import { getWallet, getMerchant, setWalletIdentity, setMerchantIdentity, deduplicateStorage } from '../lib/wallet/store';

export default function RootLayout() {
  useEffect(() => {
    async function bootstrap() {
      deduplicateStorage();
      const wallet = getWallet();
      const merchant = getMerchant();
      // Init shared keypair for this device (one identity per device)
      const deviceId = wallet.userId; // use userId as device id
      const identity = await initIdentity(deviceId);
      // Persist pubkey + cert into both wallet and merchant stores
      if (!wallet.pubKeyHex) setWalletIdentity(identity.pubKeyHex, identity.cert);
      if (!merchant.pubKeyHex) setMerchantIdentity(identity.pubKeyHex, identity.cert);
    }
    bootstrap();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#1a1a2e' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          contentStyle: { backgroundColor: '#16213e' },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'BLE Pay' }} />
        <Stack.Screen name="user" options={{ headerShown: false }} />
        <Stack.Screen name="merchant" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
