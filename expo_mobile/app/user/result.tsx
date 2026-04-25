import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { formatCurrency } from '../../lib/utils';
import { TNG } from '../../lib/theme';

export default function ResultScreen() {
  const router = useRouter();
  const { success, amount } = useLocalSearchParams<{
    success: string;
    amount: string;
  }>();

  const isSuccess = success === 'true';
  const payAmount = parseFloat(amount || '0');

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <View style={[styles.icon, isSuccess ? styles.iconSuccess : styles.iconFail]}>
          <Text style={styles.iconText}>{isSuccess ? '✓' : '✕'}</Text>
        </View>
      </View>

      <Text style={[styles.title, !isSuccess && styles.failTitle]}>
        {isSuccess ? 'Payment Successful!' : 'Payment Failed'}
      </Text>

      <Text style={styles.amount}>{formatCurrency(payAmount)}</Text>

      <Text style={styles.subtitle}>
        {isSuccess ? 'Transaction recorded in your wallet' : 'Please try again'}
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.replace('/user')}
        activeOpacity={0.85}
      >
        <Text style={styles.buttonText}>Back to Wallet</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TNG.bgSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    marginBottom: 24,
  },
  icon: {
    width: 88,
    height: 88,
    borderRadius: TNG.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSuccess: {
    backgroundColor: TNG.success,
  },
  iconFail: {
    backgroundColor: TNG.error,
  },
  iconText: {
    fontSize: 40,
    color: TNG.textWhite,
    fontWeight: '800',
  },
  title: {
    fontSize: TNG.font.xl,
    fontWeight: '800',
    color: TNG.success,
    marginBottom: 8,
  },
  failTitle: {
    color: TNG.error,
  },
  amount: {
    fontSize: TNG.font['3xl'],
    fontWeight: '800',
    color: TNG.textPrimary,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: TNG.font.sm,
    color: TNG.textMuted,
    marginBottom: 48,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    backgroundColor: TNG.yellow,
    borderRadius: TNG.radius.lg,
    paddingVertical: 16,
    paddingHorizontal: 48,
  },
  buttonText: {
    color: TNG.textOnYellow,
    fontSize: TNG.font.base,
    fontWeight: '700',
  },
});
