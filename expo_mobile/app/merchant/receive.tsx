import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { getMerchant, addMerchantTransaction, addToSyncQueue } from '../../lib/wallet/store';
import { getIdentity, verifySignature, verifyCert, signPayload } from '../../lib/crypto/identity';
import { formatCurrency, generateTransactionId } from '../../lib/utils';
import { TNG } from '../../lib/theme';

type Step = 'show_qr' | 'scan_receipt' | 'show_ack' | 'done';

export default function ReceiveScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('show_qr');
  const [receiptData, setReceiptData] = useState<any>(null);
  const [ackPayload, setAckPayload] = useState('');
  const [scanned, setScanned] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [permission, requestPermission] = useCameraPermissions();
  const [confirmVisible, setConfirmVisible] = useState(false);

  const merchant = getMerchant();

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

      const certCheck = verifyCert(receipt.cert);
      if (!certCheck.valid) {
        setVerifyError('Invalid user certificate');
        setScanned(false);
        return;
      }

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
        <View style={styles.instructionBanner}>
          <Text style={styles.instructionTitle}>Show to Payer</Text>
          <Text style={styles.instructionSub}>Payer scans this to start payment</Text>
        </View>

        <View style={styles.qrCard}>
          <View style={styles.qrWrap}>
            <QRCode value={qrPayload} size={200} backgroundColor="#fff" color={TNG.blue} />
          </View>
          <View style={styles.qrMeta}>
            <Text style={styles.qrMerchantName}>{merchant.merchantName}</Text>
            <Text style={styles.qrMerchantId}>{merchant.merchantId}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={handleWaitForReceipt} activeOpacity={0.85}>
          <Text style={styles.primaryButtonText}>Scan Receipt QR</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ghostButton} onPress={() => router.back()}>
          <Text style={styles.ghostButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Step 2: Scan user's signed receipt QR
  if (step === 'scan_receipt') {
    if (!permission) {
      return <View style={styles.container}><ActivityIndicator color={TNG.blue} size="large" /></View>;
    }
    if (!permission.granted) {
      return (
        <View style={styles.container}>
          <Text style={styles.instructionText}>Camera permission needed</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={requestPermission} activeOpacity={0.85}>
            <Text style={styles.primaryButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={{ flex: 1, backgroundColor: TNG.textPrimary }}>
        <CameraView
          style={styles.camera}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={scanned ? undefined : handleReceiptScanned}
        >
          <View style={styles.overlay}>
            <Text style={styles.scanLabel}>Scan Payer's Receipt QR</Text>
            <View style={styles.scanFrame}>
              <View style={[styles.scanCorner, styles.scanCornerTL]} />
              <View style={[styles.scanCorner, styles.scanCornerTR]} />
              <View style={[styles.scanCorner, styles.scanCornerBL]} />
              <View style={[styles.scanCorner, styles.scanCornerBR]} />
            </View>
            {verifyError ? (
              <Text style={styles.errorText}>{verifyError}</Text>
            ) : null}
          </View>
        </CameraView>
        <TouchableOpacity style={styles.backButton} onPress={() => setStep('show_qr')}>
          <Text style={styles.ghostButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Step 3: Show ACK QR for user to scan
  if (step === 'show_ack') {
    return (
      <View style={styles.container}>
        <View style={styles.successBadge}>
          <View style={styles.successIcon}>
            <Text style={styles.successIconText}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Payment Verified!</Text>
          <Text style={styles.successAmount}>{formatCurrency(receiptData?.amount || 0)}</Text>
        </View>

        <View style={styles.qrCard}>
          <Text style={styles.qrCardLabel}>Show ACK to payer</Text>
          <View style={styles.qrWrap}>
            <QRCode value={ackPayload} size={180} backgroundColor="#fff" color={TNG.blue} />
          </View>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => setConfirmVisible(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>Mark as Done</Text>
        </TouchableOpacity>

        <Modal
          visible={confirmVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setConfirmVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Confirm Payment</Text>
              <Text style={styles.modalBody}>
                Did the payer's screen show payment confirmed?
              </Text>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={() => setConfirmVisible(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalCancelText}>Not Yet</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalConfirm}
                  onPress={() => { setConfirmVisible(false); setStep('done'); }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.modalConfirmText}>Yes, Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // Step 4: Done
  return (
    <View style={styles.container}>
      <View style={styles.successBadge}>
        <View style={[styles.successIcon, styles.successIconLarge]}>
          <Text style={[styles.successIconText, styles.successIconTextLarge]}>✓</Text>
        </View>
        <Text style={styles.successTitle}>Payment Received!</Text>
        <Text style={styles.successAmount}>{formatCurrency(receiptData?.amount || 0)}</Text>
        <Text style={styles.doneFrom}>From: {receiptData?.userId || 'User'}</Text>
      </View>
      <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/merchant')} activeOpacity={0.85}>
        <Text style={styles.primaryButtonText}>Back to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TNG.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  instructionBanner: {
    alignItems: 'center',
    marginBottom: 24,
  },
  instructionTitle: {
    fontSize: TNG.font.xl,
    fontWeight: '700',
    color: TNG.textPrimary,
  },
  instructionSub: {
    fontSize: TNG.font.sm,
    color: TNG.textMuted,
    marginTop: 4,
  },
  instructionText: {
    fontSize: TNG.font.base,
    color: TNG.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  qrCard: {
    backgroundColor: TNG.bgCard,
    borderRadius: TNG.radius.xl,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: TNG.border,
  },
  qrCardLabel: {
    fontSize: TNG.font.sm,
    color: TNG.textMuted,
    marginBottom: 16,
  },
  qrWrap: {
    borderRadius: TNG.radius.md,
    overflow: 'hidden',
  },
  qrMeta: {
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: TNG.divider,
    width: '100%',
  },
  qrMerchantName: {
    fontSize: TNG.font.base,
    fontWeight: '700',
    color: TNG.textPrimary,
  },
  qrMerchantId: {
    fontSize: TNG.font.xs,
    color: TNG.textMuted,
    marginTop: 4,
    fontFamily: 'monospace',
  },
  primaryButton: {
    backgroundColor: TNG.yellow,
    borderRadius: TNG.radius.lg,
    padding: 18,
    width: '100%',
    alignItems: 'center',
    marginBottom: 4,
  },
  primaryButtonText: {
    fontSize: TNG.font.md,
    fontWeight: '700',
    color: TNG.textOnYellow,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalBox: {
    backgroundColor: TNG.bgCard,
    borderRadius: TNG.radius.xl,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  modalTitle: {
    fontSize: TNG.font.lg,
    fontWeight: '700',
    color: TNG.textPrimary,
    marginBottom: 8,
  },
  modalBody: {
    fontSize: TNG.font.base,
    color: TNG.textSecondary,
    lineHeight: 22,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancel: {
    flex: 1,
    padding: 14,
    borderRadius: TNG.radius.md,
    borderWidth: 1.5,
    borderColor: TNG.border,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: TNG.font.base,
    fontWeight: '600',
    color: TNG.textSecondary,
  },
  modalConfirm: {
    flex: 1,
    padding: 14,
    borderRadius: TNG.radius.md,
    backgroundColor: TNG.yellow,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: TNG.font.base,
    fontWeight: '700',
    color: TNG.textOnYellow,
  },
  ghostButton: {
    padding: 16,
  },
  ghostButtonText: {
    color: TNG.textSecondary,
    fontSize: TNG.font.sm,
    fontWeight: '500',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    gap: 20,
  },
  scanLabel: {
    color: TNG.textWhite,
    fontSize: TNG.font.base,
    fontWeight: '600',
  },
  scanFrame: {
    width: 240,
    height: 240,
    position: 'relative',
  },
  scanCorner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: TNG.yellow,
    borderWidth: 3,
  },
  scanCornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  scanCornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  scanCornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  scanCornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },
  errorText: {
    color: TNG.yellow,
    fontSize: TNG.font.sm,
    textAlign: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(229,57,53,0.8)',
    padding: 8,
    borderRadius: TNG.radius.sm,
  },
  backButton: {
    backgroundColor: TNG.bgSecondary,
    padding: 16,
    alignItems: 'center',
  },
  successBadge: {
    alignItems: 'center',
    marginBottom: 24,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: TNG.radius.full,
    backgroundColor: TNG.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  successIconLarge: {
    width: 88,
    height: 88,
    marginBottom: 16,
  },
  successIconText: {
    fontSize: 28,
    color: TNG.textWhite,
    fontWeight: '800',
  },
  successIconTextLarge: {
    fontSize: 40,
  },
  successTitle: {
    fontSize: TNG.font.xl,
    fontWeight: '700',
    color: TNG.textPrimary,
    marginBottom: 4,
  },
  successAmount: {
    fontSize: TNG.font['2xl'],
    fontWeight: '800',
    color: TNG.blue,
    marginTop: 4,
  },
  doneFrom: {
    fontSize: TNG.font.sm,
    color: TNG.textMuted,
    marginTop: 8,
  },
});
