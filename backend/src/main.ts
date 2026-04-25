import "dotenv/config";
import express from "express";
import { transactionRouter } from "./modules/transaction/transaction.controller";
import { kafkaProducer } from "./infrastructure/kafka.service";

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Routes
app.use("/api/transactions", transactionRouter);

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

const server = app.listen(port, async () => {
  try {
    await kafkaProducer.connect();
    console.log(`[Server]: Backend running on port ${port}`);
  } catch (error) {
    console.error("[Kafka]: Failed to connect producer", error);
    process.exit(1);
  }
});

async function shutdown(signal: NodeJS.Signals) {
  console.log(`[Server]: Received ${signal}, shutting down...`);

  try {
    await kafkaProducer.disconnect();
  } catch (error) {
    console.error("[Kafka]: Error while disconnecting producer", error);
  }

  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
