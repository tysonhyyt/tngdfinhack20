import { BleManager, Device } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import {
  BLE_SERVICE_UUID,
  PAYMENT_REQUEST_CHAR_UUID,
  PAYMENT_ACK_CHAR_UUID,
  PAYMENT_CONFIRM_CHAR_UUID,
  CONNECTION_TIMEOUT_MS,
} from './constants';
import {
  PaymentAck,
  encodeMessage,
  decodeMessage,
  createPaymentRequest,
  createPaymentConfirm,
} from './protocol';

let manager: BleManager | null = null;

function getManager(): BleManager {
  if (!manager) manager = new BleManager();
  return manager;
}

export type CentralStatus =
  | 'idle'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'sending'
  | 'waiting_ack'
  | 'confirming'
  | 'done'
  | 'error';

export interface CentralCallbacks {
  onStatusChange: (status: CentralStatus, message?: string) => void;
  onAckReceived: (ack: PaymentAck) => void;
  onComplete: (success: boolean) => void;
}

let connectedDevice: Device | null = null;

export async function connectToMerchant(
  deviceId: string,
  callbacks: CentralCallbacks
): Promise<Device | null> {
  const mgr = getManager();

  try {
    callbacks.onStatusChange('connecting', 'Connecting to merchant...');

    const device = await mgr.connectToDevice(deviceId, {
      timeout: CONNECTION_TIMEOUT_MS,
    });

    await device.discoverAllServicesAndCharacteristics();
    connectedDevice = device;
    callbacks.onStatusChange('connected', 'Connected to merchant');

    device.onDisconnected(() => {
      connectedDevice = null;
    });

    return device;
  } catch (err: any) {
    callbacks.onStatusChange('error', err.message || 'Connection failed');
    return null;
  }
}

export async function sendPayment(
  amount: number,
  userId: string,
  callbacks: CentralCallbacks
): Promise<boolean> {
  if (!connectedDevice) {
    callbacks.onStatusChange('error', 'Not connected');
    return false;
  }

  try {
    // Step 1: Send payment request
    callbacks.onStatusChange('sending', 'Sending payment...');
    const request = createPaymentRequest(amount, userId);
    const encoded = Buffer.from(encodeMessage(request), 'utf-8').toString('base64');

    await connectedDevice.writeCharacteristicWithResponseForService(
      BLE_SERVICE_UUID,
      PAYMENT_REQUEST_CHAR_UUID,
      encoded
    );

    // Step 2: Wait for ACK via notification
    callbacks.onStatusChange('waiting_ack', 'Waiting for merchant confirmation...');

    const ack = await waitForAck(connectedDevice);

    if (!ack || ack.status !== 'ACCEPTED') {
      callbacks.onStatusChange('error', 'Payment rejected by merchant');
      callbacks.onComplete(false);
      return false;
    }

    callbacks.onAckReceived(ack);

    // Step 3: Send final confirmation
    callbacks.onStatusChange('confirming', 'Confirming payment...');
    const txId = `txn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const confirm = createPaymentConfirm(txId, true);
    const confirmEncoded = Buffer.from(encodeMessage(confirm), 'utf-8').toString('base64');

    await connectedDevice.writeCharacteristicWithResponseForService(
      BLE_SERVICE_UUID,
      PAYMENT_CONFIRM_CHAR_UUID,
      confirmEncoded
    );

    callbacks.onStatusChange('done', 'Payment complete!');
    callbacks.onComplete(true);
    return true;
  } catch (err: any) {
    callbacks.onStatusChange('error', err.message || 'Payment failed');
    callbacks.onComplete(false);
    return false;
  }
}

function waitForAck(device: Device): Promise<PaymentAck | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve(null);
    }, 15000);

    device.monitorCharacteristicForService(
      BLE_SERVICE_UUID,
      PAYMENT_ACK_CHAR_UUID,
      (error, characteristic) => {
        clearTimeout(timeout);
        if (error || !characteristic?.value) {
          resolve(null);
          return;
        }
        try {
          const decoded = Buffer.from(characteristic.value, 'base64').toString('utf-8');
          const msg = decodeMessage(decoded);
          if (msg.type === 'PAYMENT_ACK') {
            resolve(msg as PaymentAck);
          }
        } catch {
          resolve(null);
        }
      }
    );
  });
}

export async function disconnectFromMerchant() {
  if (connectedDevice) {
    try {
      await connectedDevice.cancelConnection();
    } catch {}
    connectedDevice = null;
  }
}

export function destroyManager() {
  if (manager) {
    manager.destroy();
    manager = null;
  }
}

export async function scanForMerchant(
  targetDeviceId: string,
  callbacks: CentralCallbacks
): Promise<Device | null> {
  const mgr = getManager();
  callbacks.onStatusChange('scanning', 'Scanning for merchant...');

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      mgr.stopDeviceScan();
      callbacks.onStatusChange('error', 'Merchant not found');
      resolve(null);
    }, 15000);

    mgr.startDeviceScan([BLE_SERVICE_UUID], null, (error, device) => {
      if (error) {
        clearTimeout(timeout);
        callbacks.onStatusChange('error', error.message);
        resolve(null);
        return;
      }
      if (device && device.id === targetDeviceId) {
        clearTimeout(timeout);
        mgr.stopDeviceScan();
        resolve(device);
      }
    });
  });
}
