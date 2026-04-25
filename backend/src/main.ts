import express from 'express';
import dotenv from 'dotenv';
import { transactionRouter } from './modules/transaction/transaction.controller';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Routes
app.use('/api/transactions', transactionRouter);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`[Server]: Backend running on port ${port}`);
});
