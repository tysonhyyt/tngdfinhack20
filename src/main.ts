import "dotenv/config";
import express from "express";
import { accountRouter } from "./modules/account/account.controller";
import {
  transactionRouter,
  transactionSyncRouter,
} from "./modules/transaction/transaction.controller";
import {
  KafkaConsumerService,
  kafkaProducer,
} from "./infrastructure/kafka.service";
import { connectDatabase, dbPool } from "./infrastructure/db.service";

const kafkaConsumer = new KafkaConsumerService();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use("/account", accountRouter);

// Routes
app.use("/api/transactions", transactionRouter);
app.use("/sync", transactionSyncRouter);

// Health check
app.get("/health", (req, res) => {
  console.log("[GET /health] payload (query):", req.query);
  const body = { status: "ok", timestamp: new Date().toISOString() };
  console.log("[GET /health] returning:", body);
  res.status(200).json(body);
});

// DB connectivity test
app.get("/api/db-test", async (req, res) => {
  console.log("[GET /api/db-test] payload (query):", req.query);
  try {
    const [rows] = await dbPool.query("SELECT NOW() AS now");
    const nowValue =
      Array.isArray(rows) && rows.length > 0 ? (rows[0] as any).now : null;
    const body = { success: true, now: nowValue };
    console.log("[GET /api/db-test] returning:", body);
    res.json(body);
  } catch (error) {
    const body = { success: false, error: (error as Error).message };
    console.log("[GET /api/db-test] returning:", body);
    res.status(500).json(body);
  }
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
