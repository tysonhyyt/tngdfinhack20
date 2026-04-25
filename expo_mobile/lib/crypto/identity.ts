import * as SecureStore from 'expo-secure-store';
import { p256 } from '@noble/curves/nist.js';
import { bytesToHex, hexToBytes, randomBytes } from '@noble/curves/utils.js';

const PRIVKEY_KEY = 'identity_privkey';

export interface Identity {
  privKeyHex: string;
  pubKeyHex: string;
  cert: string; // JSON string: self-signed cert
}

function signRaw(message: string, privKeyHex: string): string {
  const msgBytes = new TextEncoder().encode(message);
  const sigBytes = p256.sign(msgBytes, hexToBytes(privKeyHex));
  return bytesToHex(sigBytes);
}

function verifyRaw(message: string, sigHex: string, pubKeyHex: string): boolean {
  try {
    const msgBytes = new TextEncoder().encode(message);
    const sigBytes = hexToBytes(sigHex);
    return p256.verify(sigBytes, msgBytes, hexToBytes(pubKeyHex));
  } catch {
    return false;
  }
}

function makeCert(id: string, pubKeyHex: string, privKeyHex: string): string {
  const payload = JSON.stringify({ id, pubKeyHex, timestamp: Date.now() });
  const selfSig = signRaw(payload, privKeyHex);
  return JSON.stringify({ id, pubKeyHex, payload, selfSig });
}

// Generate + persist keypair on first install
export async function initIdentity(id: string): Promise<Identity> {
  const existing = await SecureStore.getItemAsync(PRIVKEY_KEY);
  if (existing) return JSON.parse(existing);

  const privKeyBytes = randomBytes(32);
  const privKeyHex = bytesToHex(privKeyBytes);
  const pubKeyBytes = p256.getPublicKey(privKeyBytes, true); // compressed
  const pubKeyHex = bytesToHex(pubKeyBytes);
  const cert = makeCert(id, pubKeyHex, privKeyHex);

  const identity: Identity = { privKeyHex, pubKeyHex, cert };
  await SecureStore.setItemAsync(PRIVKEY_KEY, JSON.stringify(identity));
  return identity;
}

export async function getIdentity(): Promise<Identity | null> {
  const raw = await SecureStore.getItemAsync(PRIVKEY_KEY);
  if (!raw) return null;
  return JSON.parse(raw);
}

// Sign a tx payload object — returns hex signature
export function signPayload(payload: object, privKeyHex: string): string {
  return signRaw(JSON.stringify(payload), privKeyHex);
}

// Verify a signature against a payload and pubkey hex
export function verifySignature(payload: object, sigHex: string, pubKeyHex: string): boolean {
  return verifyRaw(JSON.stringify(payload), sigHex, pubKeyHex);
}

// Verify a self-signed cert is internally consistent
export function verifyCert(certJson: string): { valid: boolean; id: string; pubKeyHex: string } {
  try {
    const cert = JSON.parse(certJson);
    const { id, pubKeyHex, payload, selfSig } = cert;
    if (!id || !pubKeyHex || !payload || !selfSig) return { valid: false, id: '', pubKeyHex: '' };
    const valid = verifyRaw(payload, selfSig, pubKeyHex);
    return { valid, id, pubKeyHex };
  } catch {
    return { valid: false, id: '', pubKeyHex: '' };
  }
}
