import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';

export default function ScanQR() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (!permission) {
    return <View style={styles.container}><Text style={styles.text}>Requesting camera...</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Camera permission needed to scan QR codes</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
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
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        <View style={styles.overlay}>
          <View style={styles.scanFrame} />
          <Text style={styles.scanText}>Scan Merchant QR Code</Text>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#16213e', justifyContent: 'center', alignItems: 'center' },
  camera: { flex: 1, width: '100%' },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  scanFrame: { width: 250, height: 250, borderWidth: 2, borderColor: '#e94560', borderRadius: 12 },
  scanText: { color: '#fff', fontSize: 16, marginTop: 20 },
  text: { color: '#fff', fontSize: 16, textAlign: 'center', padding: 20 },
  button: { backgroundColor: '#e94560', borderRadius: 8, padding: 12, marginTop: 16 },
  buttonText: { color: '#fff', fontWeight: 'bold' },
});
