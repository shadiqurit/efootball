import { readFile } from 'node:fs/promises';
import { db } from '../src/db.js';
import { migratePlayingStyles } from './migrate-db.js';
try {
  const sql = await readFile(new URL('../database/schema.sql', import.meta.url), 'utf8');
  for (const statement of sql
    .replace(/^--.*$/gm, '')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean))
    await db.query(statement);
  await migratePlayingStyles(db);
  console.log('Schema ready. Existing tables and records were preserved.');
} finally {
  await db.end();
}
