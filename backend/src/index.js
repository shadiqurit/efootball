import 'dotenv/config';
import { db, transaction } from './db.js';
import { createApp } from './app.js';
if (!process.env.APP_ORIGIN || !process.env.DB_NAME || !process.env.DB_USER)
  throw new Error('Set APP_ORIGIN, DB_NAME and DB_USER in .env before starting.');
const frontendOrigin = new URL(process.env.APP_ORIGIN);
if (
  frontendOrigin.origin !== process.env.APP_ORIGIN ||
  !['http:', 'https:'].includes(frontendOrigin.protocol)
)
  throw new Error(
    'APP_ORIGIN must be the exact frontend origin, without a path or trailing slash.',
  );
if (process.env.NODE_ENV === 'production' && !process.env.APP_ORIGIN.startsWith('https://'))
  throw new Error('Production requires an HTTPS APP_ORIGIN.');
await db.query("SET time_zone = '+00:00'");
const server = createApp(db, transaction).listen(Number(process.env.PORT || 3000), () =>
  console.log(`Touchline API listening on port ${process.env.PORT || 3000}`),
);
async function shutdown() {
  server.close(async () => {
    await db.end();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
