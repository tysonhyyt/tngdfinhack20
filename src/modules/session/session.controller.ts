import { Router, Request, Response } from "express";
import { sessionFindOrCreateAccountByDeviceIdAndRole } from "../account/account.service";

export const sessionRouter = Router();

sessionRouter.post("/init", async (req: Request, res: Response) => {
  const deviceId =
    typeof req.body.deviceId === "string" ? req.body.deviceId.trim() : "";
  const role =
    typeof req.body.role === "string" ? req.body.role.trim() : "";

  if (!deviceId || !role) {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_PAYLOAD",
        message: "deviceId and role are required",
      },
    });
  }

  try {
    const account = await sessionFindOrCreateAccountByDeviceIdAndRole(deviceId, role);
    return res.json({
      success: true,
      userId: account.account.user_id,
      displayName: account.displayName,
      offlineBalance: Number(account.account.offline_balance),
      status: account.status,
      ...(account.merchantName && { merchantName: account.merchantName }),
    });
  } catch (error) {
    console.error("Session init error:", error);
    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to initialize session",
      },
    });
  }
});