import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { getWallet } from '../../lib/wallet/store';
import { formatCurrency } from '../../lib/utils';

export default function UserHome() {
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [userId, setUserId] = useState('');

  useFocusEffect(
    useCallback(() => {
      const wallet = getWallet();
      setBalance(wallet.balance);
      setUserId(wallet.userId);
    }, [])
  );

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>Available Balance</Text>
        <Text style={styles.balance}>{formatCurrency(balance)}</Text>
        <Text style={styles.userId}>ID: {userId}</Text>
      </View>

      <TouchableOpacity
        style={styles.payButton}
        onPress={() => router.push('/user/scan')}
      >
        <Text style={styles.payButtonText}>Scan & Pay</Text>
      </TouchableOpacity>

      <View style={styles.recentHeader}>
        <Text style={styles.recentTitle}>Recent Transactions</Text>
      </View>
      <RecentTransactions />
    </View>
  );
}

function RecentTransactions() {
  const wallet = getWallet();
  const txns = wallet.transactions.slice(0, 5);

  if (txns.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No transactions yet</Text>
      </View>
    );
  }

  return (
    <View>
      {txns.map((tx) => (
        <View key={tx.id} style={styles.txRow}>
          <View>
            <Text style={styles.txMerchant}>{tx.toMerchantId}</Text>
            <Text style={styles.txDate}>
              {new Date(tx.timestamp).toLocaleString()}
            </Text>
          </View>
          <Text style={styles.txAmount}>-{formatCurrency(tx.amount)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#16213e',
    padding: 20,
  },
  card: {
    backgroundColor: '#0f3460',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: '#a0a0b0',
  },
  balance: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  userId: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  payButton: {
    backgroundColor: '#e94560',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  payButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  recentHeader: {
    marginBottom: 12,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f3460',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  txMerchant: {
    color: '#fff',
    fontSize: 14,
  },
  txDate: {
    color: '#666',
    fontSize: 11,
    marginTop: 2,
  },
  txAmount: {
    color: '#e94560',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
