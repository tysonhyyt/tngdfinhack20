import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { getMerchant, addMerchantTransaction, addToSyncQueue } from '../../lib/wallet/store';
import { getIdentity, verifySignature, verifyCert, signPayload } from '../../lib/crypto/identity';
import { formatCurrency, generateTransactionId } from '../../lib/utils';

type Step = 'show_qr' | 'scan_receipt' | 'show_ack' | 'done';

export default function ReceiveScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('show_qr');
  const [receiptData, setReceiptData] = useState<any>(null);
  const [ackPayload, setAckPayload] = useState('');
  const [scanned, setScanned] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [permission, requestPermission] = useCameraPermissions();

  const merchant = getMerchant();

  // Merchant QR: identity only, no amount
  const qrPayload = JSON.stringify({
    type: 'PAYMENT_REQUEST',
    merchantId: merchant.merchantId,
    merchantName: merchant.merchantName,
    merchantPubKey: merchant.pubKeyHex,
    cert: merchant.cert,
  });

  const handleWaitForReceipt = () => {
    setScanned(false);
    setVerifyError('');
    setStep('scan_receipt');
  };

  const handleReceiptScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    setVerifyError('');

    try {
      const receipt = JSON.parse(data);
      if (receipt.type !== 'PAYMENT_RECEIPT' || receipt.status !== 'CONFIRMED') {
        setVerifyError('Invalid receipt type');
        setScanned(false);
        return;
      }

      // 1. Verify user cert is self-consistent
      const certCheck = verifyCert(receipt.cert);
      if (!certCheck.valid) {
        setVerifyError('Invalid user certificate');
        setScanned(false);
        return;
      }

      // 2. Verify tx signature
      const txPayload = {
        txId: receipt.txId,
        amount: receipt.amount,
        currency: receipt.currency,
        fromUserId: receipt.userId,
        toMerchantId: receipt.merchantId,
        timestamp: receipt.timestamp,
      };
      const sigValid = verifySignature(txPayload, receipt.signature, certCheck.pubKeyHex);
      if (!sigValid) {
        setVerifyError('Signature verification failed');
        setScanned(false);
        return;
      }

      // 3. Record transaction
      const tx = {
        id: receipt.txId || generateTransactionId(),
        amount: receipt.amount,
        currency: receipt.currency || 'MYR',
        timestamp: Date.now(),
        fromUserId: receipt.userId || 'unknown',
        toMerchantId: merchant.merchantId,
        status: 'completed' as const,
        signature: receipt.signature,
        userPubKey: certCheck.pubKeyHex,
        cert: receipt.cert,
        syncStatus: 'pending_sync' as const,
      };
      addMerchantTransaction(tx);
      addToSyncQueue({ txId: tx.id, side: 'merchant', tx, queuedAt: Date.now() });

      // 4. Generate ACK QR — merchant signs the txId
      const identity = await getIdentity();
      let ackSig = '';
      if (identity) {
        ackSig = signPayload({ txId: tx.id, merchantId: merchant.merchantId }, identity.privKeyHex);
      }
      const ack = JSON.stringify({
        type: 'PAYMENT_ACK',
        txId: tx.id,
        merchantId: merchant.merchantId,
        merchantPubKey: merchant.pubKeyHex,
        ackSignature: ackSig,
        timestamp: Date.now(),
      });
      setAckPayload(ack);
      setReceiptData(receipt);
      setStep('show_ack');
    } catch (e) {
      setVerifyError('Failed to parse receipt');
      setScanned(false);
    }
  };

  // Step 1: Show merchant identity QR
  if (step === 'show_qr') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Show to Payer</Text>
        <Text style={styles.subtitle}>Payer will enter the amount</Text>
        <View style={styles.qrContainer}>
          <QRCode value={qrPayload} size={220} backgroundColor="#fff" color="#1a1a2e" />
        </View>
        <Text style={styles.merchantId}>{merchant.merchantName}</Text>
        <Text style={styles.idLabel}>{merchant.merchantId}</Text>
        <TouchableOpacity style={styles.mainButton} onPress={handleWaitForReceipt}>
          <Text style={styles.mainButtonText}>Scan Receipt QR</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()}>
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Step 2: Scan user's signed receipt QR
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
            {verifyError ? <Text style={styles.errorText}>{verifyError}</Text> : null}
          </View>
        </CameraView>
        <TouchableOpacity style={styles.backButton} onPress={() => setStep('show_qr')}>
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Step 3: Show ACK QR for user to scan
  if (step === 'show_ack') {
    return (
      <View style={styles.container}>
        <Text style={styles.doneIcon}>✅</Text>
        <Text style={styles.doneTitle}>Payment Verified!</Text>
        <Text style={styles.amountDisplay}>{formatCurrency(receiptData?.amount || 0)}</Text>
        <Text style={styles.instruction}>Show this ACK QR to payer</Text>
        <View style={styles.qrContainer}>
          <QRCode value={ackPayload} size={200} backgroundColor="#fff" color="#1a1a2e" />
        </View>
        <TouchableOpacity style={styles.mainButton} onPress={() => setStep('done')}>
          <Text style={styles.mainButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Step 4: Done
  return (
    <View style={styles.container}>
      <Text style={styles.doneIcon}>💰</Text>
      <Text style={styles.doneTitle}>Payment Received!</Text>
      <Text style={styles.amountDisplay}>{formatCurrency(receiptData?.amount || 0)}</Text>
      <Text style={styles.doneFrom}>From: {receiptData?.userId || 'User'}</Text>
      <TouchableOpacity style={styles.mainButton} onPress={() => router.replace('/merchant')}>
        <Text style={styles.mainButtonText}>Back to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#16213e', alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#a0a0b0', marginBottom: 24 },
  qrContainer: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 20 },
  merchantId: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  idLabel: { fontSize: 11, color: '#666', marginBottom: 24 },
  instruction: { fontSize: 14, color: '#a0a0b0', marginBottom: 20, textAlign: 'center' },
  mainButton: { backgroundColor: '#e94560', borderRadius: 12, padding: 16, paddingHorizontal: 40, marginTop: 8 },
  mainButtonText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  secondaryButton: { marginTop: 16 },
  secondaryButtonText: { color: '#a0a0b0', fontSize: 14 },
  camera: { flex: 1, width: '100%', borderRadius: 12 },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  scanFrame: { width: 250, height: 250, borderWidth: 2, borderColor: '#e94560', borderRadius: 12 },
  scanText: { color: '#fff', fontSize: 16, marginTop: 20 },
  errorText: { color: '#e94560', fontSize: 13, marginTop: 12, textAlign: 'center', paddingHorizontal: 20 },
  backButton: { padding: 16 },
  doneIcon: { fontSize: 80, marginBottom: 16 },
  doneTitle: { fontSize: 24, fontWeight: 'bold', color: '#4ade80', marginBottom: 12 },
  amountDisplay: { fontSize: 42, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  doneFrom: { fontSize: 14, color: '#a0a0b0', marginBottom: 32 },
});
