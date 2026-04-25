import { SessionInitRequest, SessionInitResponse, SyncRequest, SyncResponse, PullRequest, PullResponse } from './types';
import { getWallet, getMerchant } from '../wallet/store';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function mockInitSession(req: SessionInitRequest): Promise<SessionInitResponse> {
  await delay(800);
  const last6 = req.deviceId.slice(-6);
  if (req.role === 'merchant') {
    return {
      userId: req.deviceId,
      displayName: req.deviceId,
      offlineBalance: 0.0,
      status: 'active',
      merchantName: `Store ${last6}`,
    };
  }
  return {
    userId: req.deviceId,
    displayName: `User ${last6}`,
    offlineBalance: 1000.0,
    status: 'active',
  };
}

export async function mockPushTransactions(req: SyncRequest): Promise<SyncResponse> {
  await delay(1000);
  const syncedTxIds = req.transactions.map((item) => item.txId);
  return { syncedTxIds, failedTxIds: [] };
}

export async function mockPullAccount(req: PullRequest): Promise<PullResponse> {
  await delay(600);
  if (req.role === 'merchant') {
    const merchant = getMerchant();
    return {
      offlineBalance: merchant.offlineBalance,
      transactions: merchant.transactions.map((t) => ({ ...t, syncStatus: 'synced' as const })),
    };
  }
  const wallet = getWallet();
  return {
    offlineBalance: wallet.offlineBalance,
    transactions: wallet.transactions.map((t) => ({ ...t, syncStatus: 'synced' as const })),
  };
}
