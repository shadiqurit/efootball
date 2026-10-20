import { Router } from 'express';
import { id, accountSchema } from '../validation.js';

export function createAccountsRoutes(db) {
  const router = Router();
  router.get('/accounts', async (req, res) => {
    const [rows] = await db.execute(
      'SELECT g.*,COUNT(a.ID) PLAYER_COUNT,ROUND(AVG(a.RATING),1) AVG_RATING,MAX(a.RATING) BEST_RATING FROM GAME_ACCOUNTS g LEFT JOIN ASSIGNMENTS a ON a.GAME_ACCOUNT_ID=g.ID GROUP BY g.ID ORDER BY g.CREATED_AT,g.ID',
    );
    res.json(rows);
  });
  router.post('/accounts', async (req, res) => {
    const a = accountSchema.parse(req.body);
    const [result] = await db.execute(
      'INSERT INTO GAME_ACCOUNTS (LABEL,GAME_ID,PLATFORM,NOTES) VALUES (?,?,?,?)',
      [a.LABEL, a.GAME_ID, a.PLATFORM, a.NOTES],
    );
    res.status(201).json({ ID: result.insertId });
  });
  router.put('/accounts/:id', async (req, res) => {
    const a = accountSchema.parse(req.body);
    const [result] = await db.execute(
      'UPDATE GAME_ACCOUNTS SET LABEL=?,GAME_ID=?,PLATFORM=?,NOTES=? WHERE ID=?',
      [a.LABEL, a.GAME_ID, a.PLATFORM, a.NOTES, id.parse(req.params.id)],
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Game ID not found.' });
    res.json({ message: 'Game ID updated.' });
  });
  router.delete('/accounts/:id', async (req, res) => {
    const [result] = await db.execute('DELETE FROM GAME_ACCOUNTS WHERE ID=?', [
      id.parse(req.params.id),
    ]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Game ID not found.' });
    res.status(204).end();
  });
  return router;
}
