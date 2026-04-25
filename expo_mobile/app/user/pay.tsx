import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import QRCode from 'react-native-qrcode-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { getWallet, deductBalance, addUserTransaction, addToSyncQueue } from '../../lib/wallet/store';
import { getIdentity, signPayload, verifySignature, verifyCert } from '../../lib/crypto/identity';
import { formatCurrency, generateTransactionId } from '../../lib/utils';
import { TNG } from '../../lib/theme';

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
        <View style={styles.merchantBadge}>
          <View style={styles.merchantBadgeIcon}>
            <Text style={styles.merchantBadgeIconText}>#</Text>
          </View>
          <View>
            <Text style={styles.merchantLabel}>Paying to</Text>
            <Text style={styles.merchantName}>{merchantName || 'Merchant'}</Text>
          </View>
        </View>

        <View style={styles.amountCard}>
          <Text style={styles.amountCurrency}>RM</Text>
          <TextInput
            style={styles.amountInput}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={TNG.textMuted}
            value={amount}
            onChangeText={setAmount}
            autoFocus
          />
        </View>

        <View style={styles.quickAmounts}>
          {[5, 10, 20, 50].map((q) => (
            <TouchableOpacity key={q} style={styles.quickBtn} onPress={() => setAmount(q.toString())} activeOpacity={0.75}>
              <Text style={styles.quickBtnText}>RM{q}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, payAmount <= 0 && styles.buttonDisabled]}
          onPress={() => setStep('confirm')}
          disabled={payAmount <= 0}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>Next</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ghostButton} onPress={() => router.back()}>
          <Text style={styles.ghostButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Step 2: Confirm
  if (step === 'confirm') {
    const insufficient = payAmount > wallet.balance;
    return (
      <View style={styles.container}>
        <View style={styles.merchantBadge}>
          <View style={styles.merchantBadgeIcon}>
            <Text style={styles.merchantBadgeIconText}>#</Text>
          </View>
          <View>
            <Text style={styles.merchantLabel}>Paying to</Text>
            <Text style={styles.merchantName}>{merchantName || 'Merchant'}</Text>
          </View>
        </View>

        <View style={styles.confirmCard}>
          <Text style={styles.confirmLabel}>Amount</Text>
          <Text style={styles.amountDisplay}>{formatCurrency(payAmount)}</Text>
          <Text style={styles.balanceText}>Balance: {formatCurrency(wallet.balance)}</Text>
        </View>

        {insufficient && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>Insufficient balance</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.primaryButton, (insufficient || payAmount <= 0) && styles.buttonDisabled]}
          onPress={handleConfirmPay}
          disabled={insufficient || payAmount <= 0}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>Confirm & Pay</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ghostButton} onPress={() => setStep('enter_amount')}>
          <Text style={styles.ghostButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Step 3: Show signed receipt QR
  if (step === 'receipt') {
    return (
      <View style={styles.container}>
        <View style={styles.successBadge}>
          <View style={styles.successIcon}>
            <Text style={styles.successIconText}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Payment Sent!</Text>
          <Text style={styles.successAmount}>{formatCurrency(payAmount)}</Text>
        </View>

        <View style={styles.qrCard}>
          <Text style={styles.qrLabel}>Show to merchant</Text>
          <View style={styles.qrWrap}>
            <QRCode value={receiptPayload} size={200} backgroundColor="#fff" color={TNG.blue} />
          </View>
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={() => { setScanned(false); setStep('scan_ack'); }} activeOpacity={0.85}>
          <Text style={styles.primaryButtonText}>Scan Merchant ACK</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Step 4: Scan merchant ACK QR
  if (step === 'scan_ack') {
    if (!permission) return <View style={styles.container}><ActivityIndicator color={TNG.blue} size="large" /></View>;
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
          onBarcodeScanned={scanned ? undefined : handleAckScanned}
        >
          <View style={styles.overlay}>
            <Text style={styles.scanLabel}>Scan Merchant's ACK QR</Text>
            <View style={styles.scanFrame}>
              <View style={[styles.scanCorner, styles.scanCornerTL]} />
              <View style={[styles.scanCorner, styles.scanCornerTR]} />
              <View style={[styles.scanCorner, styles.scanCornerBL]} />
              <View style={[styles.scanCorner, styles.scanCornerBR]} />
            </View>
            {ackError ? <Text style={styles.errorText}>{ackError}</Text> : null}
          </View>
        </CameraView>
        <TouchableOpacity style={styles.skipButton} onPress={() => setStep('done')}>
          <Text style={styles.skipButtonText}>Skip (demo)</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Step 5: Done
  return (
    <View style={styles.container}>
      <View style={styles.doneCard}>
        <View style={[styles.successIcon, styles.successIconLarge]}>
          <Text style={[styles.successIconText, styles.successIconTextLarge]}>✓</Text>
        </View>
        <Text style={styles.doneTitle}>Complete!</Text>
        <Text style={styles.doneAmount}>{formatCurrency(payAmount)}</Text>
        <Text style={styles.doneBalance}>New balance: {formatCurrency(wallet.balance)}</Text>
      </View>
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => router.replace({ pathname: '/user/result', params: { success: 'true', amount: payAmount.toString() } })}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryButtonText}>Done</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TNG.bgSecondary,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  merchantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: TNG.bgCard,
    borderRadius: TNG.radius.lg,
    padding: 16,
    width: '100%',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: TNG.border,
  },
  merchantBadgeIcon: {
    width: 40,
    height: 40,
    borderRadius: TNG.radius.sm,
    backgroundColor: TNG.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  merchantBadgeIconText: {
    fontSize: 18,
    fontWeight: '800',
    color: TNG.yellow,
  },
  merchantLabel: {
    fontSize: TNG.font.xs,
    color: TNG.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  merchantName: {
    fontSize: TNG.font.base,
    fontWeight: '700',
    color: TNG.textPrimary,
    marginTop: 2,
  },
  amountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 8,
  },
  amountCurrency: {
    fontSize: TNG.font.xl,
    color: TNG.textSecondary,
    fontWeight: '500',
  },
  amountInput: {
    fontSize: 52,
    fontWeight: '800',
    color: TNG.textPrimary,
    minWidth: 120,
    textAlign: 'center',
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 32,
  },
  quickBtn: {
    backgroundColor: TNG.bgCard,
    borderRadius: TNG.radius.sm,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: TNG.blue,
  },
  quickBtnText: {
    color: TNG.blue,
    fontSize: TNG.font.sm,
    fontWeight: '600',
  },
  confirmCard: {
    backgroundColor: TNG.bgCard,
    borderRadius: TNG.radius.xl,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: TNG.border,
  },
  confirmLabel: {
    fontSize: TNG.font.sm,
    color: TNG.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  amountDisplay: {
    fontSize: TNG.font['3xl'],
    fontWeight: '800',
    color: TNG.textPrimary,
  },
  balanceText: {
    fontSize: TNG.font.sm,
    color: TNG.textMuted,
    marginTop: 10,
  },
  errorBanner: {
    backgroundColor: TNG.errorLight,
    borderRadius: TNG.radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: TNG.error,
  },
  errorBannerText: {
    color: TNG.error,
    fontSize: TNG.font.sm,
    fontWeight: '600',
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
  ghostButton: {
    padding: 16,
  },
  ghostButtonText: {
    color: TNG.textSecondary,
    fontSize: TNG.font.sm,
    fontWeight: '500',
  },
  successBadge: {
    alignItems: 'center',
    marginBottom: 24,
  },
  successIcon: {
    width: 56,
    height: 56,
    borderRadius: TNG.radius.full,
    backgroundColor: TNG.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  successIconLarge: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  successIconText: {
    fontSize: 24,
    color: TNG.textWhite,
    fontWeight: '800',
  },
  successIconTextLarge: {
    fontSize: 36,
  },
  successTitle: {
    fontSize: TNG.font.xl,
    fontWeight: '700',
    color: TNG.textPrimary,
  },
  successAmount: {
    fontSize: TNG.font['2xl'],
    fontWeight: '800',
    color: TNG.blue,
    marginTop: 4,
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
  qrLabel: {
    fontSize: TNG.font.sm,
    color: TNG.textMuted,
    marginBottom: 16,
  },
  qrWrap: {
    borderRadius: TNG.radius.md,
    overflow: 'hidden',
  },
  instructionText: {
    fontSize: TNG.font.base,
    color: TNG.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
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
  skipButton: {
    backgroundColor: TNG.bgSecondary,
    padding: 16,
    alignItems: 'center',
  },
  skipButtonText: {
    color: TNG.textSecondary,
    fontSize: TNG.font.sm,
  },
  doneCard: {
    alignItems: 'center',
    marginBottom: 32,
  },
  doneTitle: {
    fontSize: TNG.font.xl,
    fontWeight: '700',
    color: TNG.textPrimary,
    marginBottom: 8,
  },
  doneAmount: {
    fontSize: TNG.font['3xl'],
    fontWeight: '800',
    color: TNG.blue,
    marginBottom: 8,
  },
  doneBalance: {
    fontSize: TNG.font.sm,
    color: TNG.textMuted,
  },
});
