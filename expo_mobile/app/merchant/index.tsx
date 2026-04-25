import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { getMerchant } from '../../lib/wallet/store';
import { formatCurrency } from '../../lib/utils';

export default function MerchantHome() {
  const router = useRouter();
  const [totalReceived, setTotalReceived] = useState(0);
  const [txCount, setTxCount] = useState(0);
  const [merchantName, setMerchantName] = useState('');

  useFocusEffect(
    useCallback(() => {
      const merchant = getMerchant();
      setTotalReceived(merchant.totalReceived);
      setTxCount(merchant.transactions.length);
      setMerchantName(merchant.merchantName);
    }, [])
  );

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.storeName}>{merchantName}</Text>
        <Text style={styles.label}>Total Received</Text>
        <Text style={styles.total}>{formatCurrency(totalReceived)}</Text>
        <Text style={styles.txCount}>{txCount} transactions</Text>
      </View>

      <TouchableOpacity
        style={styles.receiveButton}
        onPress={() => router.push('/merchant/receive')}
      >
        <Text style={styles.receiveButtonText}>Start Receiving Payments</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.historyButton}
        onPress={() => router.push('/merchant/history')}
      >
        <Text style={styles.historyButtonText}>View Transaction History</Text>
      </TouchableOpacity>
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
    backgroundColor: '#533483',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
  },
  storeName: {
    fontSize: 18,
    color: '#e0d0ff',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#b0a0d0',
  },
  total: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  txCount: {
    fontSize: 12,
    color: '#b0a0d0',
    marginTop: 8,
  },
  receiveButton: {
    backgroundColor: '#e94560',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  receiveButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  historyButton: {
    backgroundColor: '#0f3460',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  historyButtonText: {
    fontSize: 16,
    color: '#fff',
  },
});
