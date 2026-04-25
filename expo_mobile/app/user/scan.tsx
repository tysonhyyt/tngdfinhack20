import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { TNG } from '../../lib/theme';

export default function ScanQR() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (!permission) {
    return (
      <View style={styles.permContainer}>
        <Text style={styles.permText}>Requesting camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permContainer}>
        <Text style={styles.permText}>Camera access needed to scan QR codes</Text>
        <TouchableOpacity style={styles.permButton} onPress={requestPermission} activeOpacity={0.85}>
          <Text style={styles.permButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    try {
      const qrData = JSON.parse(data);
      if (qrData.type === 'PAYMENT_REQUEST') {
        router.push({
          pathname: '/user/pay',
          params: {
            merchantId: qrData.merchantId,
            merchantName: qrData.merchantName || 'Merchant',
            merchantPubKey: qrData.merchantPubKey || '',
            merchantCert: qrData.cert || '',
          },
        });
      } else {
        setScanned(false);
      }
    } catch {
      setScanned(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: TNG.textPrimary }}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        <View style={styles.overlay}>
          <Text style={styles.scanLabel}>Scan Merchant QR Code</Text>
          <View style={styles.scanFrame}>
            <View style={[styles.scanCorner, styles.scanCornerTL]} />
            <View style={[styles.scanCorner, styles.scanCornerTR]} />
            <View style={[styles.scanCorner, styles.scanCornerBL]} />
            <View style={[styles.scanCorner, styles.scanCornerBR]} />
          </View>
          <Text style={styles.scanHint}>Point at merchant's QR code</Text>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  permContainer: {
    flex: 1,
    backgroundColor: TNG.bgSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permText: {
    color: TNG.textSecondary,
    fontSize: TNG.font.base,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  permButton: {
    backgroundColor: TNG.yellow,
    borderRadius: TNG.radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  permButtonText: {
    color: TNG.textOnYellow,
    fontSize: TNG.font.base,
    fontWeight: '700',
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
    fontSize: TNG.font.md,
    fontWeight: '700',
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
  scanHint: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: TNG.font.sm,
  },
});
