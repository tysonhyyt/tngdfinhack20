import { Router, Request, Response } from 'express';
import { kafkaProducer } from '../../infrastructure/kafka.service';
import { pushOfflineTransactions, syncOfflineTransaction } from './transaction.service';

export const transactionRouter = Router();
export const transactionSyncRouter = Router();

/**
 * Publish one transaction event to Kafka (direct producer; not via syncOfflineTransaction).
 * Body: { message: unknown } or { data: unknown }; optional { topic: string }.
 */
transactionRouter.post('/event', async (req: Request, res: Response) => {
  console.log('[POST /api/transactions/event] payload:', req.body);

  try {
    const topic = typeof req.body.topic === 'string' ? req.body.topic : undefined;
    const message = req.body.message ?? req.body.data;

    if (message === undefined || message === null) {
      const errBody = {
        success: false,
        error: {
          code: 'INVALID_PAYLOAD',
          message: 'Expected "message" or "data" in JSON body',
        },
      };
      console.log('[POST /api/transactions/event] returning:', errBody);
      return res.status(400).json(errBody);
    }

    const resolvedTopic =
      topic?.trim() || process.env.KAFKA_TOPIC || 'offline.transact.sync';
    await kafkaProducer.sendTransactionEvent(resolvedTopic, message);

    const acceptedBody = {
      success: true,
      message: 'Transaction event accepted for publishing',
    };
    console.log('[POST /api/transactions/event] returning:', acceptedBody);
    return res.status(202).json(acceptedBody);
  } catch (error) {
    console.error('Send transaction event error:', error);
    const errBody = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to publish transaction event',
      },
    };
    console.log('[POST /api/transactions/event] returning:', errBody);
    return res.status(500).json(errBody);
  }
});

/**
 * Endpoint to sync offline transactions.
 * Device pushes an array of signed offline transaction artifacts.
 */
transactionRouter.post('/sync', async (req: Request, res: Response) => {
  console.log('[POST /api/transactions/sync] payload:', req.body);

  try {
    const payloads = req.body.transactions;
    
    if (!payloads || !Array.isArray(payloads)) {
      const errBody = {
        success: false,
        error: { code: 'INVALID_PAYLOAD', message: 'Expected an array of transactions' }
      };
      console.log('[POST /api/transactions/sync] returning:', errBody);
      return res.status(400).json(errBody);
    }

    // Pushing to Kafka for async processing (Optimistic Execution)
    await syncOfflineTransaction(payloads);

    // Return 202 Accepted as per specs
    const acceptedBody = {
      success: true,
      message: 'Transactions accepted for processing'
    };
    console.log('[POST /api/transactions/sync] returning:', acceptedBody);
    return res.status(202).json(acceptedBody);
  } catch (error) {
    console.error('Sync Error:', error);
    const errBody = {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to ingest transactions' }
    };
    console.log('[POST /api/transactions/sync] returning:', errBody);
    return res.status(500).json(errBody);
  }
});

transactionSyncRouter.post('/push', async (req: Request, res: Response) => {
  console.log('[POST /sync/push] payload:', req.body);

  try {
    const deviceId = typeof req.body.deviceId === 'string' ? req.body.deviceId.trim() : '';
    const payloads = req.body.transactions;

    if (!deviceId) {
      const errBody = {
        success: false,
        error: { code: 'INVALID_PAYLOAD', message: 'deviceId is required' },
      };
      console.log('[POST /sync/push] returning:', errBody);
      return res.status(400).json(errBody);
    }

    if (!payloads || !Array.isArray(payloads)) {
      const errBody = {
        success: false,
        error: { code: 'INVALID_PAYLOAD', message: 'Expected an array of transactions' },
      };
      console.log('[POST /sync/push] returning:', errBody);
      return res.status(400).json(errBody);
    }

    const result = await pushOfflineTransactions(deviceId, payloads);

    console.log('[POST /sync/push] returning:', result);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Sync Push Error:', error);
    const errBody = {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to push transactions' },
    };
    console.log('[POST /sync/push] returning:', errBody);
    return res.status(500).json(errBody);
  }
});
