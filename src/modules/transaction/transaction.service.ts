import crypto from "crypto";
import { dbPool } from "../../infrastructure/db.service";
import { kafkaProducer } from "../../infrastructure/kafka.service";

export interface OfflineSyncPushResult {
  syncedTxIds: string[];
  failedTxIds: string[];
}

interface OfflineSyncPayload {
  txId: string;
  side: string;
  queuedAt: number;
  tx: {
    id: string;
    amount: number;
    currency: string;
    timestamp: number;
    fromUserId: string;
    toMerchantId: string;
    status: string;
    signature: string;
    userPubKey: string;
    cert: string;
    ackSignature: string;
    merchantPubKey: string;
    syncStatus: string;
  };
}

function isValidOfflineSyncPayload(payload: any): payload is OfflineSyncPayload {
  return (
    payload &&
    typeof payload.txId === "string" &&
    typeof payload.side === "string" &&
    typeof payload.queuedAt === "number" &&
    payload.tx &&
    typeof payload.tx.id === "string" &&
    typeof payload.tx.amount === "number" &&
    typeof payload.tx.currency === "string" &&
    typeof payload.tx.timestamp === "number" &&
    typeof payload.tx.fromUserId === "string" &&
    typeof payload.tx.toMerchantId === "string" &&
    typeof payload.tx.status === "string" &&
    typeof payload.tx.signature === "string" &&
    typeof payload.tx.userPubKey === "string" &&
    typeof payload.tx.cert === "string" &&
    typeof payload.tx.ackSignature === "string" &&
    typeof payload.tx.merchantPubKey === "string" &&
    typeof payload.tx.syncStatus === "string"
  );
}

export async function syncOfflineTransaction(payloads: any[]) {
  const topic = process.env.KAFKA_TOPIC || "offline.transact.sync";

  if (!payloads || payloads.length === 0) {
    throw new Error("No transactions provided for sync");
  }

  for (const payload of payloads) {
    await kafkaProducer.sendTransactionEvent(topic, {
      event_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      data: payload,
    });
  }
}

export async function pushOfflineTransactions(
  deviceId: string,
  payloads: any[],
): Promise<OfflineSyncPushResult> {
  if (!deviceId || typeof deviceId !== "string") {
    throw new Error("DeviceId is required");
  }

  const syncedTxIds: string[] = [];
  const failedTxIds: string[] = [];
  const topic = process.env.KAFKA_TOPIC || "offline.transact.sync";

  for (const payload of payloads) {
    if (!isValidOfflineSyncPayload(payload)) {
      if (payload && typeof payload.txId === "string") {
        failedTxIds.push(payload.txId);
      }
      continue;
    }

    if (payload.tx.id !== payload.txId) {
      failedTxIds.push(payload.txId);
      continue;
    }

    const consumerId = payload.tx.fromUserId;
    const vendorId = payload.tx.toMerchantId;
    const amount = payload.tx.amount;
    const currency = payload.tx.currency;
    const status = payload.tx.status || "completed";
    const syncStatus = payload.tx.syncStatus || "pending_sync";
    const timestamp = payload.tx.timestamp;

    try {
      await dbPool.query(
        "INSERT IGNORE INTO offline_transaction (tx_id, consumer_id, vendor_id, amount, currency, status, sync_status, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [payload.txId, consumerId, vendorId, amount, currency, status, syncStatus, timestamp],
      );

      await kafkaProducer.sendTransactionEvent(topic, {
        event_id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        source: "sync.push",
        deviceId,
        payload,
      });

      syncedTxIds.push(payload.txId);
    } catch (error) {
      console.error("pushOfflineTransactions error for txId", payload.txId, error);
      failedTxIds.push(payload.txId);
    }
  }

  return { syncedTxIds, failedTxIds };
}
