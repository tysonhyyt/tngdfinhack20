export interface Account {
  account_id: string; // UUID
  user_id: string; // UUID
  balance: number;
  loan_balance: number;
  spending_counter: number;
  max_offline_limit: number;
}

export interface OfflineTransaction {
  tx_id: string; // UUID
  consumer_id: string;
  vendor_id: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'INTERRUPTED' | 'SECURED' | 'FLAGGED';
  consumer_signature: string;
  vendor_signature: string;
  timestamp: string; // ISO date string
}

export interface DeviceCertificate {
  cert_id: string; // UUID
  device_id: string;
  public_key: string;
  expiry_date: string; // ISO date string
  is_revoked: boolean;
}
