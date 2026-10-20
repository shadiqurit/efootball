import { writeFile } from 'node:fs/promises';
import mysql from 'mysql2';
import { sourcePlayers } from './source-data.js';
const players = await sourcePlayers();
const sql =
  '-- Generated from PLAYERS.sql and FootballPlayers.csv. Import once into an EMPTY PLAYERS table.\nSET NAMES utf8mb4;\nSTART TRANSACTION;\n' +
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
