export function formatCurrency(amount: number): string {
  return `RM ${amount.toFixed(2)}`;
}

export function generateTransactionId(): string {
  return `txn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
