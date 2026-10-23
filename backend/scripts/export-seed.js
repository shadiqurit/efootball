import { readFile, writeFile } from 'node:fs/promises';
import mysql from 'mysql2';
import { sourcePlayers } from './source-data.js';
let players;
try {
  players = JSON.parse(
    await readFile(new URL('../data/players-excel.json', import.meta.url), 'utf8'),
  );
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  players = await sourcePlayers();
}
const sql =
  '-- Generated from the full Excel extraction when available. Import once into an EMPTY PLAYERS table.\nSET NAMES utf8mb4;\nSTART TRANSACTION;\n' +
  players
    .map(
      (p) =>
        `INSERT INTO PLAYERS (${Object.keys(p).join(',')}) VALUES (${Object.values(p)
          .map((v) => mysql.escape(v))
          .join(',')});`,
    )
    .join('\n') +
  '\nCOMMIT;\n';
await writeFile(new URL('../database/players-seed.sql', import.meta.url), sql, 'utf8');
console.log(`Generated a phpMyAdmin-compatible seed with ${players.length} players.`);
