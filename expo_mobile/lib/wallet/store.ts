import { createMMKV } from 'react-native-mmkv';
import { Transaction, WalletState, MerchantState, SyncQueueItem } from './types';

const storage = createMMKV({ id: 'ble-pay-wallet' });

const WALLET_KEY = 'wallet';
const MERCHANT_KEY = 'merchant';
const SYNC_QUEUE_KEY = 'sync_queue';
const DEFAULT_BALANCE = 1000;

// --- Wallet (User/Payer) ---

export function getWallet(): WalletState {
  const raw = storage.getString(WALLET_KEY);
  if (raw) return JSON.parse(raw);
  const initial: WalletState = {
    balance: DEFAULT_BALANCE,
    userId: `user-${Math.random().toString(36).slice(2, 8)}`,
    pubKeyHex: '',
    cert: '',
    transactions: [],
  };
  storage.set(WALLET_KEY, JSON.stringify(initial));
  return initial;
}

function saveWallet(wallet: WalletState) {
  storage.set(WALLET_KEY, JSON.stringify(wallet));
}

export function setWalletIdentity(pubKeyHex: string, cert: string) {
  const wallet = getWallet();
  wallet.pubKeyHex = pubKeyHex;
  wallet.cert = cert;
  saveWallet(wallet);
}

export function deductBalance(amount: number): { success: boolean; wallet: WalletState } {
  const wallet = getWallet();
  if (wallet.balance < amount) return { success: false, wallet };
  wallet.balance -= amount;
  saveWallet(wallet);
  return { success: true, wallet };
}

export function addUserTransaction(tx: Transaction) {
  const wallet = getWallet();
  wallet.transactions.unshift(tx);
  saveWallet(wallet);
}

export function updateUserTransaction(txId: string, updates: Partial<Transaction>) {
  const wallet = getWallet();
  const idx = wallet.transactions.findIndex((t) => t.id === txId);
  if (idx !== -1) {
    wallet.transactions[idx] = { ...wallet.transactions[idx], ...updates };
    saveWallet(wallet);
  }
}

export function resetWallet() {
  storage.remove(WALLET_KEY);
}

// --- Merchant ---

export function getMerchant(): MerchantState {
  const raw = storage.getString(MERCHANT_KEY);
  if (raw) return JSON.parse(raw);
  const initial: MerchantState = {
    merchantId: `merchant-${Math.random().toString(36).slice(2, 8)}`,
    merchantName: 'My Store',
    pubKeyHex: '',
    cert: '',
    transactions: [],
    totalReceived: 0,
  };
  storage.set(MERCHANT_KEY, JSON.stringify(initial));
  return initial;
}

function saveMerchant(merchant: MerchantState) {
  storage.set(MERCHANT_KEY, JSON.stringify(merchant));
}

export function setMerchantIdentity(pubKeyHex: string, cert: string) {
  const merchant = getMerchant();
  merchant.pubKeyHex = pubKeyHex;
  merchant.cert = cert;
  saveMerchant(merchant);
}

export function addMerchantTransaction(tx: Transaction) {
  const merchant = getMerchant();
  merchant.transactions.unshift(tx);
  merchant.totalReceived += tx.amount;
  saveMerchant(merchant);
}

export function getMerchantTransactions(): Transaction[] {
  return getMerchant().transactions;
}

export function resetMerchant() {
  storage.remove(MERCHANT_KEY);
}

// --- Sync Queue ---

export function getSyncQueue(): SyncQueueItem[] {
  const raw = storage.getString(SYNC_QUEUE_KEY);
  if (!raw) return [];
  return JSON.parse(raw);
}

export function addToSyncQueue(item: SyncQueueItem) {
  const queue = getSyncQueue();
  queue.push(item);
  storage.set(SYNC_QUEUE_KEY, JSON.stringify(queue));
}

export function markSynced(txId: string) {
  const queue = getSyncQueue().filter((item) => item.txId !== txId);
  storage.set(SYNC_QUEUE_KEY, JSON.stringify(queue));
}
