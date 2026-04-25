import { Router, Request, Response } from 'express';
import { kafkaProducer } from '../../infrastructure/kafka.service';
import { syncOfflineTransaction } from './transaction.service';

export const transactionRouter = Router();

/**
 * Publish one transaction event to Kafka (direct producer; not via syncOfflineTransaction).
 * Body: { message: unknown } or { data: unknown }; optional { topic: string }.
 */
transactionRouter.post('/event', async (req: Request, res: Response) => {
  try {
    const topic = typeof req.body.topic === 'string' ? req.body.topic : undefined;
    const message = req.body.message ?? req.body.data;

    if (message === undefined || message === null) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PAYLOAD',
          message: 'Expected "message" or "data" in JSON body',
        },
      });
    }

    const resolvedTopic =
      topic?.trim() || process.env.KAFKA_TOPIC || 'offline.transact.sync';
    await kafkaProducer.sendTransactionEvent(resolvedTopic, message);

    return res.status(202).json({
      success: true,
      message: 'Transaction event accepted for publishing',
    });
  } catch (error) {
    console.error('Send transaction event error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to publish transaction event',
      },
    });
  }
});

/**
 * Endpoint to sync offline transactions.
 * Device pushes an array of signed offline transaction artifacts.
 */
transactionRouter.post('/sync', async (req: Request, res: Response) => {
  try {
    const payloads = req.body.transactions;
    
    if (!payloads || !Array.isArray(payloads)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_PAYLOAD', message: 'Expected an array of transactions' }
      });
    }

    // Pushing to Kafka for async processing (Optimistic Execution)
    await syncOfflineTransaction(payloads);

    // Return 202 Accepted as per specs
    return res.status(202).json({
      success: true,
      message: 'Transactions accepted for processing'
    });
  } catch (error) {
    console.error('Sync Error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to ingest transactions' }
    });
  }
});
