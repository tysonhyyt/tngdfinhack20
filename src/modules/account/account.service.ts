import type { ResultSetHeader } from "mysql2/promise";
import { dbPool } from "../../infrastructure/db.service";

/** Body shape produced by `/sync/push` and `pushOfflineTransactions` Kafka messages. */
export interface ConsumerOfflinePushTx {
  txId?: string;
  side?: string;
  queuedAt?: number;
  tx?: {
    id?: string;
    amount?: number;
    currency?: string;
    timestamp?: number;
    fromUserId?: string;
    toMerchantId?: string;
    status?: string;
    signature?: string;
    userPubKey?: string;
    cert?: string;
    ackSignature?: string;
    merchantPubKey?: string;
    syncStatus?: string;
  };
}

export interface ConsumerPushOfflineBody {
  deviceId: string;
  transactions: ConsumerOfflinePushTx[];
}

export interface DeductOfflineBalanceResult {
  /** `txId` values that reduced `offline_balance`. */
  deductedTxIds: string[];
  /** `txId` or synthetic ids for rows skipped or with no matching account. */
  skippedTxIds: string[];
}

interface AccountRow {
  account_id?: string;
  user_id: string;
  device_id: string;
  role: string;
  offline_balance: number;
  currency: string;
}

interface TransactionRow {
  tx_id: string;
  amount: number;
  currency: string;
  timestamp: number;
  consumer_id: string;
  vendor_id: string;
  status: string;
  sync_status: string;
}

export interface AccountWithTransactions {
  account: AccountRow;
  transactions: TransactionRow[];
}

export interface AccountLookupResult {
  account: AccountRow;
  displayName: string;
  status: string;
  merchantName?: string;
}

function normalizeDisplayName(deviceId: string, role: string): string {
  if (role === 'merchant') {
    return deviceId;
  }

  if (deviceId.startsWith('user-')) {
    return `User ${deviceId.slice(5)}`;
  }

  return `User ${deviceId}`;
}

function normalizeMerchantName(deviceId: string): string {
  if (deviceId.startsWith('merchant-')) {
    return `Store ${deviceId.slice(9)}`;
  }

  return `Store ${deviceId}`;
}

export async function findAccountByDeviceIdAndRole(
  deviceId: string,
  role: string
): Promise<AccountWithTransactions | null> {
  const [accountRows] = await dbPool.query<any[]>(
    'SELECT account_id, user_id, device_id, role, offline_balance, currency FROM account WHERE device_id = ? AND role = ? LIMIT 1',
    [deviceId, role]
  );

  if (!Array.isArray(accountRows) || accountRows.length === 0) {
    return null;
  }

  const account = accountRows[0] as AccountRow;

  const [transactionRows] = await dbPool.query<any[]>(
    'SELECT tx_id, amount, currency, timestamp, consumer_id, vendor_id, status, sync_status FROM offline_transaction WHERE consumer_id = ? ORDER BY timestamp DESC',
    [account.user_id]
  );

  return {
    account,
    transactions: Array.isArray(transactionRows) ? (transactionRows as TransactionRow[]) : [],
  };
}

export async function findOrCreateAccountByDeviceIdAndRole(
  deviceId: string,
  role: string
): Promise<AccountLookupResult> {
  const existing = await findAccountByDeviceIdAndRole(deviceId, role);

  if (existing) {
    const displayName = normalizeDisplayName(existing.account.device_id, existing.account.role);
    const merchantName = existing.account.role === 'merchant' ? normalizeMerchantName(existing.account.device_id) : undefined;

    return {
      account: existing.account,
      displayName,
      status: 'active',
      merchantName,
    };
  }

  const offlineBalance = role === 'merchant' ? 0 : 1000;
  const currency = 'USD';

  await dbPool.query(
    'INSERT INTO account (user_id, device_id, role, offline_balance, currency) VALUES (?, ?, ?, ?, ?)',
    [deviceId, deviceId, role, offlineBalance, currency]
  );

  return {
    account: {
      user_id: deviceId,
      device_id: deviceId,
      role,
      offline_balance: offlineBalance,
      currency,
    },
    displayName: normalizeDisplayName(deviceId, role),
    status: 'active',
    merchantName: role === 'merchant' ? normalizeMerchantName(deviceId) : undefined,
  };
}

/**
 * For each consumer-side transaction, deducts `tx.amount` from `account.offline_balance`
 * where `user_id = tx.fromUserId`, `device_id = payload.deviceId`, and `role = 'user'`.
 * Skips entries where `fromUserId` does not match top-level `deviceId`, or amount is invalid.
 */
export async function deductOfflineBalanceFromConsumerPush(
  body: ConsumerPushOfflineBody,
): Promise<DeductOfflineBalanceResult> {
  const deviceId = body.deviceId?.trim();
  const deductedTxIds: string[] = [];
  const skippedTxIds: string[] = [];

  if (!deviceId) {
    return { deductedTxIds, skippedTxIds };
  }

  const list = Array.isArray(body.transactions) ? body.transactions : [];

  for (const entry of list) {
    const txId =
      typeof entry.txId === "string" && entry.txId.trim()
        ? entry.txId.trim()
        : typeof entry.tx?.id === "string" && entry.tx.id.trim()
          ? entry.tx.id.trim()
          : "";

    const tx = entry.tx;
    if (!tx || typeof tx.fromUserId !== "string" || !tx.fromUserId.trim()) {
      if (txId) skippedTxIds.push(txId);
      continue;
    }

    const userId = tx.fromUserId.trim();
    if (userId !== deviceId) {
      if (txId) skippedTxIds.push(txId);
      continue;
    }

    const amount = Number(tx.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      if (txId) skippedTxIds.push(txId);
      continue;
    }

    const [result] = await dbPool.query<ResultSetHeader>(
      `UPDATE account
       SET offline_balance = offline_balance - ?
       WHERE user_id = ? AND device_id = ? AND role = 'user'`,
      [amount, userId, deviceId],
    );

    if (result.affectedRows > 0) {
      if (txId) deductedTxIds.push(txId);
    } else if (txId) {
      skippedTxIds.push(txId);
    }
  }

  return { deductedTxIds, skippedTxIds };
}
