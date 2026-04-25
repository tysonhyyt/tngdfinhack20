const mysql = require('mysql2/promise');
const { randomUUID } = require('crypto');

(async () => {
  const pool = mysql.createPool({
    host: 'tngfinhack20.mysql.polardb.kualalumpur.rds.aliyuncs.com',
    port: 3306,
    user: 'svcdbuser',
    password: 'MINkf!0i6',
    database: 'tngdfinhack',
    waitForConnections: true,
    connectionLimit: 2,
  });

  try {
    const deviceId = 'user-abc123';
    const role = 'user';
    const [rows] = await pool.query(
      'SELECT COUNT(*) AS cnt FROM account WHERE device_id = ? AND role = ?',
      [deviceId, role]
    );

    const exists = rows[0].cnt > 0;
    if (exists) {
      console.log('ALREADY_EXISTS');
    } else {
      await pool.query(
        'INSERT INTO account (account_id, user_id, device_id, role, offline_balance, currency) VALUES (?, ?, ?, ?, ?, ?)',
        [randomUUID(), deviceId, deviceId, role, 1000.00, 'USD']
      );
      console.log('INSERTED');
    }
  } catch (err) {
    console.error('ERROR', err.message || err);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
