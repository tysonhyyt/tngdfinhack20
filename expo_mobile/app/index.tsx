import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { requestBlePermissions } from '../lib/utils';

export default function RoleSelect() {
  const router = useRouter();

  useEffect(() => {
    requestBlePermissions();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>BLE Pay</Text>
      <Text style={styles.subtitle}>Offline Payment via Bluetooth</Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.userButton]}
          onPress={() => router.push('/user')}
        >
          <Text style={styles.buttonIcon}>💳</Text>
          <Text style={styles.buttonText}>I'm a User</Text>
          <Text style={styles.buttonDesc}>Send payments</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.merchantButton]}
          onPress={() => router.push('/merchant')}
        >
          <Text style={styles.buttonIcon}>🏪</Text>
          <Text style={styles.buttonText}>I'm a Merchant</Text>
          <Text style={styles.buttonDesc}>Receive payments</Text>
        </TouchableOpacity>
      </View>
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
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#e94560',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#a0a0b0',
    marginBottom: 60,
  },
  buttonContainer: {
    width: '100%',
    gap: 20,
  },
  button: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  userButton: {
    backgroundColor: '#0f3460',
  },
  merchantButton: {
    backgroundColor: '#533483',
  },
  buttonIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  buttonText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  buttonDesc: {
    fontSize: 14,
    color: '#a0a0b0',
    marginTop: 4,
  },
});
