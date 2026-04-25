import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { getMerchant } from '../../lib/wallet/store';
import { formatCurrency } from '../../lib/utils';
import { TNG } from '../../lib/theme';

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
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {/* Merchant Card */}
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.storeIconWrap}>
            <Text style={styles.storeIcon}>#</Text>
          </View>
          <View>
            <Text style={styles.storeLabel}>Merchant Account</Text>
            <Text style={styles.storeName}>{merchantName}</Text>
          </View>
        </View>
        <View style={styles.cardDivider} />
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{formatCurrency(totalReceived)}</Text>
            <Text style={styles.statLabel}>Total Received</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{txCount}</Text>
            <Text style={styles.statLabel}>Transactions</Text>
          </View>
        </View>
        <View style={styles.yellowStrip} />
      </View>

      {/* Actions */}
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => router.push('/merchant/receive')}
        activeOpacity={0.85}
      >
        <View style={styles.btnIcon}>
          <Text style={styles.btnIconText}>QR</Text>
        </View>
        <Text style={styles.primaryButtonText}>Start Receiving Payments</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => router.push('/merchant/history')}
        activeOpacity={0.85}
      >
        <Text style={styles.secondaryButtonText}>Transaction History</Text>
      </TouchableOpacity>
    </ScrollView>
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
  card: {
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
  cardTop: {
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  storeIconWrap: {
    width: 48,
    height: 48,
    borderRadius: TNG.radius.md,
    backgroundColor: TNG.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeIcon: {
    fontSize: 22,
    fontWeight: '800',
    color: TNG.blue,
  },
  storeLabel: {
    fontSize: TNG.font.xs,
    color: 'rgba(255,255,255,0.65)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  storeName: {
    fontSize: TNG.font.md,
    fontWeight: '700',
    color: TNG.textWhite,
    marginTop: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 24,
  },
  statsRow: {
    flexDirection: 'row',
    padding: 24,
    alignItems: 'center',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: TNG.font['2xl'],
    fontWeight: '800',
    color: TNG.textWhite,
  },
  statLabel: {
    fontSize: TNG.font.xs,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  yellowStrip: {
    height: 6,
    backgroundColor: TNG.yellow,
  },
  primaryButton: {
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
  btnIcon: {
    backgroundColor: TNG.blue,
    borderRadius: TNG.radius.sm,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnIconText: {
    fontSize: 11,
    fontWeight: '800',
    color: TNG.yellow,
    letterSpacing: 0.5,
  },
  primaryButtonText: {
    fontSize: TNG.font.md,
    fontWeight: '700',
    color: TNG.textOnYellow,
  },
  secondaryButton: {
    backgroundColor: TNG.bgCard,
    borderRadius: TNG.radius.lg,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: TNG.blue,
  },
  secondaryButtonText: {
    fontSize: TNG.font.base,
    fontWeight: '600',
    color: TNG.blue,
  },
});
