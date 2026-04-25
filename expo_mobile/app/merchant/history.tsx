import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { getMerchantTransactions } from '../../lib/wallet/store';
import { Transaction } from '../../lib/wallet/types';
import { formatCurrency } from '../../lib/utils';

export default function HistoryScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useFocusEffect(
    useCallback(() => {
      setTransactions(getMerchantTransactions());
    }, [])
  );

  const renderItem = ({ item }: { item: Transaction }) => (
    <View style={styles.txRow}>
      <View style={styles.txLeft}>
        <Text style={styles.txFrom}>From: {item.fromUserId}</Text>
        <Text style={styles.txDate}>
          {new Date(item.timestamp).toLocaleString()}
        </Text>
        <Text style={[styles.txStatus, item.status === 'completed' && styles.txCompleted]}>
          {item.status.toUpperCase()}
        </Text>
      </View>
      <Text style={styles.txAmount}>+{formatCurrency(item.amount)}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {transactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No transactions yet</Text>
          <Text style={styles.emptySubtext}>
            Start receiving payments to see history
          </Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#16213e',
  },
  listContent: {
    padding: 16,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f3460',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  txLeft: {
    flex: 1,
  },
  txFrom: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  txDate: {
    color: '#666',
    fontSize: 11,
    marginTop: 4,
  },
  txStatus: {
    fontSize: 10,
    color: '#a0a0b0',
    marginTop: 4,
  },
  txCompleted: {
    color: '#4ade80',
  },
  txAmount: {
    color: '#4ade80',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
  },
});
