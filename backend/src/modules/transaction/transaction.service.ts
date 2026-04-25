import { kafkaProducer } from '../../infrastructure/kafka.service';

export async function syncOfflineTransaction(payloads: any[]) {
  // 1. Validate payload structure (simplified for MVP)
  if (!payloads || payloads.length === 0) {
    throw new Error('No transactions provided for sync');
  }

  // 2. Iterate and publish to Kafka
  for (const payload of payloads) {
    // In a real scenario, basic schema validation occurs here before ingestion.
    // The actual ECDSA signature verification and ledger deduction happens asynchronously
    // in the ECS Worker containers consuming from Kafka.
    
    await kafkaProducer.sendTransactionEvent('offline-transactions-ingest', {
      event_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      data: payload
    });
  }
}
