import { Router } from 'express';
import { playingStyleSchema } from '../validation.js';

export function createPlayingStylesRoutes(db) {
  const router = Router();
  router.get('/playing-styles', async (req, res) => {
    const [rows] = await db.execute('SELECT ID,NAME FROM PLAYING_STYLES ORDER BY NAME');
    res.json(rows);
  });
  router.post('/playing-styles', async (req, res) => {
    const { NAME } = playingStyleSchema.parse(req.body);
    const [result] = await db.execute('INSERT INTO PLAYING_STYLES (NAME) VALUES (?)', [NAME]);
    res.status(201).json({ ID: result.insertId, NAME });
  });
  return router;
}
