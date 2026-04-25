import { dbPool } from '../../infrastructure/db.service';

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
