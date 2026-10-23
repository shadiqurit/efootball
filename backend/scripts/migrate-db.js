import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { db } from '../src/db.js';
import { migrateAccessControl } from './migrate-access.js';

// Both fresh installs and upgrades use the same reference data and additive migration.
export async function migratePlayingStyles(pool) {
  const sql = await readFile(
    new URL('../database/migrations/002_playing_styles.sql', import.meta.url),
    'utf8',
  );
  for (const statement of sql
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)) {
    if (statement.startsWith('ALTER TABLE')) {
      const [columns] = await pool.execute(
        "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ASSIGNMENTS' AND COLUMN_NAME='PLAYING_STYLE_ID'",
      );
      if (columns.length) continue;
    }
    await pool.query(statement);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await migratePlayingStyles(db);
    await migrateAccessControl(db);
    console.log(
      'Playing styles, user roles and squad ownership are ready. Existing data preserved.',
    );
  } finally {
    await db.end();
  }
}
