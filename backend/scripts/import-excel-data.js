import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { db, transaction } from '../src/db.js';
import { sourcePlayers } from './source-data.js';

// Typed JSON extracted from the unchanged Excel workbook. No Excel runtime dependency.
const fields = [
  'PLAYER_ID',
  'FIRST_NAME',
  'LAST_NAME',
  'NAME',
  'PLAYER_CODE',
  'COUNTRY',
  'DOB',
  'SUB_POSITION',
  'POSITION',
  'FOOT',
  'HEIGHT_CM',
  'POSITIONS',
  'POSITION_CODE',
  'UPD_DATE',
  'UPD_BY',
];
const replaceInitialSeed = process.argv.includes('--replace-initial-seed');
try {
  const rows = JSON.parse(
    await readFile(new URL('../data/players-excel.json', import.meta.url), 'utf8'),
  );
  if (!Array.isArray(rows) || !rows.length) throw new Error('Excel extraction is empty.');
  const incoming = new Map();
  for (const row of rows) {
    if (
      !Number.isInteger(row.PLAYER_ID) ||
      row.PLAYER_ID < 1 ||
      row.PLAYER_ID > 4294967295 ||
      incoming.has(row.PLAYER_ID)
    )
      throw new Error('Excel player IDs must be unique positive integers.');
    if (fields.some((field) => !(field in row)))
      throw new Error(`Missing columns for player ${row.PLAYER_ID}.`);
    for (const field of fields.filter(
      (f) => !['PLAYER_ID', 'HEIGHT_CM', 'UPD_BY', 'DOB', 'UPD_DATE'].includes(f),
    )) {
      if (
        row[field] != null &&
        (typeof row[field] !== 'string' ||
          row[field].length > (field === 'POSITION_CODE' ? 20 : 100))
      )
        throw new Error(`Invalid ${field} for player ${row.PLAYER_ID}.`);
    }
    if (!row.NAME || !row.PLAYER_CODE)
      throw new Error(`Missing name/code for player ${row.PLAYER_ID}.`);
    for (const field of ['DOB', 'UPD_DATE']) {
      if (row[field] != null && !/^\d{4}-\d{2}-\d{2}(?: \d{2}:\d{2}:\d{2})?$/.test(row[field]))
        throw new Error(`Invalid ${field} for player ${row.PLAYER_ID}.`);
    }
    for (const [field, max] of [
      ['HEIGHT_CM', 65535],
      ['UPD_BY', 4294967295],
    ]) {
      if (
        row[field] != null &&
        (!Number.isInteger(row[field]) || row[field] < 0 || row[field] > max)
      )
        throw new Error(`Invalid ${field} for player ${row.PLAYER_ID}.`);
    }
    incoming.set(row.PLAYER_ID, row);
  }
  const [existing] = await db.query('SELECT * FROM PLAYERS ORDER BY PLAYER_ID');
  const existingIds = new Set(existing.map((row) => row.PLAYER_ID));
  if (replaceInitialSeed) {
    const legacy = new Map((await sourcePlayers()).map((row) => [row.PLAYER_ID, row]));
    if (
      existing.length !== legacy.size ||
      existing.some(
        (row) =>
          !legacy.has(row.PLAYER_ID) ||
          fields.some((field) => row[field] !== legacy.get(row.PLAYER_ID)[field]),
      )
    )
      throw new Error(
        'Only the unchanged original seed can be replaced; edited records will not be overwritten.',
      );
    const [counts] = await db.query(
      'SELECT (SELECT COUNT(*) FROM ASSIGNMENTS) assignments,(SELECT COUNT(*) FROM GAME_ACCOUNTS) accounts',
    );
    if (counts[0].assignments || counts[0].accounts)
      throw new Error('Existing squads prevent initial-seed ID replacement.');
    if (existing.some((row) => !incoming.has(row.PLAYER_ID)))
      throw new Error('Workbook must cover every seed ID.');
  } else {
    const conflict = existing.find(
      (row) =>
        incoming.has(row.PLAYER_ID) && row.PLAYER_CODE !== incoming.get(row.PLAYER_ID).PLAYER_CODE,
    );
    if (conflict)
      throw new Error(
        `Player ID ${conflict.PLAYER_ID} belongs to a different code. Import stopped.`,
      );
  }
  const backupDir = new URL('../backups/', import.meta.url);
  await mkdir(backupDir, { recursive: true });
  const backup = new URL(`players-before-excel-${Date.now()}.json`, backupDir);
  await writeFile(backup, JSON.stringify(existing), 'utf8');
  const [indexes] = await db.query('SHOW INDEX FROM PLAYERS');
  if (indexes.some((index) => index.Key_name === 'uq_player_code')) {
    await db.query(
      'ALTER TABLE PLAYERS DROP INDEX uq_player_code, ADD INDEX ix_player_code (PLAYER_CODE)',
    );
  }
  let inserted = 0,
    updated = 0;
  await transaction(async (conn) => {
    if (replaceInitialSeed) {
      for (const row of existing) {
        const replacement = incoming.get(row.PLAYER_ID);
        await conn.execute(
          `UPDATE PLAYERS SET ${fields
            .slice(1)
            .map((field) => `${field}=?`)
            .join(',')} WHERE PLAYER_ID=?`,
          [...fields.slice(1).map((field) => replacement[field]), row.PLAYER_ID],
        );
        updated++;
      }
    }
    const newRows = rows.filter((row) => !existingIds.has(row.PLAYER_ID));
    for (let start = 0; start < newRows.length; start += 500) {
      const batch = newRows.slice(start, start + 500);
      await conn.query(`INSERT INTO PLAYERS (${fields.join(',')}) VALUES ?`, [
        batch.map((row) => fields.map((field) => row[field])),
      ]);
      inserted += batch.length;
    }
    const [counts] = await conn.query('SELECT COUNT(*) total FROM PLAYERS');
    if (counts[0].total !== existing.length + inserted)
      throw new Error('Import count did not reconcile.');
  });
  console.log(
    JSON.stringify({
      sourceRows: rows.length,
      inserted,
      updated,
      skipped: rows.length - inserted - updated,
      backup: backup.pathname,
    }),
  );
} finally {
  await db.end();
}
