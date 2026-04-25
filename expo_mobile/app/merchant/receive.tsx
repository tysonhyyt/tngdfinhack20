import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { getMerchant, addMerchantTransaction } from '../../lib/wallet/store';
import { formatCurrency, generateTransactionId } from '../../lib/utils';

type Step = 'enter_amount' | 'show_qr' | 'scan_receipt' | 'done';

export default function ReceiveScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('enter_amount');
  const [amount, setAmount] = useState('');
  const [receiptData, setReceiptData] = useState<any>(null);
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const merchant = getMerchant();

  const payAmount = parseFloat(amount) || 0;

  // QR payload merchant shows to user
  const qrPayload = JSON.stringify({
    type: 'PAYMENT_REQUEST',
    merchantId: merchant.merchantId,
    merchantName: merchant.merchantName,
    amount: payAmount,
    currency: 'MYR',
    timestamp: Date.now(),
  });

  const handleGenerateQR = () => {
    if (payAmount <= 0) return;
    setStep('show_qr');
  };

  const handleWaitForReceipt = () => {
    setScanned(false);
    setStep('scan_receipt');
  };

  const handleReceiptScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    try {
      const receipt = JSON.parse(data);
      if (receipt.type === 'PAYMENT_RECEIPT' && receipt.status === 'CONFIRMED') {
        setReceiptData(receipt);
        addMerchantTransaction({
          id: receipt.txId || generateTransactionId(),
          amount: receipt.amount,
          currency: receipt.currency || 'MYR',
          timestamp: Date.now(),
          fromUserId: receipt.userId || 'unknown',
          toMerchantId: merchant.merchantId,
          status: 'completed',
        });
        setStep('done');
      } else {
        setScanned(false); // Let them try again
      }
    } catch {
      setScanned(false);
    }
  };

  // Step 1: Enter amount
  if (step === 'enter_amount') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Receive Payment</Text>
        <View style={styles.amountSection}>
          <Text style={styles.currency}>RM</Text>
          <TextInput
            style={styles.amountInput}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#666"
            value={amount}
            onChangeText={setAmount}
            autoFocus
          />
        </View>
        <View style={styles.quickAmounts}>
          {[5, 10, 20, 50].map((q) => (
            <TouchableOpacity key={q} style={styles.quickBtn} onPress={() => setAmount(q.toString())}>
              <Text style={styles.quickBtnText}>RM{q}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={[styles.mainButton, payAmount <= 0 && styles.buttonDisabled]}
          onPress={handleGenerateQR}
          disabled={payAmount <= 0}
        >
          <Text style={styles.mainButtonText}>Generate QR Code</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Step 2: Show QR for user to scan
  if (step === 'show_qr') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Show to Payer</Text>
        <Text style={styles.amountDisplay}>{formatCurrency(payAmount)}</Text>
        <View style={styles.qrContainer}>
          <QRCode value={qrPayload} size={220} backgroundColor="#fff" color="#1a1a2e" />
        </View>
        <Text style={styles.instruction}>Ask payer to scan this QR code</Text>
        <TouchableOpacity style={styles.mainButton} onPress={handleWaitForReceipt}>
          <Text style={styles.mainButtonText}>Scan Receipt QR</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep('enter_amount')}>
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Step 3: Scan receipt QR from user
  if (step === 'scan_receipt') {
    if (!permission) {
      return <View style={styles.container}><ActivityIndicator color="#e94560" size="large" /></View>;
    }
    if (!permission.granted) {
      return (
        <View style={styles.container}>
          <Text style={styles.instruction}>Camera permission needed</Text>
          <TouchableOpacity style={styles.mainButton} onPress={requestPermission}>
            <Text style={styles.mainButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.container}>
        <CameraView
          style={styles.camera}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={scanned ? undefined : handleReceiptScanned}
        >
          <View style={styles.overlay}>
            <View style={styles.scanFrame} />
            <Text style={styles.scanText}>Scan Payer's Receipt QR</Text>
          </View>
        </CameraView>
      </View>
    );
  }

  // Step 4: Done
  return (
    <View style={styles.container}>
      <Text style={styles.doneIcon}>✅</Text>
      <Text style={styles.doneTitle}>Payment Received!</Text>
      <Text style={styles.amountDisplay}>{formatCurrency(receiptData?.amount || payAmount)}</Text>
      <Text style={styles.doneFrom}>From: {receiptData?.userId || 'User'}</Text>
      <TouchableOpacity style={styles.mainButton} onPress={() => router.replace('/merchant')}>
        <Text style={styles.mainButtonText}>Back to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#16213e', alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 24 },
  amountSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  currency: { fontSize: 28, color: '#a0a0b0', marginRight: 8 },
  amountInput: { fontSize: 48, fontWeight: 'bold', color: '#fff', minWidth: 120, textAlign: 'center' },
  amountDisplay: { fontSize: 42, fontWeight: 'bold', color: '#fff', marginBottom: 20 },
  quickAmounts: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 32 },
  quickBtn: { backgroundColor: '#0f3460', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16 },
  quickBtnText: { color: '#fff', fontSize: 14 },
  qrContainer: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 24 },
  instruction: { fontSize: 16, color: '#a0a0b0', marginBottom: 24, textAlign: 'center' },
  mainButton: { backgroundColor: '#e94560', borderRadius: 12, padding: 16, paddingHorizontal: 40, marginTop: 8 },
  mainButtonText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  buttonDisabled: { opacity: 0.4 },
  secondaryButton: { marginTop: 16 },
  secondaryButtonText: { color: '#a0a0b0', fontSize: 14 },
  camera: { flex: 1, width: '100%', borderRadius: 12 },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  scanFrame: { width: 250, height: 250, borderWidth: 2, borderColor: '#e94560', borderRadius: 12 },
  scanText: { color: '#fff', fontSize: 16, marginTop: 20 },
  doneIcon: { fontSize: 80, marginBottom: 16 },
  doneTitle: { fontSize: 24, fontWeight: 'bold', color: '#4ade80', marginBottom: 12 },
  doneFrom: { fontSize: 14, color: '#a0a0b0', marginBottom: 32 },
});
