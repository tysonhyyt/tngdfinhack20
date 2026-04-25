import { Kafka, Producer, SASLOptions, logLevel } from "kafkajs";

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

export class KafkaProducerService {
  private readonly producer: Producer;
  private isConnected = false;

  constructor() {
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

    const kafka = new Kafka({
      clientId: process.env.KAFKA_CLIENT_ID || "backend-api-ingress",
      brokers: brokerList,
      ssl,
      sasl,
      logLevel: logLevel.INFO,
      connectionTimeout: 10000,
      requestTimeout: 30000,
    });

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

export const kafkaProducer = new KafkaProducerService();
