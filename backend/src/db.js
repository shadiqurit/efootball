import 'dotenv/config';
import mysql from 'mysql2/promise';
export const db = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: Math.max(1, Math.min(10, Number(process.env.DB_POOL_SIZE || 5))),
  waitForConnections: true,
  queueLimit: 50,
  charset: 'utf8mb4',
  dateStrings: true,
  decimalNumbers: true,
  multipleStatements: false,
  timezone: 'Z',
});
export async function withTransaction(pool, fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
export const transaction = (fn) => withTransaction(db, fn);
