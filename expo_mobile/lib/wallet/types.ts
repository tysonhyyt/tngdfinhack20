export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  timestamp: number;
  fromUserId: string;
  toMerchantId: string;
  status: 'pending' | 'completed' | 'failed';
  // Crypto fields
  signature?: string;      // user's ECDSA sig over tx payload
  userPubKey?: string;     // user's public key hex
  cert?: string;           // user's self-signed cert JSON
  ackSignature?: string;   // merchant's ECDSA sig over txId (ACK)
  merchantPubKey?: string; // merchant's public key hex
  // Sync
  syncStatus?: 'pending_sync' | 'synced';
}

export interface WalletState {
  offlineBalance: number;
  userId: string;
  displayName: string;
  sessionInitialized: boolean;
  pubKeyHex: string;
  cert: string;
  transactions: Transaction[];
}

export interface MerchantState {
  merchantId: string;
  merchantName: string;
  sessionInitialized: boolean;
  pubKeyHex: string;
  cert: string;
  transactions: Transaction[];
  offlineBalance: number;
}

export interface SyncQueueItem {
  txId: string;
  side: 'user' | 'merchant';
  tx: Transaction;
  queuedAt: number;
}
