import { Router, Request, Response } from 'express';
import { findAccountByDeviceIdAndRole } from './account.service';

export const accountRouter = Router();

accountRouter.get('/', async (req: Request, res: Response) => {
  const deviceId = typeof req.query.deviceId === 'string' ? req.query.deviceId.trim() : '';
  const role = typeof req.query.role === 'string' ? req.query.role.trim() : '';

  if (!deviceId || !role) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_QUERY',
        message: 'Both deviceId and role query parameters are required.',
      },
    });
  }

  try {
    const result = await findAccountByDeviceIdAndRole(deviceId, role);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ACCOUNT_NOT_FOUND',
          message: 'No account was found for the provided deviceId and role.',
        },
      });
    }

    return res.json({
      success: true,
      deviceId: result.account.device_id,
      userId: result.account.user_id,
      role: result.account.role,
      offlineBalance: Number(result.account.offline_balance),
      currency: result.account.currency,
      transactions: result.transactions.map((tx) => ({
        id: tx.tx_id,
        amount: Number(tx.amount),
        currency: tx.currency,
        timestamp: tx.timestamp,
        fromUserId: tx.consumer_id,
        toMerchantId: tx.vendor_id,
        status: tx.status,
        syncStatus: tx.sync_status,
      })),
    });
  } catch (error) {
    console.error('Get account error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to load account data.',
      },
    });
  }
});
