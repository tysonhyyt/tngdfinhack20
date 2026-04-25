import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { TNG } from '../lib/theme';
import { getWallet, getMerchant } from '../lib/wallet/store';

export default function RoleSelect() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [merchantId, setMerchantId] = useState('');

  useEffect(() => {
    setUserId(getWallet().userId);
    setMerchantId(getMerchant().merchantId);
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoMark}>
            <Text style={styles.logoT}>t</Text>
            <Text style={styles.logoNG}>ng</Text>
          </View>
          <Text style={styles.brand}>Touch 'n Go</Text>
          <Text style={styles.tagline}>Offline QR Payments</Text>

          {/* Device ID pill */}
          <View style={styles.deviceIdPill}>
            <Text style={styles.deviceIdLabel}>This device</Text>
            <Text style={styles.deviceId}>{userId || '...'}</Text>
          </View>
        </View>

        {/* Role Cards */}
        <View style={styles.cards}>
          {/* User / Pay card — blue bg */}
          <TouchableOpacity
            style={[styles.card, styles.cardUser]}
            onPress={() => router.push('/user')}
            activeOpacity={0.85}
          >
            <View style={styles.cardIcon}>
              <Text style={styles.cardIconText}>$</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitleLight}>Pay</Text>
              <Text style={styles.cardDescLight}>Scan merchant QR &amp; send payment</Text>
            </View>
            <Text style={styles.cardArrowLight}>›</Text>
          </TouchableOpacity>

          {/* Merchant / Receive card — white bg */}
          <TouchableOpacity
            style={[styles.card, styles.cardMerchant]}
            onPress={() => router.push('/merchant')}
            activeOpacity={0.85}
          >
            <View style={[styles.cardIcon, styles.cardIconOutline]}>
              <Text style={styles.cardIconTextBlue}>@</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitleDark}>Receive</Text>
              <Text style={styles.cardDescDark}>Accept payments at your store</Text>
              <Text style={styles.cardSubId}>{merchantId || '...'}</Text>
            </View>
            <Text style={styles.cardArrowBlue}>›</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>Powered by TNG Digital</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: TNG.blue,
  },
  container: {
    flex: 1,
    backgroundColor: TNG.bgSecondary,
  },
  header: {
    backgroundColor: TNG.blue,
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  logoMark: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: TNG.yellow,
    borderRadius: TNG.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 14,
  },
  logoT: {
    fontSize: 28,
    fontWeight: '900',
    color: TNG.blue,
  },
  logoNG: {
    fontSize: 22,
    fontWeight: '700',
    color: TNG.blue,
    marginBottom: 2,
  },
  brand: {
    fontSize: TNG.font.xl,
    fontWeight: '800',
    color: TNG.textWhite,
    letterSpacing: 0.3,
  },
  tagline: {
    fontSize: TNG.font.sm,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    marginBottom: 20,
  },
  deviceIdPill: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: TNG.radius.full,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  deviceIdLabel: {
    fontSize: TNG.font.xs,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  deviceId: {
    fontSize: TNG.font.sm,
    color: TNG.yellow,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  cards: {
    padding: 20,
    gap: 14,
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    borderRadius: TNG.radius.xl,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: TNG.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  cardUser: {
    backgroundColor: TNG.blue,
  },
  cardMerchant: {
    backgroundColor: TNG.bgCard,
    borderWidth: 1.5,
    borderColor: TNG.blue,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: TNG.radius.md,
    backgroundColor: TNG.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardIconOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: TNG.blue,
  },
  cardIconText: {
    fontSize: 22,
    fontWeight: '800',
    color: TNG.blue,
  },
  cardIconTextBlue: {
    fontSize: 22,
    fontWeight: '800',
    color: TNG.blue,
  },
  cardBody: {
    flex: 1,
  },
  cardTitleLight: {
    fontSize: TNG.font.lg,
    fontWeight: '700',
    color: TNG.textWhite,
  },
  cardDescLight: {
    fontSize: TNG.font.sm,
    color: 'rgba(255,255,255,0.72)',
    marginTop: 3,
    lineHeight: 18,
  },
  cardTitleDark: {
    fontSize: TNG.font.lg,
    fontWeight: '700',
    color: TNG.textPrimary,
  },
  cardDescDark: {
    fontSize: TNG.font.sm,
    color: TNG.textSecondary,
    marginTop: 3,
    lineHeight: 18,
  },
  cardSubId: {
    fontSize: TNG.font.xs,
    color: TNG.textMuted,
    fontFamily: 'monospace',
    marginTop: 6,
  },
  cardArrowLight: {
    fontSize: 28,
    color: TNG.yellow,
    fontWeight: '300',
    flexShrink: 0,
  },
  cardArrowBlue: {
    fontSize: 28,
    color: TNG.blue,
    fontWeight: '300',
    flexShrink: 0,
  },
  footer: {
    textAlign: 'center',
    fontSize: TNG.font.xs,
    color: TNG.textMuted,
    paddingBottom: 24,
  },
});
