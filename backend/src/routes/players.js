import { Router } from 'express';
import { id, playerSchema, listSchema } from '../validation.js';
import { accountScope, requireDatabaseAdmin } from '../permissions.js';

export function createPlayersRoutes(db) {
  const router = Router();
  router.get('/players', async (req, res) => {
    const input = listSchema.parse(req.query);
    const clauses = [],
      args = [];
    if (input.q) {
      clauses.push('(p.NAME LIKE ? OR p.PLAYER_CODE LIKE ?)');
      const term = `%${input.q.replace(/[\\%_]/g, '\\$&')}%`;
      args.push(term, term);
    }
    if (input.position) {
      clauses.push('p.POSITION_CODE=?');
      args.push(input.position);
    }
    if (input.country) {
      clauses.push('p.COUNTRY=?');
      args.push(input.country);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const order = {
      name: 'p.NAME',
      recent: 'p.UPD_DATE DESC,p.PLAYER_ID DESC',
      country: 'p.COUNTRY,p.NAME',
    }[input.sort];
    const [counts] = await db.execute(`SELECT COUNT(*) total FROM PLAYERS p ${where}`, args);
    const scope = accountScope(req.user);
    const [rows] = await db.execute(
      `SELECT p.*, (SELECT COUNT(*) FROM ASSIGNMENTS a JOIN GAME_ACCOUNTS g ON g.ID=a.GAME_ACCOUNT_ID WHERE a.PLAYER_ID=p.PLAYER_ID AND ${scope.clause}) ACCOUNT_COUNT FROM PLAYERS p ${where} ORDER BY ${order} LIMIT ${input.limit} OFFSET ${(input.page - 1) * input.limit}`,
      [...scope.args, ...args],
    );
    res.json({ rows, total: counts[0].total });
  });
  router.get('/filters', async (req, res) => {
    const [countries] = await db.execute(
      'SELECT DISTINCT COUNTRY FROM PLAYERS WHERE COUNTRY IS NOT NULL ORDER BY COUNTRY',
    );
    res.json({ countries: countries.map((r) => r.COUNTRY) });
  });
  router.post('/players', requireDatabaseAdmin, async (req, res) => {
    const p = playerSchema.parse(req.body),
      keys = Object.keys(p);
    const [result] = await db.execute(
      `INSERT INTO PLAYERS (${keys.join(',')},UPD_DATE,UPD_BY) VALUES (${keys.map(() => '?').join(',')},UTC_TIMESTAMP(),?)`,
      [...Object.values(p), req.user.ID],
    );
    res.status(201).json({ PLAYER_ID: result.insertId });
  });
  router.put('/players/:id', requireDatabaseAdmin, async (req, res) => {
    const p = playerSchema.parse(req.body);
    const [result] = await db.execute(
      `UPDATE PLAYERS SET ${Object.keys(p)
        .map((k) => `${k}=?`)
        .join(',')},UPD_DATE=UTC_TIMESTAMP(),UPD_BY=? WHERE PLAYER_ID=?`,
      [...Object.values(p), req.user.ID, id.parse(req.params.id)],
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Player not found.' });
    res.json({ message: 'Player updated.' });
  });
  router.delete('/players/:id', requireDatabaseAdmin, async (req, res) => {
    const [result] = await db.execute('DELETE FROM PLAYERS WHERE PLAYER_ID=?', [
      id.parse(req.params.id),
    ]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Player not found.' });
    res.status(204).end();
  });
  return router;
}
