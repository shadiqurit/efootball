import { Router } from 'express';
import { id } from '../validation.js';
import { accountScope, assertAccountAccess } from '../permissions.js';

export function createAnalyticsRoutes(db) {
  const router = Router();
  router.get('/analytics', async (req, res) => {
    const accountId = req.query.accountId ? id.parse(req.query.accountId) : null;
    if (accountId) await assertAccountAccess(db, req.user, accountId);
    const scope = accountScope(req.user);
    const ownership = `a.GAME_ACCOUNT_ID IN (SELECT g.ID FROM GAME_ACCOUNTS g WHERE ${scope.clause})`;
    const where = `WHERE ${ownership}${accountId ? ' AND a.GAME_ACCOUNT_ID=?' : ''}`,
      args = [...scope.args, ...(accountId ? [accountId] : [])];
    const [totals] = await db.execute(
      `SELECT (SELECT COUNT(*) FROM PLAYERS) PLAYERS,(SELECT COUNT(*) FROM GAME_ACCOUNTS g WHERE ${scope.clause}) ACCOUNTS,(SELECT COUNT(DISTINCT COUNTRY) FROM PLAYERS) COUNTRIES`,
      scope.args,
    );
    const [stats] = await db.execute(
      `SELECT COUNT(*) ASSIGNMENTS,ROUND(AVG(a.RATING),1) AVG_RATING,MAX(a.RATING) BEST_RATING FROM ASSIGNMENTS a ${where}`,
      args,
    );
    const [positions] = await db.execute(
      `SELECT p.POSITION,COUNT(*) TOTAL,ROUND(AVG(a.RATING),1) AVG_RATING FROM ASSIGNMENTS a JOIN PLAYERS p ON p.PLAYER_ID=a.PLAYER_ID ${where} GROUP BY p.POSITION`,
      args,
    );
    const [topPlayers] = await db.execute(
      `SELECT p.PLAYER_ID,p.NAME,p.POSITION_CODE,p.COUNTRY,a.RATING,g.LABEL FROM ASSIGNMENTS a JOIN PLAYERS p ON p.PLAYER_ID=a.PLAYER_ID JOIN GAME_ACCOUNTS g ON g.ID=a.GAME_ACCOUNT_ID ${where} ORDER BY a.RATING DESC,p.NAME LIMIT 5`,
      args,
    );
    const [activity] = await db.execute(
      `SELECT h.ID,h.OLD_RATING,h.NEW_RATING,h.CHANGED_AT,p.NAME,g.LABEL FROM RATING_HISTORY h JOIN ASSIGNMENTS a ON a.ID=h.ASSIGNMENT_ID JOIN PLAYERS p ON p.PLAYER_ID=a.PLAYER_ID JOIN GAME_ACCOUNTS g ON g.ID=a.GAME_ACCOUNT_ID ${where} ORDER BY h.ID DESC LIMIT 8`,
      args,
    );
    res.json({ ...totals[0], ...stats[0], positions, topPlayers, activity });
  });
  return router;
}
