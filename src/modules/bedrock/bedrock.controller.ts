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

/** Fixed prompt for GET /invoke (no client payload). */
const BEDROCK_DEFAULT_USER_PROMPT =
  "In 2–3 short paragraphs, give friendly generic advice about weekly spending habits, saving a little more, and staying motivated. Do not claim access to real transaction data.";

/**
 * GET /api/bedrock/invoke
 * No body or query parameters. Uses a built-in prompt, then returns { "message": "<model text>" }.
 * On Bedrock failure: same shape, HTTP 200, with a fixed savings-oriented summary.
 */
bedrockRouter.get("/invoke", async (_req: Request, res: Response) => {
  try {
    const output = await bedrockInvokeText({
      userText: BEDROCK_DEFAULT_USER_PROMPT,
    });
    return res.status(200).json({ message: output });
  } catch (error) {
    console.error("[Bedrock]: invoke error", error);
    return res.status(200).json({ message: BEDROCK_FALLBACK_MESSAGE });
  }
});
