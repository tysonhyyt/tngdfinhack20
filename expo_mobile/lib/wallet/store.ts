import { createMMKV } from 'react-native-mmkv';
import { Transaction, WalletState, MerchantState } from './types';

const storage = createMMKV({ id: 'ble-pay-wallet' });

const WALLET_KEY = 'wallet';
const MERCHANT_KEY = 'merchant';
const DEFAULT_BALANCE = 1000; // RM1000 starting balance

// --- Wallet (User/Payer) ---

export function getWallet(): WalletState {
  const raw = storage.getString(WALLET_KEY);
  if (raw) return JSON.parse(raw);
  const initial: WalletState = {
    balance: DEFAULT_BALANCE,
    userId: `user-${Math.random().toString(36).slice(2, 8)}`,
    transactions: [],
  };
  storage.set(WALLET_KEY, JSON.stringify(initial));
  return initial;
}

function saveWallet(wallet: WalletState) {
  storage.set(WALLET_KEY, JSON.stringify(wallet));
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
    transactions: [],
    totalReceived: 0,
  };
  storage.set(MERCHANT_KEY, JSON.stringify(initial));
  return initial;
}

function saveMerchant(merchant: MerchantState) {
  storage.set(MERCHANT_KEY, JSON.stringify(merchant));
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
