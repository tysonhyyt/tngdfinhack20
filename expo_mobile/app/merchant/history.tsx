import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { getMerchantTransactions } from '../../lib/wallet/store';
import { Transaction } from '../../lib/wallet/types';
import { formatCurrency } from '../../lib/utils';
import { TNG } from '../../lib/theme';

export default function HistoryScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useFocusEffect(
    useCallback(() => {
      setTransactions(getMerchantTransactions());
    }, [])
  );

  const renderItem = ({ item }: { item: Transaction }) => (
    <View style={styles.txRow}>
      <View style={styles.txIconWrap}>
        <View style={styles.txIcon}>
          <Text style={styles.txIconText}>↓</Text>
        </View>
      </View>
      <View style={styles.txLeft}>
        <Text style={styles.txFrom} numberOfLines={1}>From: {item.fromUserId}</Text>
        <Text style={styles.txDate}>{new Date(item.timestamp).toLocaleString()}</Text>
        <View style={[styles.statusBadge, item.status === 'completed' && styles.statusCompleted]}>
          <Text style={[styles.statusText, item.status === 'completed' && styles.statusTextCompleted]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>
      <Text style={styles.txAmount}>+{formatCurrency(item.amount)}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {transactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>—</Text>
          <Text style={styles.emptyText}>No transactions yet</Text>
          <Text style={styles.emptySubtext}>Start receiving payments to see history</Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TNG.bgSecondary,
  },
  listContent: {
    padding: 16,
    gap: 8,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TNG.bgCard,
    borderRadius: TNG.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: TNG.border,
    gap: 12,
  },
  txIconWrap: {},
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: TNG.radius.full,
    backgroundColor: TNG.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txIconText: {
    fontSize: 18,
    color: TNG.success,
    fontWeight: '700',
  },
  txLeft: {
    flex: 1,
  },
  txFrom: {
    color: TNG.textPrimary,
    fontSize: TNG.font.base,
    fontWeight: '600',
  },
  txDate: {
    color: TNG.textMuted,
    fontSize: TNG.font.xs,
    marginTop: 3,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: TNG.bgSecondary,
    borderRadius: TNG.radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 6,
  },
  statusCompleted: {
    backgroundColor: TNG.successLight,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '700',
    color: TNG.textMuted,
    letterSpacing: 0.5,
  },
  statusTextCompleted: {
    color: TNG.success,
  },
  txAmount: {
    color: TNG.success,
    fontSize: TNG.font.md,
    fontWeight: '800',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 40,
    color: TNG.textMuted,
    marginBottom: 12,
  },
  emptyText: {
    color: TNG.textPrimary,
    fontSize: TNG.font.md,
    fontWeight: '600',
  },
  emptySubtext: {
    color: TNG.textMuted,
    fontSize: TNG.font.sm,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
  },
});
