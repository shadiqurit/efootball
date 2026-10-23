import { Router } from 'express';
import { z } from 'zod';
import { id, assignmentSchema, assignmentStyleSchema, rating } from '../validation.js';
import { accountScope, assertAccountAccess, assertAssignmentAccess } from '../permissions.js';

export function createAssignmentsRoutes(db, transaction) {
  const router = Router();
  router.get('/assignments', async (req, res) => {
    const accountId = id.parse(req.query.accountId);
    await assertAccountAccess(db, req.user, accountId);
    const scope = accountScope(req.user);
    const [rows] = await db.execute(
      `SELECT p.*,a.ID ASSIGNMENT_ID,a.RATING,a.PLAYING_STYLE_ID,s.NAME PLAYING_STYLE,a.CREATED_AT ASSIGNED_AT,a.UPDATED_AT FROM ASSIGNMENTS a JOIN PLAYERS p ON p.PLAYER_ID=a.PLAYER_ID LEFT JOIN PLAYING_STYLES s ON s.ID=a.PLAYING_STYLE_ID JOIN GAME_ACCOUNTS g ON g.ID=a.GAME_ACCOUNT_ID WHERE a.GAME_ACCOUNT_ID=? AND ${scope.clause} ORDER BY a.RATING DESC,p.NAME`,
      [accountId, ...scope.args],
    );
    res.json(rows);
  });
  router.post('/assignments', async (req, res) => {
    const a = assignmentSchema.parse(req.body);
    const assignmentId = await transaction(async (conn) => {
      await assertAccountAccess(conn, req.user, a.GAME_ACCOUNT_ID, true);
      const [result] = await conn.execute(
        'INSERT INTO ASSIGNMENTS (GAME_ACCOUNT_ID,PLAYER_ID,RATING,PLAYING_STYLE_ID) VALUES (?,?,?,?)',
        [a.GAME_ACCOUNT_ID, a.PLAYER_ID, a.RATING, a.PLAYING_STYLE_ID],
      );
      await conn.execute(
        'INSERT INTO RATING_HISTORY (ASSIGNMENT_ID,NEW_RATING,CHANGED_BY) VALUES (?,?,?)',
        [result.insertId, a.RATING, req.user.ID],
      );
      return result.insertId;
    });
    res.status(201).json({ ID: assignmentId });
  });
  router.patch('/assignments/:id/playing-style', async (req, res) => {
    const { PLAYING_STYLE_ID } = assignmentStyleSchema.parse(req.body);
    await assertAssignmentAccess(db, req.user, id.parse(req.params.id));
    const scope = accountScope(req.user);
    const [result] = await db.execute(
      `UPDATE ASSIGNMENTS SET PLAYING_STYLE_ID=? WHERE ID=? AND GAME_ACCOUNT_ID IN (SELECT g.ID FROM GAME_ACCOUNTS g WHERE ${scope.clause})`,
      [PLAYING_STYLE_ID, id.parse(req.params.id), ...scope.args],
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Assignment not found.' });
    res.json({ message: 'Playing style updated.' });
  });
  router.patch('/assignments/:id/rating', async (req, res) => {
    const assignmentId = id.parse(req.params.id),
      value = z.object({ RATING: rating }).strict().parse(req.body).RATING;
    await transaction(async (conn) => {
      await assertAssignmentAccess(conn, req.user, assignmentId, true);
      const [rows] = await conn.execute('SELECT RATING FROM ASSIGNMENTS WHERE ID=? FOR UPDATE', [
        assignmentId,
      ]);
      if (!rows.length) throw Object.assign(new Error('Assignment not found.'), { status: 404 });
      if (rows[0].RATING === value) return;
      await conn.execute('UPDATE ASSIGNMENTS SET RATING=?,UPDATED_AT=UTC_TIMESTAMP() WHERE ID=?', [
        value,
        assignmentId,
      ]);
      await conn.execute(
        'INSERT INTO RATING_HISTORY (ASSIGNMENT_ID,OLD_RATING,NEW_RATING,CHANGED_BY) VALUES (?,?,?,?)',
        [assignmentId, rows[0].RATING, value, req.user.ID],
      );
    });
    res.json({ message: 'Rating updated.' });
  });
  router.get('/assignments/:id/history', async (req, res) => {
    await assertAssignmentAccess(db, req.user, id.parse(req.params.id));
    const scope = accountScope(req.user);
    const [rows] = await db.execute(
      `SELECT h.*,u.NAME CHANGED_BY_NAME FROM RATING_HISTORY h JOIN USERS u ON u.ID=h.CHANGED_BY JOIN ASSIGNMENTS a ON a.ID=h.ASSIGNMENT_ID JOIN GAME_ACCOUNTS g ON g.ID=a.GAME_ACCOUNT_ID WHERE h.ASSIGNMENT_ID=? AND ${scope.clause} ORDER BY h.ID DESC LIMIT 100`,
      [id.parse(req.params.id), ...scope.args],
    );
    res.json(rows);
  });
  router.delete('/assignments/:id', async (req, res) => {
    await assertAssignmentAccess(db, req.user, id.parse(req.params.id));
    const scope = accountScope(req.user);
    const [result] = await db.execute(
      `DELETE FROM ASSIGNMENTS WHERE ID=? AND GAME_ACCOUNT_ID IN (SELECT g.ID FROM GAME_ACCOUNTS g WHERE ${scope.clause})`,
      [id.parse(req.params.id), ...scope.args],
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Assignment not found.' });
    res.status(204).end();
  });
  return router;
}
