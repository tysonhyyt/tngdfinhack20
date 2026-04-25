import { Consumer, Kafka, Producer, SASLOptions, logLevel } from "kafkajs";
import { handleTransactionKafkaMessage } from "./kafkaConsumer.handler";

function buildSaslOptions(): SASLOptions | undefined {
  const mechanism = process.env.KAFKA_SASL_MECHANISM?.trim().toLowerCase();
  if (!mechanism) return undefined;

  const username = process.env.KAFKA_SASL_USERNAME?.trim();
  const password = process.env.KAFKA_SASL_PASSWORD;
  if (!username || !password) {
    throw new Error(
      "KAFKA_SASL_USERNAME and KAFKA_SASL_PASSWORD are required when KAFKA_SASL_MECHANISM is set",
    );
  }

  switch (mechanism) {
    case "plain":
      return { mechanism: "plain", username, password };
    case "scram-sha-256":
      return { mechanism: "scram-sha-256", username, password };
    case "scram-sha-512":
      return { mechanism: "scram-sha-512", username, password };
    default:
      throw new Error(
        "Unsupported KAFKA_SASL_MECHANISM. Use one of: plain, scram-sha-256, scram-sha-512",
      );
  }
}

export function createKafkaClient(): Kafka {
  const brokerList = (process.env.KAFKA_BOOTSTRAP_SERVERS || "")
    .split(",")
    .map((broker) => broker.trim())
    .filter(Boolean);

  if (brokerList.length === 0) {
    throw new Error("KAFKA_BOOTSTRAP_SERVERS is required");
  }

  const sasl = buildSaslOptions();
  const sslEnabled = process.env.KAFKA_SSL?.trim().toLowerCase() === "true";
  const rejectUnauthorized =
    process.env.KAFKA_SSL_REJECT_UNAUTHORIZED?.trim().toLowerCase() !== "false";
  const ssl = sslEnabled ? { rejectUnauthorized } : false;

  return new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || "backend-api-ingress",
    brokers: brokerList,
    ssl,
    sasl,
    logLevel: logLevel.INFO,
    connectionTimeout: 10000,
    requestTimeout: 30000,
  });
}

export class KafkaProducerService {
  private readonly producer: Producer;
  private isConnected = false;

  constructor() {
    const kafka = createKafkaClient();
    this.producer = kafka.producer();
  }

  async connect() {
    if (this.isConnected) return;

    await this.producer.connect();
    this.isConnected = true;
    console.log("[Kafka]: Producer connected");
  }

  async disconnect() {
    if (!this.isConnected) return;

    await this.producer.disconnect();
    this.isConnected = false;
    console.log("[Kafka]: Producer disconnected");
  }

  async sendTransactionEvent(topic: string, message: unknown) {
    await this.connect();

    await this.producer.send({
      topic,
      messages: [{ value: JSON.stringify(message) }],
    });
  }
}

export class KafkaConsumerService {
  private readonly consumer: Consumer;
  private started = false;

  constructor() {
    const groupId = process.env.KAFKA_CONSUMER_GROUP?.trim();
    if (!groupId) {
      throw new Error(
        "KAFKA_CONSUMER_GROUP is required when running the Kafka consumer",
      );
    }

    const kafka = createKafkaClient();
    this.consumer = kafka.consumer({ groupId: groupId });
  }

  async start() {
    if (this.started) return;

    const topic = process.env.KAFKA_TOPIC?.trim() || "offline.transact.sync";
    const fromBeginning =
      process.env.KAFKA_CONSUMER_FROM_BEGINNING?.trim().toLowerCase() ===
      "true";

    await this.consumer.connect();
    await this.consumer.subscribe({ topic, fromBeginning });
    this.started = true;
    console.log(`[Kafka]: Consumer subscribed to "${topic}"`);

    void this.consumer
      .run({
        eachMessage: async ({ topic, partition, message }) => {
          const raw = message.value?.toString();
          if (raw === undefined) {
            console.warn("[Kafka]: Skipping message with empty value", {
              topic,
              partition,
            });
            return;
          }

          let parsed: unknown;
          try {
            parsed = JSON.parse(raw);
          } catch (error) {
            console.error("[Kafka]: Invalid JSON message", {
              topic,
              partition,
              error,
            });
            return;
          }

          try {
            await handleTransactionKafkaMessage(parsed);
          } catch (error) {
            console.error(
              "[Kafka]: Handler error (not rethrowing; message will be committed)",
              { topic, partition, error },
            );
          }
        },
      })
      .catch((error) => {
        console.error("[Kafka]: Consumer run loop ended with error", error);
        this.started = false;
      });
  }

  async disconnect() {
    if (!this.started) {
      try {
        await this.consumer.disconnect();
      } catch {
        /* ignore */
      }
      return;
    }

    await this.consumer.disconnect();
    this.started = false;
    console.log("[Kafka]: Consumer disconnected");
  }
}

export const kafkaProducer = new KafkaProducerService();
