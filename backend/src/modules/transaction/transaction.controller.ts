import { Router, Request, Response } from 'express';
import { syncOfflineTransaction } from './transaction.service';

export const transactionRouter = Router();

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
