// Payment message types and protocol

export type PaymentMessageType = 'PAYMENT_REQUEST' | 'PAYMENT_ACK' | 'PAYMENT_CONFIRM';

export interface PaymentRequest {
  type: 'PAYMENT_REQUEST';
  amount: number;
  currency: string;
  timestamp: number;
  userId: string;
  signature: string;
}

export interface PaymentAck {
  type: 'PAYMENT_ACK';
  status: 'ACCEPTED' | 'REJECTED';
  merchantId: string;
  timestamp: number;
}

export interface PaymentConfirm {
  type: 'PAYMENT_CONFIRM';
  status: 'CONFIRMED' | 'CANCELLED';
  transactionId: string;
  timestamp: number;
}

export type PaymentMessage = PaymentRequest | PaymentAck | PaymentConfirm;

export function encodeMessage(msg: PaymentMessage): string {
  return JSON.stringify(msg);
}

export function decodeMessage(data: string): PaymentMessage {
  return JSON.parse(data) as PaymentMessage;
}

export function createPaymentRequest(amount: number, userId: string): PaymentRequest {
  return {
    type: 'PAYMENT_REQUEST',
    amount,
    currency: 'MYR',
    timestamp: Date.now(),
    userId,
    signature: `sig-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };
}

export function createPaymentAck(merchantId: string, accepted: boolean): PaymentAck {
  return {
    type: 'PAYMENT_ACK',
    status: accepted ? 'ACCEPTED' : 'REJECTED',
    merchantId,
    timestamp: Date.now(),
  };
}

export function createPaymentConfirm(transactionId: string, confirmed: boolean): PaymentConfirm {
  return {
    type: 'PAYMENT_CONFIRM',
    status: confirmed ? 'CONFIRMED' : 'CANCELLED',
    transactionId,
    timestamp: Date.now(),
  };
}
