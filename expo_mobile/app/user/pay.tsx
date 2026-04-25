import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import QRCode from 'react-native-qrcode-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { getWallet, deductBalance, addUserTransaction, addToSyncQueue } from '../../lib/wallet/store';
import { getIdentity, signPayload, verifySignature, verifyCert } from '../../lib/crypto/identity';
import { formatCurrency, generateTransactionId } from '../../lib/utils';

type Step = 'enter_amount' | 'confirm' | 'receipt' | 'scan_ack' | 'done';

export default function PayScreen() {
  const router = useRouter();
  const { merchantId, merchantName, merchantPubKey, merchantCert } = useLocalSearchParams<{
    merchantId: string;
    merchantName: string;
    merchantPubKey: string;
    merchantCert: string;
  }>();

  const [step, setStep] = useState<Step>('enter_amount');
  const [amount, setAmount] = useState('');
  const [txId, setTxId] = useState('');
  const [receiptPayload, setReceiptPayload] = useState('');
  const [ackError, setAckError] = useState('');
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const wallet = getWallet();
  const payAmount = parseFloat(amount) || 0;

  const handleConfirmPay = async () => {
    if (payAmount <= 0 || payAmount > wallet.balance) return;

    const id = generateTransactionId();
    const identity = await getIdentity();
    if (!identity) return;

    const txPayload = {
      txId: id,
      amount: payAmount,
      currency: 'MYR',
      fromUserId: wallet.userId,
      toMerchantId: merchantId || 'unknown',
      timestamp: Date.now(),
    };

    const signature = signPayload(txPayload, identity.privKeyHex);

    const { success } = deductBalance(payAmount);
    if (!success) return;

    const tx = {
      id,
      amount: payAmount,
      currency: 'MYR',
      timestamp: txPayload.timestamp,
      fromUserId: wallet.userId,
      toMerchantId: merchantId || 'unknown',
      status: 'completed' as const,
      signature,
      userPubKey: identity.pubKeyHex,
      cert: identity.cert,
      syncStatus: 'pending_sync' as const,
    };
    addUserTransaction(tx);
    addToSyncQueue({ txId: id, side: 'user', tx, queuedAt: Date.now() });

    const receipt = JSON.stringify({
      type: 'PAYMENT_RECEIPT',
      status: 'CONFIRMED',
      txId: id,
      amount: payAmount,
      currency: 'MYR',
      userId: wallet.userId,
      merchantId: merchantId || 'unknown',
      timestamp: txPayload.timestamp,
      signature,
      userPubKey: identity.pubKeyHex,
      cert: identity.cert,
    });

    setTxId(id);
    setReceiptPayload(receipt);
    setStep('receipt');
  };

  const handleAckScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    setAckError('');

    try {
      const ack = JSON.parse(data);
      if (ack.type !== 'PAYMENT_ACK' || ack.txId !== txId) {
        setAckError('Invalid ACK');
        setScanned(false);
        return;
      }

      // Verify merchant's ACK signature
      if (ack.ackSignature && ack.merchantPubKey) {
        const valid = verifySignature(
          { txId: ack.txId, merchantId: ack.merchantId },
          ack.ackSignature,
          ack.merchantPubKey
        );
        if (!valid) {
          setAckError('ACK signature invalid');
          setScanned(false);
          return;
        }
      }

      setStep('done');
    } catch {
      setAckError('Failed to read ACK');
      setScanned(false);
    }
  };

  // Step 1: Enter amount
  if (step === 'enter_amount') {
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
          style={[styles.payButton, payAmount <= 0 && styles.buttonDisabled]}
          onPress={() => setStep('confirm')}
          disabled={payAmount <= 0}
        >
          <Text style={styles.payButtonText}>Next</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Step 2: Confirm
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
          style={[styles.payButton, (insufficient || payAmount <= 0) && styles.buttonDisabled]}
          onPress={handleConfirmPay}
          disabled={insufficient || payAmount <= 0}
        >
          <Text style={styles.payButtonText}>Confirm & Pay</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={() => setStep('enter_amount')}>
          <Text style={styles.cancelText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Step 3: Show signed receipt QR for merchant to scan
  if (step === 'receipt') {
    return (
      <View style={styles.container}>
        <Text style={styles.doneIcon}>✅</Text>
        <Text style={styles.doneTitle}>Payment Sent!</Text>
        <Text style={styles.amountDisplay}>{formatCurrency(payAmount)}</Text>
        <View style={styles.qrContainer}>
          <QRCode value={receiptPayload} size={220} backgroundColor="#fff" color="#1a1a2e" />
        </View>
        <Text style={styles.instruction}>Show this to merchant to scan</Text>
        <TouchableOpacity style={styles.payButton} onPress={() => { setScanned(false); setStep('scan_ack'); }}>
          <Text style={styles.payButtonText}>Scan Merchant ACK</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Step 4: Scan merchant ACK QR
  if (step === 'scan_ack') {
    if (!permission) return <View style={styles.container}><ActivityIndicator color="#e94560" size="large" /></View>;
    if (!permission.granted) {
      return (
        <View style={styles.container}>
          <Text style={styles.instruction}>Camera permission needed</Text>
          <TouchableOpacity style={styles.payButton} onPress={requestPermission}>
            <Text style={styles.payButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.container}>
        <CameraView
          style={styles.camera}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={scanned ? undefined : handleAckScanned}
        >
          <View style={styles.overlay}>
            <View style={styles.scanFrame} />
            <Text style={styles.scanText}>Scan Merchant's ACK QR</Text>
            {ackError ? <Text style={styles.errorText}>{ackError}</Text> : null}
          </View>
        </CameraView>
        <TouchableOpacity style={styles.skipButton} onPress={() => setStep('done')}>
          <Text style={styles.cancelText}>Skip (demo)</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Step 5: Done
  return (
    <View style={styles.container}>
      <Text style={styles.doneIcon}>🎉</Text>
      <Text style={styles.doneTitle}>Complete!</Text>
      <Text style={styles.amountDisplay}>{formatCurrency(payAmount)}</Text>
      <Text style={styles.balanceText}>New balance: {formatCurrency(wallet.balance)}</Text>
      <TouchableOpacity
        style={styles.payButton}
        onPress={() => router.replace({ pathname: '/user/result', params: { success: 'true', amount: payAmount.toString() } })}
      >
        <Text style={styles.payButtonText}>Done</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#16213e', padding: 20, alignItems: 'center', justifyContent: 'center' },
  merchantInfo: { alignItems: 'center', marginBottom: 24 },
  merchantLabel: { fontSize: 14, color: '#a0a0b0' },
  merchantName: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginTop: 4 },
  amountSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  currency: { fontSize: 28, color: '#a0a0b0', marginRight: 8 },
  amountInput: { fontSize: 48, fontWeight: 'bold', color: '#fff', minWidth: 120, textAlign: 'center' },
  amountDisplay: { fontSize: 42, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  quickAmounts: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 32 },
  quickBtn: { backgroundColor: '#0f3460', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16 },
  quickBtnText: { color: '#fff', fontSize: 14 },
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
  camera: { flex: 1, width: '100%' },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  scanFrame: { width: 250, height: 250, borderWidth: 2, borderColor: '#e94560', borderRadius: 12 },
  scanText: { color: '#fff', fontSize: 16, marginTop: 20 },
  skipButton: { padding: 16 },
});
