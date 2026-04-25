import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { getWallet, getSyncQueue, updateWalletBalance, markSynced, mergeWalletTransactions } from '../../lib/wallet/store';
import { apiPushTransactions, apiPullAccount } from '../../lib/api/client';
import { formatCurrency } from '../../lib/utils';
import { TNG } from '../../lib/theme';

export default function UserHome() {
  const router = useRouter();
  const [offlineBalance, setOfflineBalance] = useState(0);
  const [userId, setUserId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [pushing, setPushing] = useState(false);
  const [pulling, setPulling] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const wallet = getWallet();
      setOfflineBalance(wallet.offlineBalance);
      setUserId(wallet.userId);
      setDisplayName(wallet.displayName);
    }, [])
  );

  const handlePush = async () => {
    setPushing(true);
    try {
      const wallet = getWallet();
      const queue = getSyncQueue().filter((item) => item.side === 'user');
      if (queue.length === 0) {
        Alert.alert('Nothing to push', 'No pending transactions.');
        return;
      }
      const res = await apiPushTransactions({ deviceId: wallet.userId, transactions: queue });
      res.syncedTxIds.forEach((id) => markSynced(id));
      Alert.alert('Pushed', `${res.syncedTxIds.length} transaction(s) sent to server.`);
    } catch {
      Alert.alert('Push failed', 'Could not reach server. Try again later.');
    } finally {
      setPushing(false);
    }
  };

  const handlePull = async () => {
    setPulling(true);
    try {
      const wallet = getWallet();
      const res = await apiPullAccount({ deviceId: wallet.userId, role: 'user' });
      updateWalletBalance(res.offlineBalance);
      mergeWalletTransactions(res.transactions);
      setOfflineBalance(res.offlineBalance);
      Alert.alert('Updated', `Balance: ${formatCurrency(res.offlineBalance)}, ${res.transactions.length} tx(s) synced.`);
    } catch {
      Alert.alert('Pull failed', 'Could not reach server. Try again later.');
    } finally {
      setPulling(false);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceCardInner}>
          <Text style={styles.balanceLabel}>Offline Balance</Text>
          <Text style={styles.balance}>{formatCurrency(offlineBalance)}</Text>
          <View style={styles.divider} />
          {displayName ? <Text style={styles.displayName}>{displayName}</Text> : null}
          <Text style={styles.userId}>ID: {userId}</Text>
        </View>
        {/* Yellow accent strip */}
        <View style={styles.yellowStrip} />
      </View>

      {/* Quick Action */}
      <TouchableOpacity
        style={styles.payButton}
        onPress={() => router.push('/user/scan')}
        activeOpacity={0.85}
      >
        <View style={styles.payButtonIcon}>
          <Text style={styles.payButtonIconText}>QR</Text>
        </View>
        <Text style={styles.payButtonText}>Scan & Pay</Text>
      </TouchableOpacity>

      {/* Push / Pull row */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionButton, pushing && styles.actionButtonDisabled]}
          onPress={handlePush}
          disabled={pushing}
          activeOpacity={0.85}
        >
          {pushing ? (
            <ActivityIndicator size="small" color={TNG.blue} />
          ) : (
            <Text style={styles.actionButtonText}>Push Txs</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, pulling && styles.actionButtonDisabled]}
          onPress={handlePull}
          disabled={pulling}
          activeOpacity={0.85}
        >
          {pulling ? (
            <ActivityIndicator size="small" color={TNG.blue} />
          ) : (
            <Text style={styles.actionButtonText}>Pull Balance</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Recent Transactions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        <RecentTransactions />
      </View>
    </ScrollView>
  );
}

function RecentTransactions() {
  const wallet = getWallet();
  const txns = wallet.transactions.slice(0, 5);

  if (txns.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>—</Text>
        <Text style={styles.emptyText}>No transactions yet</Text>
        <Text style={styles.emptySubtext}>Tap Scan & Pay to make your first payment</Text>
      </View>
    );
  }

  return (
    <View style={styles.txList}>
      {txns.map((tx) => (
        <View key={tx.id} style={styles.txRow}>
          <View style={styles.txIconWrap}>
            <View style={styles.txIcon}>
              <Text style={styles.txIconText}>↑</Text>
            </View>
          </View>
          <View style={styles.txInfo}>
            <Text style={styles.txMerchant} numberOfLines={1}>{tx.toMerchantId}</Text>
            <Text style={styles.txDate}>{new Date(tx.timestamp).toLocaleString()}</Text>
          </View>
          <Text style={styles.txAmount}>-{formatCurrency(tx.amount)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: TNG.bgSecondary,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  balanceCard: {
    backgroundColor: TNG.blue,
    borderRadius: TNG.radius.xl,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: TNG.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 6,
  },
  balanceCardInner: {
    padding: 24,
  },
  yellowStrip: {
    height: 6,
    backgroundColor: TNG.yellow,
  },
  balanceLabel: {
    fontSize: TNG.font.sm,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  balance: {
    fontSize: TNG.font['3xl'],
    fontWeight: '800',
    color: TNG.textWhite,
    marginTop: 8,
    letterSpacing: -0.5,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 14,
  },
  displayName: {
    fontSize: TNG.font.sm,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
    marginBottom: 4,
  },
  userId: {
    fontSize: TNG.font.xs,
    color: 'rgba(255,255,255,0.55)',
    fontFamily: 'monospace',
  },
  payButton: {
    backgroundColor: TNG.yellow,
    borderRadius: TNG.radius.lg,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 12,
    shadowColor: 'rgba(255,215,0,0.4)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  payButtonIcon: {
    backgroundColor: TNG.blue,
    borderRadius: TNG.radius.sm,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonIconText: {
    fontSize: 11,
    fontWeight: '800',
    color: TNG.yellow,
    letterSpacing: 0.5,
  },
  payButtonText: {
    fontSize: TNG.font.md,
    fontWeight: '700',
    color: TNG.textOnYellow,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    backgroundColor: TNG.bgCard,
    borderRadius: TNG.radius.lg,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: TNG.blue,
    minHeight: 48,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    fontSize: TNG.font.sm,
    fontWeight: '600',
    color: TNG.blue,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: TNG.font.base,
    fontWeight: '700',
    color: TNG.textPrimary,
    marginBottom: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    backgroundColor: TNG.bgCard,
    borderRadius: TNG.radius.lg,
    padding: 32,
    borderWidth: 1,
    borderColor: TNG.border,
  },
  emptyIcon: {
    fontSize: 32,
    color: TNG.textMuted,
    marginBottom: 8,
  },
  emptyText: {
    color: TNG.textPrimary,
    fontSize: TNG.font.base,
    fontWeight: '600',
  },
  emptySubtext: {
    color: TNG.textMuted,
    fontSize: TNG.font.sm,
    marginTop: 4,
    textAlign: 'center',
  },
  txList: {
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
    width: 36,
    height: 36,
    borderRadius: TNG.radius.full,
    backgroundColor: TNG.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txIconText: {
    fontSize: 16,
    color: TNG.error,
    fontWeight: '700',
  },
  txInfo: {
    flex: 1,
  },
  txMerchant: {
    color: TNG.textPrimary,
    fontSize: TNG.font.base,
    fontWeight: '600',
  },
  txDate: {
    color: TNG.textMuted,
    fontSize: TNG.font.xs,
    marginTop: 2,
  },
  txAmount: {
    color: TNG.error,
    fontSize: TNG.font.base,
    fontWeight: '700',
  },
});
