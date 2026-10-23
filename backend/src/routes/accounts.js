import { Router } from 'express';
import { z } from 'zod';
import { id, accountSchema } from '../validation.js';
import { accountScope, requireSuperAdmin } from '../permissions.js';

export function createAccountsRoutes(db, transaction) {
  const router = Router();
  router.get('/accounts', async (req, res) => {
    const scope = accountScope(req.user);
    const [rows] = await db.execute(
      `SELECT g.*,u.NAME OWNER_NAME,COUNT(a.ID) PLAYER_COUNT,ROUND(AVG(a.RATING),1) AVG_RATING,MAX(a.RATING) BEST_RATING FROM GAME_ACCOUNTS g JOIN USERS u ON u.ID=g.OWNER_ID LEFT JOIN ASSIGNMENTS a ON a.GAME_ACCOUNT_ID=g.ID WHERE ${scope.clause} GROUP BY g.ID,u.NAME ORDER BY g.CREATED_AT,g.ID`,
      scope.args,
    );
    res.json(rows);
  });
  router.post('/accounts', async (req, res) => {
    const a = accountSchema.parse(req.body);
    const [result] = await db.execute(
      'INSERT INTO GAME_ACCOUNTS (LABEL,GAME_ID,PLATFORM,NOTES,OWNER_ID) VALUES (?,?,?,?,?)',
      [a.LABEL, a.GAME_ID, a.PLATFORM, a.NOTES, req.user.ID],
    );
    res.status(201).json({ ID: result.insertId });
  });
  router.patch('/accounts/:id/owner', requireSuperAdmin, async (req, res) => {
    const accountId = id.parse(req.params.id);
    const { OWNER_ID } = z.object({ OWNER_ID: id }).strict().parse(req.body);
    await transaction(async (conn) => {
      const [users] = await conn.execute(
        'SELECT ID FROM USERS WHERE ID=? AND IS_ACTIVE=1 FOR UPDATE',
        [OWNER_ID],
      );
      if (!users.length)
        throw Object.assign(new Error('Choose an active squad owner.'), { status: 404 });
      const [result] = await conn.execute('UPDATE GAME_ACCOUNTS SET OWNER_ID=? WHERE ID=?', [
        OWNER_ID,
        accountId,
      ]);
      if (!result.affectedRows) throw Object.assign(new Error('Squad not found.'), { status: 404 });
    });
    res.json({ message: 'Squad owner updated.' });
  });
  router.put('/accounts/:id', async (req, res) => {
    const a = accountSchema.parse(req.body);
    const scope = accountScope(req.user, 'GAME_ACCOUNTS');
    const [result] = await db.execute(
      `UPDATE GAME_ACCOUNTS SET LABEL=?,GAME_ID=?,PLATFORM=?,NOTES=? WHERE ID=? AND ${scope.clause}`,
      [a.LABEL, a.GAME_ID, a.PLATFORM, a.NOTES, id.parse(req.params.id), ...scope.args],
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Game ID not found.' });
    res.json({ message: 'Game ID updated.' });
  });
  router.delete('/accounts/:id', async (req, res) => {
    const scope = accountScope(req.user, 'GAME_ACCOUNTS');
    const [result] = await db.execute(`DELETE FROM GAME_ACCOUNTS WHERE ID=? AND ${scope.clause}`, [
      id.parse(req.params.id),
      ...scope.args,
    ]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Game ID not found.' });
    res.status(204).end();
  });
  return router;
}
