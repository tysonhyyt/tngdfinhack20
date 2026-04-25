import { dbPool } from '../../infrastructure/db.service';

interface AccountRow {
  account_id: string;
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
