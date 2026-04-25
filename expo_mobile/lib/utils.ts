import { Platform, PermissionsAndroid } from 'react-native';

export async function requestBlePermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  const permissions = [
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    PermissionsAndroid.PERMISSIONS.CAMERA,
  ];

  const results = await PermissionsAndroid.requestMultiple(permissions);
  return Object.values(results).every(
    (r) => r === PermissionsAndroid.RESULTS.GRANTED
  );
}

export function formatCurrency(amount: number): string {
  return `RM ${amount.toFixed(2)}`;
}

export function generateTransactionId(): string {
  return `txn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function base64Encode(str: string): string {
  // Simple base64 for BLE data transfer
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  const bytes = new TextEncoder().encode(str);
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i];
    const b2 = bytes[i + 1] ?? 0;
    const b3 = bytes[i + 2] ?? 0;
    result += chars[b1 >> 2];
    result += chars[((b1 & 3) << 4) | (b2 >> 4)];
    result += i + 1 < bytes.length ? chars[((b2 & 15) << 2) | (b3 >> 6)] : '=';
    result += i + 2 < bytes.length ? chars[b3 & 63] : '=';
  }
  return result;
}

export function base64Decode(b64: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result: number[] = [];
  const clean = b64.replace(/=/g, '');
  for (let i = 0; i < clean.length; i += 4) {
    const b1 = chars.indexOf(clean[i]);
    const b2 = chars.indexOf(clean[i + 1]);
    const b3 = chars.indexOf(clean[i + 2]);
    const b4 = chars.indexOf(clean[i + 3]);
    result.push((b1 << 2) | (b2 >> 4));
    if (b3 >= 0) result.push(((b2 & 15) << 4) | (b3 >> 2));
    if (b4 >= 0) result.push(((b3 & 3) << 6) | b4);
  }
  return new TextDecoder().decode(new Uint8Array(result));
}
