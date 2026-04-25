import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import QRCode from 'react-native-qrcode-svg';
import { getWallet, deductBalance, addUserTransaction } from '../../lib/wallet/store';
import { formatCurrency, generateTransactionId } from '../../lib/utils';

type Step = 'confirm' | 'receipt';

export default function PayScreen() {
  const router = useRouter();
  const { merchantId, merchantName, amount: requestedAmount } = useLocalSearchParams<{
    merchantId: string;
    merchantName: string;
    amount: string;
  }>();

  const [step, setStep] = useState<Step>('confirm');
  const [txId, setTxId] = useState('');
  const wallet = getWallet();
  const payAmount = parseFloat(requestedAmount || '0');

  const handleConfirmPay = () => {
    if (payAmount <= 0) return;
    if (payAmount > wallet.balance) return;

    const id = generateTransactionId();
    const { success } = deductBalance(payAmount);
    if (success) {
      addUserTransaction({
        id,
        amount: payAmount,
        currency: 'MYR',
        timestamp: Date.now(),
        fromUserId: wallet.userId,
        toMerchantId: merchantId || 'unknown',
        status: 'completed',
      });
      setTxId(id);
      setStep('receipt');
    }
  };

  // Receipt QR payload — merchant scans this to confirm
  const receiptPayload = JSON.stringify({
    type: 'PAYMENT_RECEIPT',
    status: 'CONFIRMED',
    txId,
    amount: payAmount,
    currency: 'MYR',
    userId: wallet.userId,
    merchantId,
    timestamp: Date.now(),
  });

  // Step 1: Confirm payment
  if (step === 'confirm') {
    const insufficient = payAmount > wallet.balance;
    return (
      <View style={styles.container}>
        <View style={styles.merchantInfo}>
          <Text style={styles.merchantLabel}>Paying to</Text>
          <Text style={styles.merchantName}>{merchantName || 'Merchant'}</Text>
        </View>

        <Text style={styles.amountDisplay}>{formatCurrency(payAmount)}</Text>
        <Text style={styles.balanceText}>Balance: {formatCurrency(wallet.balance)}</Text>

        {insufficient && <Text style={styles.errorText}>Insufficient balance</Text>}

        <TouchableOpacity
          style={[styles.payButton, insufficient && styles.buttonDisabled]}
          onPress={handleConfirmPay}
          disabled={insufficient || payAmount <= 0}
        >
          <Text style={styles.payButtonText}>Confirm & Pay</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Step 2: Show receipt QR for merchant to scan
  return (
    <View style={styles.container}>
      <Text style={styles.doneIcon}>✅</Text>
      <Text style={styles.doneTitle}>Payment Sent!</Text>
      <Text style={styles.amountDisplay}>{formatCurrency(payAmount)}</Text>

      <View style={styles.qrContainer}>
        <QRCode value={receiptPayload} size={220} backgroundColor="#fff" color="#1a1a2e" />
      </View>
      <Text style={styles.instruction}>Show this to merchant to complete</Text>

      <TouchableOpacity
        style={styles.doneButton}
        onPress={() => router.replace({ pathname: '/user/result', params: { success: 'true', amount: payAmount.toString() } })}
      >
        <Text style={styles.doneButtonText}>Done</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#16213e', padding: 20, alignItems: 'center', justifyContent: 'center' },
  merchantInfo: { alignItems: 'center', marginBottom: 24 },
  merchantLabel: { fontSize: 14, color: '#a0a0b0' },
  merchantName: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginTop: 4 },
  amountDisplay: { fontSize: 42, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  balanceText: { textAlign: 'center', color: '#666', fontSize: 14, marginBottom: 32 },
  errorText: { color: '#e94560', fontSize: 14, marginBottom: 16 },
  payButton: { backgroundColor: '#e94560', borderRadius: 12, padding: 16, paddingHorizontal: 60 },
  payButtonText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  buttonDisabled: { opacity: 0.4 },
  cancelButton: { marginTop: 16 },
  cancelText: { color: '#a0a0b0', fontSize: 14 },
  doneIcon: { fontSize: 60, marginBottom: 12 },
  doneTitle: { fontSize: 24, fontWeight: 'bold', color: '#4ade80', marginBottom: 8 },
  qrContainer: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginVertical: 20 },
  instruction: { fontSize: 14, color: '#a0a0b0', marginBottom: 24, textAlign: 'center' },
  doneButton: { backgroundColor: '#0f3460', borderRadius: 12, padding: 14, paddingHorizontal: 60 },
  doneButtonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
});
