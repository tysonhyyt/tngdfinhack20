import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { connectToMerchant, sendPayment, disconnectFromMerchant, CentralStatus } from '../../lib/ble/central';
import { getWallet, deductBalance, addUserTransaction } from '../../lib/wallet/store';
import { formatCurrency, generateTransactionId } from '../../lib/utils';
import { PaymentAck } from '../../lib/ble/protocol';

export default function PayScreen() {
  const router = useRouter();
  const { deviceId, merchantId, merchantName } = useLocalSearchParams<{
    deviceId: string;
    merchantId: string;
    merchantName: string;
  }>();

  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<CentralStatus>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [processing, setProcessing] = useState(false);
  const wallet = getWallet();

  const handlePay = async () => {
    const payAmount = parseFloat(amount);
    if (!payAmount || payAmount <= 0) return;
    if (payAmount > wallet.balance) {
      setStatusMsg('Insufficient balance');
      return;
    }

    setProcessing(true);

    const callbacks = {
      onStatusChange: (s: CentralStatus, msg?: string) => {
        setStatus(s);
        setStatusMsg(msg || '');
      },
      onAckReceived: (_ack: PaymentAck) => {},
      onComplete: (success: boolean) => {
        if (success) {
          const { success: deducted } = deductBalance(payAmount);
          if (deducted) {
            addUserTransaction({
              id: generateTransactionId(),
              amount: payAmount,
              currency: 'MYR',
              timestamp: Date.now(),
              fromUserId: wallet.userId,
              toMerchantId: merchantId || 'unknown',
              status: 'completed',
            });
          }
          disconnectFromMerchant();
          router.replace({
            pathname: '/user/result',
            params: { success: 'true', amount: payAmount.toString() },
          });
        } else {
          setProcessing(false);
          router.replace({
            pathname: '/user/result',
            params: { success: 'false', amount: payAmount.toString() },
          });
        }
      },
    };

    // Connect then send
    const device = await connectToMerchant(deviceId!, callbacks);
    if (device) {
      await sendPayment(payAmount, wallet.userId, callbacks);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.merchantInfo}>
        <Text style={styles.merchantLabel}>Paying to</Text>
        <Text style={styles.merchantName}>{merchantName || 'Merchant'}</Text>
      </View>

      <View style={styles.amountSection}>
        <Text style={styles.currency}>RM</Text>
        <TextInput
          style={styles.amountInput}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor="#666"
          value={amount}
          onChangeText={setAmount}
          editable={!processing}
          autoFocus
        />
      </View>

      <Text style={styles.balanceText}>
        Balance: {formatCurrency(wallet.balance)}
      </Text>

      {/* Quick amounts */}
      <View style={styles.quickAmounts}>
        {[5, 10, 20, 50].map((q) => (
          <TouchableOpacity
            key={q}
            style={styles.quickBtn}
            onPress={() => setAmount(q.toString())}
            disabled={processing}
          >
            <Text style={styles.quickBtnText}>RM{q}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {statusMsg ? (
        <View style={styles.statusContainer}>
          {processing && <ActivityIndicator color="#e94560" />}
          <Text style={styles.statusText}>{statusMsg}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.payButton, processing && styles.payButtonDisabled]}
        onPress={handlePay}
        disabled={processing || !amount}
      >
        <Text style={styles.payButtonText}>
          {processing ? 'Processing...' : `Pay ${amount ? formatCurrency(parseFloat(amount) || 0) : ''}`}
        </Text>
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
  merchantInfo: {
    alignItems: 'center',
    marginBottom: 32,
  },
  merchantLabel: {
    fontSize: 14,
    color: '#a0a0b0',
  },
  merchantName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  amountSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  currency: {
    fontSize: 28,
    color: '#a0a0b0',
    marginRight: 8,
  },
  amountInput: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    minWidth: 120,
    textAlign: 'center',
  },
  balanceText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    marginBottom: 24,
  },
  quickAmounts: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 32,
  },
  quickBtn: {
    backgroundColor: '#0f3460',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  quickBtnText: {
    color: '#fff',
    fontSize: 14,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  statusText: {
    color: '#a0a0b0',
    fontSize: 14,
  },
  payButton: {
    backgroundColor: '#e94560',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
});
