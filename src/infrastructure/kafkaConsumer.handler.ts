/**
 * Business-side handling for transaction events read from Kafka.
 */
import type { ConsumerPushOfflineBody } from "../modules/account/account.service";
import { deductOfflineBalanceFromConsumerPush } from "../modules/account/account.service";

/**
 * Accepts either the webhook-shaped body `{ deviceId, transactions }` or the Kafka
 * envelope from `pushOfflineTransactions` (`source: "sync.push"` + single `payload`).
 */
export function parseConsumerPushOfflineBody(
  parsed: unknown,
): ConsumerPushOfflineBody | null {
  if (!parsed || typeof parsed !== "object") return null;
  const o = parsed as Record<string, unknown>;

  if (
    typeof o.deviceId === "string" &&
    o.deviceId.trim() &&
    Array.isArray(o.transactions)
  ) {
    return {
      deviceId: o.deviceId.trim(),
      transactions: o.transactions as ConsumerPushOfflineBody["transactions"],
    };
  }

  if (
    o.source === "sync.push" &&
    typeof o.deviceId === "string" &&
    o.deviceId.trim() &&
    o.payload !== undefined &&
    o.payload !== null &&
    typeof o.payload === "object"
  ) {
    return {
      deviceId: o.deviceId.trim(),
      transactions: [
        o.payload as ConsumerPushOfflineBody["transactions"][number],
      ],
    };
  }

  return null;
}

export async function callDownstreamApi(payload: unknown): Promise<void> {
  const url = process.env.DOWNSTREAM_WEBHOOK_URL?.trim();
  if (!url) {
    console.log(
      "[Downstream]: Stub — set DOWNSTREAM_WEBHOOK_URL (and optional DOWNSTREAM_API_KEY) to enable outbound calls",
    );
    return;
  }

  // Reserved: map `payload` to the API body and use fetch() with timeout / auth headers.
  console.log(
    "[Downstream]: DOWNSTREAM_WEBHOOK_URL is set but HTTP integration is not implemented yet",
    { url },
  );
}

export async function handleTransactionKafkaMessage(
  parsed: unknown,
): Promise<void> {
  const eventId =
    typeof parsed === "object" && parsed !== null && "event_id" in parsed
      ? (parsed as { event_id: unknown }).event_id
      : undefined;
  console.log("[Kafka handler]: Processing message", { event_id: eventId });

  const pushBody = parseConsumerPushOfflineBody(parsed);
  if (pushBody) {
    const { deductedTxIds, skippedTxIds } =
      await deductOfflineBalanceFromConsumerPush(pushBody);
    console.log("[Kafka handler]: offline_balance deduction", {
      deductedTxIds,
      skippedTxIds,
    });
  }
}
