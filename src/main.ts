import "dotenv/config";
import express from "express";
import { sessionRouter } from "./modules/session/session.controller";
import { accountRouter } from "./modules/account/account.controller";
import { transactionRouter, transactionSyncRouter } from "./modules/transaction/transaction.controller";
import { kafkaProducer } from "./infrastructure/kafka.service";
import { connectDatabase, dbPool } from "./infrastructure/db.service";

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use("/account", accountRouter);

// Routes
app.use("/api/transactions", transactionRouter);
app.use("/sync", transactionSyncRouter);
app.use("/session", sessionRouter);

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// DB connectivity test
app.get('/api/db-test', async (req, res) => {
  try {
    const [rows] = await dbPool.query('SELECT NOW() AS now');
    const nowValue = Array.isArray(rows) && rows.length > 0 ? (rows[0] as any).now : null;
    res.json({ success: true, now: nowValue });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

let server: ReturnType<typeof app.listen>;

async function start() {
  try {
    await connectDatabase();
    await kafkaProducer.connect();

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
