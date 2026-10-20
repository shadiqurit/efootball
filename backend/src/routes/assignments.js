import { Router } from 'express';
import { z } from 'zod';
import { id, assignmentSchema, rating } from '../validation.js';

export function createAssignmentsRoutes(db, transaction) {
  const router = Router();
  router.get('/assignments', async (req, res) => {
    const accountId = id.parse(req.query.accountId);
    const [rows] = await db.execute(
      'SELECT p.*,a.ID ASSIGNMENT_ID,a.RATING,a.UPDATED_AT FROM ASSIGNMENTS a JOIN PLAYERS p ON p.PLAYER_ID=a.PLAYER_ID WHERE a.GAME_ACCOUNT_ID=? ORDER BY a.RATING DESC,p.NAME',
      [accountId],
    );
    res.json(rows);
  });
  router.post('/assignments', async (req, res) => {
    const a = assignmentSchema.parse(req.body);
    const assignmentId = await transaction(async (conn) => {
      const [result] = await conn.execute(
        'INSERT INTO ASSIGNMENTS (GAME_ACCOUNT_ID,PLAYER_ID,RATING) VALUES (?,?,?)',
        [a.GAME_ACCOUNT_ID, a.PLAYER_ID, a.RATING],
      );
      await conn.execute(
        'INSERT INTO RATING_HISTORY (ASSIGNMENT_ID,NEW_RATING,CHANGED_BY) VALUES (?,?,?)',
        [result.insertId, a.RATING, req.user.ID],
      );
      return result.insertId;
    });
    res.status(201).json({ ID: assignmentId });
  });
  router.patch('/assignments/:id/rating', async (req, res) => {
    const assignmentId = id.parse(req.params.id),
      value = z.object({ RATING: rating }).strict().parse(req.body).RATING;
    await transaction(async (conn) => {
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
    const [rows] = await db.execute(
      'SELECT h.*,u.NAME CHANGED_BY_NAME FROM RATING_HISTORY h JOIN USERS u ON u.ID=h.CHANGED_BY WHERE h.ASSIGNMENT_ID=? ORDER BY h.ID DESC LIMIT 100',
      [id.parse(req.params.id)],
    );
    res.json(rows);
  });
  router.delete('/assignments/:id', async (req, res) => {
    const [result] = await db.execute('DELETE FROM ASSIGNMENTS WHERE ID=?', [
      id.parse(req.params.id),
    ]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Assignment not found.' });
    res.status(204).end();
  });
  return router;
}
