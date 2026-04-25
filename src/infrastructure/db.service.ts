import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export const dbPool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  database: process.env.DB_NAME || 'mysql',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  waitForConnections: true,
  connectionLimit: 10,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

export async function connectDatabase(): Promise<void> {
  try {
    const conn = await dbPool.getConnection();
    await conn.ping();
    conn.release();
    console.log('[DB]: Connected to MySQL');
  } catch (error) {
    console.error('[DB]: Failed to connect to MySQL', error);
    throw error;
  }
}
