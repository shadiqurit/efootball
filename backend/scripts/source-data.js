import { readFile } from 'node:fs/promises';
import { parse } from 'csv-parse/sync';
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
const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const pad = (n) => String(n).padStart(2, '0');
function clock(v) {
  const m = /(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)/i.exec(v);
  if (!m) return '00:00:00';
  return `${pad((Number(m[1]) % 12) + (m[4].toUpperCase() === 'PM' ? 12 : 0))}:${m[2]}:${m[3] || '00'}`;
}
export function csvDate(v) {
  if (!v) return null;
  const match = /^(\d{1,2})-([A-Z]{3})-(\d{4})/.exec(v);
  if (!match || !months.includes(match[2])) throw new Error(`Unrecognized source date: ${v}`);
  return `${match[3]}-${pad(months.indexOf(match[2]) + 1)}-${pad(match[1])}`;
}
export async function sourcePlayers() {
  const raw = await readFile(new URL('../data/PLAYERS.sql', import.meta.url));
  // Supplied SQL mixes UTF-8 names with damaged bytes in Lúcio.
  // Repair invalid single bytes while leaving valid multi-byte UTF-8 sequences intact.
  const repaired = [];
  for (let i = 0; i < raw.length;) {
    const byte = raw[i];
    if (byte < 128) {
      repaired.push(raw.subarray(i, ++i));
      continue;
    }
    const size =
      byte >= 0xc2 && byte <= 0xdf
        ? 2
        : byte <= 0xef && byte >= 0xe0
          ? 3
          : byte >= 0xf0 && byte <= 0xf4
            ? 4
            : 0;
    const part = raw.subarray(i, i + size);
    if (size && part.length === size && !part.toString('utf8').includes('\uFFFD')) {
      repaired.push(part);
      i += size;
    } else {
      repaired.push(Buffer.from(new TextDecoder('windows-1252').decode(raw.subarray(i, i + 1))));
      i++;
    }
  }
  const sql = Buffer.concat(repaired).toString('utf8').replaceAll('Lãºcio', 'Lúcio');
  const players = [];
  for (const match of sql.matchAll(/INSERT INTO PLAYERS[\s\S]*?VALUES\s*\(([\s\S]*?)\);/g)) {
    const tokens = match[1].match(/TO_DATE\s*\('[^']*',\s*'[^']*'\)|'(?:[^']|'')*'|NULL|\d+/g);
    if (tokens?.length !== fields.length)
      throw new Error('Could not parse original Oracle player row.');
    const values = tokens.map((t) => {
      if (t === 'NULL') return null;
      if (t.startsWith('TO_DATE')) {
        const m = /'(\d+)\/(\d+)\/(\d+)/.exec(t);
        return `${m[3]}-${pad(m[1])}-${pad(m[2])}${t.includes('HH:') ? ' ' + clock(t) : ''}`;
      }
      return t.startsWith("'") ? t.slice(1, -1).replaceAll("''", "'") : Number(t);
    });
    players.push(Object.fromEntries(fields.map((f, i) => [f, values[i]])));
  }
  const csv = parse(
    await readFile(new URL('../data/FootballPlayers.csv', import.meta.url), 'utf8'),
    { columns: true, skip_empty_lines: true, bom: true, trim: true },
  );
  for (const row of csv) {
    const code = row.Name.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    if (players.some((p) => p.PLAYER_CODE === code)) continue;
    players.push({
      PLAYER_ID: players.length + 1,
      FIRST_NAME: row['First Name'] || null,
      LAST_NAME: row['Last Name'] || null,
      NAME: row.Name,
      PLAYER_CODE: code,
      COUNTRY: row.Country || null,
      DOB: csvDate(row['Date Of Birth']),
      SUB_POSITION: row['Sub Position'] || null,
      POSITION: row.Position,
      FOOT: row.Foot || null,
      HEIGHT_CM: Number(row.Height) || null,
      POSITIONS: null,
      POSITION_CODE: row['Position Code'],
      UPD_DATE: row['Upd Date'] ? csvDate(row['Upd Date']) + ' ' + clock(row['Upd Date']) : null,
      UPD_BY: null,
    });
  }
  return players;
}
