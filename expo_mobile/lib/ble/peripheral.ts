import Peripheral, {
  Permission,
  Property,
  AdvertiseMode,
  TxPowerLevel,
  WriteEvent,
} from 'react-native-multi-ble-peripheral';
import { Buffer } from 'buffer';
import {
  BLE_SERVICE_UUID,
  PAYMENT_REQUEST_CHAR_UUID,
  PAYMENT_ACK_CHAR_UUID,
  PAYMENT_CONFIRM_CHAR_UUID,
  BLE_DEVICE_NAME,
} from './constants';
import {
  PaymentRequest,
  PaymentConfirm,
  decodeMessage,
  encodeMessage,
  createPaymentAck,
} from './protocol';

export type PeripheralStatus =
  | 'idle'
  | 'advertising'
  | 'connected'
  | 'payment_received'
  | 'ack_sent'
  | 'confirmed'
  | 'error';

export interface PeripheralCallbacks {
  onStatusChange: (status: PeripheralStatus, message?: string) => void;
  onPaymentRequest: (request: PaymentRequest) => void;
  onPaymentConfirmed: (confirm: PaymentConfirm) => void;
}

let peripheral: Peripheral | null = null;

export async function startPeripheral(
  merchantId: string,
  callbacks: PeripheralCallbacks
): Promise<boolean> {
  try {
    peripheral = new Peripheral();

    // Set device name
    await Peripheral.setDeviceName(BLE_DEVICE_NAME);

    // Add service
    await peripheral.addService(BLE_SERVICE_UUID, true);

    // Payment request characteristic (writable by central)
    await peripheral.addCharacteristic(
      BLE_SERVICE_UUID,
      PAYMENT_REQUEST_CHAR_UUID,
      Property.WRITE | Property.WRITE_NO_RESPONSE,
      Permission.WRITEABLE
    );

    // Payment ACK characteristic (notify to central)
    await peripheral.addCharacteristic(
      BLE_SERVICE_UUID,
      PAYMENT_ACK_CHAR_UUID,
      Property.READ | Property.NOTIFY,
      Permission.READABLE
    );

    // Payment confirm characteristic (writable by central)
    await peripheral.addCharacteristic(
      BLE_SERVICE_UUID,
      PAYMENT_CONFIRM_CHAR_UUID,
      Property.WRITE | Property.WRITE_NO_RESPONSE,
      Permission.WRITEABLE
    );

    // Listen for writes from central
    peripheral.on('write', (event: WriteEvent) => {
      handleWriteEvent(event, merchantId, callbacks);
    });

    // Start advertising
    await peripheral.startAdvertising(
      { [BLE_SERVICE_UUID]: Buffer.alloc(0) },
      {
        mode: AdvertiseMode.LOW_LATENCY,
        txPowerLevel: TxPowerLevel.HIGH,
        connectable: true,
        includeDeviceName: true,
      }
    );

    callbacks.onStatusChange('advertising', 'Waiting for payment...');
    return true;
  } catch (err: any) {
    callbacks.onStatusChange('error', err.message || 'Failed to start peripheral');
    return false;
  }
}

function handleWriteEvent(
  event: WriteEvent,
  merchantId: string,
  callbacks: PeripheralCallbacks
) {
  try {
    const decoded = Buffer.from(event.value, 'base64').toString('utf-8');
    const msg = decodeMessage(decoded);

    const charUuid = event.characteristicUuid.toLowerCase();

    if (charUuid === PAYMENT_REQUEST_CHAR_UUID.toLowerCase() && msg.type === 'PAYMENT_REQUEST') {
      const request = msg as PaymentRequest;
      callbacks.onStatusChange('payment_received', `Payment of RM${request.amount.toFixed(2)} received`);
      callbacks.onPaymentRequest(request);

      // Auto-accept and send ACK via notify
      const ack = createPaymentAck(merchantId, true);
      const ackBuffer = Buffer.from(JSON.stringify(ack), 'utf-8');

      if (peripheral) {
        peripheral.sendNotification(
          BLE_SERVICE_UUID,
          PAYMENT_ACK_CHAR_UUID,
          ackBuffer
        );
      }
      callbacks.onStatusChange('ack_sent', 'ACK sent to user');
    }

    if (charUuid === PAYMENT_CONFIRM_CHAR_UUID.toLowerCase() && msg.type === 'PAYMENT_CONFIRM') {
      callbacks.onPaymentConfirmed(msg as PaymentConfirm);
      callbacks.onStatusChange('confirmed', 'Payment confirmed!');
    }
  } catch (err: any) {
    callbacks.onStatusChange('error', `Failed to process: ${err.message}`);
  }
}

export async function stopPeripheral() {
  if (peripheral) {
    try {
      await peripheral.stopAdvertising();
      await peripheral.destroy();
    } catch {}
    peripheral = null;
  }
}
