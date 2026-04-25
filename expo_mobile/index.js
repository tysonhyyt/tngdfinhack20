// Polyfill crypto.getRandomValues BEFORE anything else loads
// Required by @noble/curves for ECDSA key generation + signing
import 'react-native-get-random-values';

// Then load expo-router entry
import 'expo-router/entry';
