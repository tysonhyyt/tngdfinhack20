import { Router, Request, Response } from 'express';
import { pushOfflineTransactions } from './transaction.service';

export const transactionSyncRouter = Router();

transactionSyncRouter.post('/push', async (req: Request, res: Response) => {
  try {
    const deviceId = typeof req.body.deviceId === 'string' ? req.body.deviceId.trim() : '';
    const payloads = req.body.transactions;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_PAYLOAD', message: 'deviceId is required' },
      });
    }

    if (!payloads || !Array.isArray(payloads)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_PAYLOAD', message: 'Expected an array of transactions' },
      });
    }

    const result = await pushOfflineTransactions(deviceId, payloads);

    return res.status(200).json(result);
  } catch (error) {
    console.error('Sync Push Error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to push transactions' },
    });
  }
});
