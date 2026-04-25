export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  timestamp: number;
  fromUserId: string;
  toMerchantId: string;
  status: 'pending' | 'completed' | 'failed';
}

export interface WalletState {
  balance: number;
  userId: string;
  transactions: Transaction[];
}

export interface MerchantState {
  merchantId: string;
  merchantName: string;
  transactions: Transaction[];
  totalReceived: number;
}
