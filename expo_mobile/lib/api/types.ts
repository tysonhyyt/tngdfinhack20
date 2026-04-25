import { SyncQueueItem } from '../wallet/types';

export interface SessionInitRequest {
  deviceId: string;
  role: 'user' | 'merchant';
}

export interface SessionInitResponse {
  userId: string;
  displayName: string;
  offlineBalance: number;
  status: 'active';
  merchantName?: string;
}

export interface SyncRequest {
  deviceId: string;
  transactions: SyncQueueItem[];
}

export interface SyncResponse {
  syncedTxIds: string[];
  failedTxIds: string[];
}

export interface ServerTransaction {
  id: string;
  amount: number;
  currency: string;
  timestamp: number;
  fromUserId: string;
  toMerchantId: string;
  status: 'pending' | 'completed' | 'failed';
  syncStatus: 'synced';  // server only returns confirmed txs
}

export interface PullRequest {
  deviceId: string;
  role: 'user' | 'merchant';
}

export interface PullResponse {
  offlineBalance: number;
  transactions: ServerTransaction[];
}
