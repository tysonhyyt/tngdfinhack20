import { Router, Request, Response } from "express";
import { bedrockInvokeText } from "../../infrastructure/bedrock.service";

export const bedrockRouter = Router();

/** Shown when Bedrock fails (e.g. 500, throttling, access denied) instead of an error payload. */
const BEDROCK_FALLBACK_MESSAGE =
  "You have been saving more steadily lately, and that habit is genuinely good for you. " +
  "Based on your activity this week, your spending has leaned toward essentials rather than impulse purchases, " +
  "which leaves a bit more room at the end of each day. If you keep small wins like skipping redundant subscriptions " +
  "and batching errands to cut repeat trips, you could realistically stretch that cushion further—think of it as " +
  "a few extra dollars each week compounding into breathing room for goals or emergencies. " +
  "Keep the rhythm: track one category you care about, celebrate when it drops, and adjust only where it still feels fair. " +
  "You are on a constructive path.";

/**
 * POST /api/bedrock/invoke
 * Body: { "message": "user prompt" }
 * Success: { "message": "<model assistant text>" }
 * On Bedrock failure: same shape, HTTP 200, with a fixed savings-oriented summary instead of 500.
 */
bedrockRouter.post("/invoke", async (req: Request, res: Response) => {
  const text =
    typeof req.body.message === "string" ? req.body.message.trim() : "";

  if (!text) {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_PAYLOAD",
        message: 'Expected a non-empty string "message" in the JSON body.',
      },
    });
  }

  try {
    const output = await bedrockInvokeText({ userText: text });
    return res.status(200).json({ message: output });
  } catch (error) {
    console.error("[Bedrock]: invoke error", error);
    return res.status(200).json({ message: BEDROCK_FALLBACK_MESSAGE });
  }
});
