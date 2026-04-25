import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { formatCurrency } from '../../lib/utils';

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
        <Text style={styles.icon}>{isSuccess ? '✅' : '❌'}</Text>
      </View>

      <Text style={[styles.title, !isSuccess && styles.failTitle]}>
        {isSuccess ? 'Payment Successful!' : 'Payment Failed'}
      </Text>

      <Text style={styles.amount}>{formatCurrency(payAmount)}</Text>

      {isSuccess && (
        <Text style={styles.subtitle}>
          Transaction recorded in your wallet
        </Text>
      )}

      {!isSuccess && (
        <Text style={styles.subtitle}>
          Please try again or check BLE connection
        </Text>
      )}

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.replace('/user')}
      >
        <Text style={styles.buttonText}>Back to Wallet</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#16213e',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    marginBottom: 24,
  },
  icon: {
    fontSize: 80,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4ade80',
    marginBottom: 12,
  },
  failTitle: {
    color: '#e94560',
  },
  amount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#a0a0b0',
    marginBottom: 40,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#0f3460',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
