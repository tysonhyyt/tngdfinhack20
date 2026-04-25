import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { initIdentity } from '../lib/crypto/identity';
import { getWallet, getMerchant, setWalletIdentity, setMerchantIdentity, deduplicateStorage } from '../lib/wallet/store';
import { TNG } from '../lib/theme';

export default function RootLayout() {
  useEffect(() => {
    async function bootstrap() {
      deduplicateStorage();
      const wallet = getWallet();
      const merchant = getMerchant();
      const deviceId = wallet.userId;
      const identity = await initIdentity(deviceId);
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
          headerStyle: { backgroundColor: TNG.blue },
          headerTintColor: TNG.textWhite,
          headerTitleStyle: { fontWeight: '700', fontSize: 17 },
          contentStyle: { backgroundColor: TNG.bgSecondary },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Touch \'n Go' }} />
        <Stack.Screen name="user" options={{ headerShown: false }} />
        <Stack.Screen name="merchant" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
