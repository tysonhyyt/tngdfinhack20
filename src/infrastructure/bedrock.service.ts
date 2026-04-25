import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

export function getBedrockRegion(): string {
  return (
    process.env.AWS_REGION?.trim() ||
    process.env.BEDROCK_REGION?.trim() ||
    "us-east-1"
  );
}

let client: BedrockRuntimeClient | null = null;

export function getBedrockRuntimeClient(): BedrockRuntimeClient {
  if (!client) {
    client = new BedrockRuntimeClient({ region: getBedrockRegion() });
  }
  return client;
}

export function requireBedrockModelId(): string {
  const id = process.env.BEDROCK_MODEL_ID?.trim();
  if (!id) {
    throw new Error(
      "BEDROCK_MODEL_ID is required (e.g. us.anthropic.claude-haiku-4-5-20251001-v1:0)",
    );
  }
  return id;
}

function defaultMaxTokens(): number {
  const raw = process.env.BEDROCK_MAX_TOKENS?.trim();
  if (!raw) return 1024;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 1024;
}

export interface BedrockInvokeTextParams {
  userText: string;
  systemPrompt?: string;
  maxTokens?: number;
}

type AnthropicInvokeBody = {
  anthropic_version: string;
  max_tokens: number;
  messages: Array<{ role: string; content: string }>;
  system?: string;
};

type AnthropicInvokeResult = {
  content?: Array<{ text?: string }>;
};

export async function bedrockInvokeText(
  params: BedrockInvokeTextParams,
): Promise<string> {
  const body: AnthropicInvokeBody = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: params.maxTokens ?? defaultMaxTokens(),
    messages: [{ role: "user", content: params.userText }],
  };
  if (params.systemPrompt) {
    body.system = params.systemPrompt;
  }

  const response = await getBedrockRuntimeClient().send(
    new InvokeModelCommand({
      modelId: requireBedrockModelId(),
      body: new TextEncoder().encode(JSON.stringify(body)),
    }),
  );

  const result = JSON.parse(
    new TextDecoder().decode(response.body),
  ) as AnthropicInvokeResult;
  const text = result.content?.[0]?.text;
  if (typeof text !== "string") {
    throw new Error("Bedrock response missing content[0].text");
  }
  return text;
}
