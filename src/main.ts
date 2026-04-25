import "dotenv/config";
import express from "express";
import { accountRouter, sessionRouter } from "./modules/account/account.controller";
import { transactionSyncRouter } from "./modules/transaction/transaction.controller";
import {
  KafkaConsumerService,
  kafkaProducer,
} from "./infrastructure/kafka.service";
import { connectDatabase } from "./infrastructure/db.service";

const kafkaConsumer = new KafkaConsumerService();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Routes
app.use("/session", sessionRouter);
app.use("/account", accountRouter);
app.use("/sync", transactionSyncRouter);

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

let server: ReturnType<typeof app.listen>;

async function start() {
  try {
    await connectDatabase();
    await kafkaProducer.connect();
    await kafkaConsumer.start();

    server = app.listen(port, () => {
      console.log(`[Server]: Backend running on port ${port}`);
    });
  } catch (error) {
    console.error("[Startup]: Failed to start server", error);
    process.exit(1);
  }
}

async function shutdown(signal: NodeJS.Signals) {
  console.log(`[Server]: Received ${signal}, shutting down...`);

  try {
    await kafkaConsumer.disconnect();
  } catch (error) {
    console.error("[Kafka]: Error while disconnecting consumer", error);
  }

  try {
    await kafkaProducer.disconnect();
  } catch (error) {
    console.error("[Kafka]: Error while disconnecting producer", error);
  }

  server?.close(() => {
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

void start();
