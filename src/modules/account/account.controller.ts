import { Router, Request, Response } from 'express';
import {
  findAccountByDeviceIdAndRole,
  findOrCreateAccountByDeviceIdAndRole,
} from './account.service';

export const accountRouter = Router();

function respondJson(res: Response, payload: unknown) {
  if (
    payload === undefined ||
    payload === null ||
    (typeof payload === 'object' &&
      !Array.isArray(payload) &&
      Object.keys(payload as object).length === 0)
  ) {
    return res.json({});
  }
  return res.json(payload);
}

accountRouter.post('/', async (req: Request, res: Response) => {
  console.log('[POST /account] payload:', req.body);

  const deviceId = typeof req.body.deviceId === 'string' ? req.body.deviceId.trim() : '';
  const role = typeof req.body.role === 'string' ? req.body.role.trim() : '';

  if (!deviceId || !role) {
    const errBody = {
      success: false,
      error: {
        code: 'INVALID_PAYLOAD',
        message: 'Both deviceId and role are required in the JSON body.',
      },
    };
    console.log('[POST /account] returning:', errBody);
    return res.status(400).json(errBody);
  }

  try {
    const account = await findOrCreateAccountByDeviceIdAndRole(deviceId, role);

    const responseBody: Record<string, unknown> = {
      success: true,
      userId: account.account.user_id,
      displayName: account.displayName,
      offlineBalance: Number(account.account.offline_balance),
      status: account.status,
    };

    if (account.merchantName) {
      responseBody.merchantName = account.merchantName;
    }

    console.log('[POST /account] returning:', responseBody);
    return respondJson(res, responseBody);
  } catch (error) {
    console.error('Create or fetch account error:', error);
    const errBody = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create or fetch account.',
      },
    };
    console.log('[POST /account] returning:', errBody);
    return res.status(500).json(errBody);
  }
});

accountRouter.get('/', async (req: Request, res: Response) => {
  console.log('[GET /account] payload (query):', req.query);

  const deviceId = typeof req.query.deviceId === 'string' ? req.query.deviceId.trim() : '';
  const role = typeof req.query.role === 'string' ? req.query.role.trim() : '';

  if (!deviceId || !role) {
    const errBody = {
      success: false,
      error: {
        code: 'INVALID_QUERY',
        message: 'Both deviceId and role query parameters are required.',
      },
    };
    console.log('[GET /account] returning:', errBody);
    return res.status(400).json(errBody);
  }

  try {
    const result = await findAccountByDeviceIdAndRole(deviceId, role);

    if (!result) {
      const errBody = {
        success: false,
        error: {
          code: 'ACCOUNT_NOT_FOUND',
          message: 'No account was found for the provided deviceId and role.',
        },
      };
      console.log('[GET /account] returning:', errBody);
      return res.status(404).json(errBody);
    }

    const okBody = {
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
    };
    console.log('[GET /account] returning:', okBody);
    return respondJson(res, okBody);
  } catch (error) {
    console.error('Get account error:', error);
    const errBody = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to load account data.',
      },
    };
    console.log('[GET /account] returning:', errBody);
    return res.status(500).json(errBody);
  }
});
