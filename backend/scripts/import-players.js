import { db, transaction } from '../src/db.js';
import { sourcePlayers } from './source-data.js';
try {
  const players = await sourcePlayers();
  let imported = 0;
  await transaction(async (conn) => {
    for (const p of players) {
      const [found] = await conn.execute('SELECT PLAYER_ID FROM PLAYERS WHERE PLAYER_CODE=?', [
        p.PLAYER_CODE,
      ]);
      if (found.length) continue;
      const [collision] = await conn.execute('SELECT PLAYER_ID FROM PLAYERS WHERE PLAYER_ID=?', [
        p.PLAYER_ID,
      ]);
      // Preserve original source IDs on a fresh DB; let MySQL allocate IDs on later imports.
      const entry = { ...p };
      if (collision.length) delete entry.PLAYER_ID;
      await conn.execute(
        `INSERT INTO PLAYERS (${Object.keys(entry).join(',')}) VALUES (${Object.keys(entry)
          .map(() => '?')
          .join(',')})`,
        Object.values(entry),
      );
      imported++;
    }
  });
  console.log(`Imported ${imported} players; existing player codes were skipped.`);
} finally {
  await db.end();
}
