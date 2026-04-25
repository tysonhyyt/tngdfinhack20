import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import QRCode from 'react-native-qrcode-svg';
import { startPeripheral, stopPeripheral, PeripheralStatus } from '../../lib/ble/peripheral';
import { getMerchant, addMerchantTransaction } from '../../lib/wallet/store';
import { PaymentRequest, PaymentConfirm } from '../../lib/ble/protocol';
import { generateTransactionId, formatCurrency } from '../../lib/utils';
import { BLE_SERVICE_UUID } from '../../lib/ble/constants';

export default function ReceiveScreen() {
  const [status, setStatus] = useState<PeripheralStatus>('idle');
  const [statusMsg, setStatusMsg] = useState('Starting BLE...');
  const [lastPayment, setLastPayment] = useState<PaymentRequest | null>(null);
  const [qrData, setQrData] = useState('');
  const merchant = getMerchant();

  useEffect(() => {
    // Generate QR data with merchant info
    const data = JSON.stringify({
      deviceId: 'ble-peripheral', // Will be actual device ID on real device
      merchantId: merchant.merchantId,
      merchantName: merchant.merchantName,
      serviceUUID: BLE_SERVICE_UUID,
    });
    setQrData(data);

    // Start BLE peripheral
    startPeripheral(merchant.merchantId, {
      onStatusChange: (s: PeripheralStatus, msg?: string) => {
        setStatus(s);
        setStatusMsg(msg || '');
      },
      onPaymentRequest: (request: PaymentRequest) => {
        setLastPayment(request);
      },
      onPaymentConfirmed: (confirm: PaymentConfirm) => {
        if (confirm.status === 'CONFIRMED' && lastPayment) {
          addMerchantTransaction({
            id: generateTransactionId(),
            amount: lastPayment.amount,
            currency: lastPayment.currency,
            timestamp: Date.now(),
            fromUserId: lastPayment.userId,
            toMerchantId: merchant.merchantId,
            status: 'completed',
          });
        }
      },
    });

    return () => {
      stopPeripheral();
    };
  }, []);

  const isWaiting = status === 'advertising' || status === 'idle';
  const isReceived = status === 'confirmed' || status === 'payment_received' || status === 'ack_sent';

  return (
    <View style={styles.container}>
      {isWaiting && (
        <>
          <View style={styles.qrContainer}>
            {qrData ? (
              <QRCode
                value={qrData}
                size={220}
                backgroundColor="#fff"
                color="#1a1a2e"
              />
            ) : (
              <ActivityIndicator size="large" color="#e94560" />
            )}
          </View>
          <Text style={styles.instruction}>
            Show this QR code to the payer
          </Text>
          <View style={styles.statusRow}>
            <ActivityIndicator color="#e94560" size="small" />
            <Text style={styles.statusText}>{statusMsg}</Text>
          </View>
        </>
      )}

      {isReceived && lastPayment && (
        <View style={styles.receivedContainer}>
          <Text style={styles.receivedIcon}>✅</Text>
          <Text style={styles.receivedTitle}>Payment Received!</Text>
          <Text style={styles.receivedAmount}>
            {formatCurrency(lastPayment.amount)}
          </Text>
          <Text style={styles.receivedFrom}>
            From: {lastPayment.userId}
          </Text>
          <Text style={styles.receivedTime}>
            {new Date(lastPayment.timestamp).toLocaleString()}
          </Text>
        </View>
      )}

      {status === 'error' && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>❌</Text>
          <Text style={styles.errorText}>{statusMsg}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#16213e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  qrContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  instruction: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 24,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    color: '#a0a0b0',
    fontSize: 14,
  },
  receivedContainer: {
    alignItems: 'center',
  },
  receivedIcon: {
    fontSize: 80,
    marginBottom: 16,
  },
  receivedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4ade80',
    marginBottom: 12,
  },
  receivedAmount: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  receivedFrom: {
    fontSize: 14,
    color: '#a0a0b0',
    marginBottom: 4,
  },
  receivedTime: {
    fontSize: 12,
    color: '#666',
  },
  errorContainer: {
    alignItems: 'center',
  },
  errorIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#e94560',
    textAlign: 'center',
  },
});
