import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { randomBytes } from 'node:crypto';
import {
  authenticate,
  getCookieOptions,
  digest,
  sessionCookie,
  verifyPassword,
  hashPassword,
} from '../auth.js';
import { loginSchema } from '../validation.js';

export function createAuthRoutes(db) {
  const router = Router();
  const cookieOptions = getCookieOptions();
  const loginLimiter = rateLimit({
    windowMs: 15 * 60000,
    limit: 10,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message: 'Too many sign-in attempts. Try again in 15 minutes.' },
  });
  // Equal-cost verification when an email is unknown.
  const dummyHash = hashPassword(randomBytes(32).toString('hex'));
  router.post('/auth/login', loginLimiter, async (req, res) => {
    const input = loginSchema.parse(req.body);
    const [rows] = await db.execute('SELECT * FROM USERS WHERE EMAIL=?', [
      input.email.toLowerCase(),
    ]);
    const valid = await verifyPassword(input.password, rows[0]?.PASSWORD_HASH || (await dummyHash));
    if (!rows[0] || !valid)
      return res.status(401).json({ message: 'Email or password is incorrect.' });
    const token = randomBytes(32).toString('hex');
    await db.execute('DELETE FROM SESSIONS WHERE EXPIRES_AT<=UTC_TIMESTAMP()');
    await db.execute(
      'INSERT INTO SESSIONS (TOKEN_HASH,USER_ID,EXPIRES_AT) VALUES (?,?,DATE_ADD(UTC_TIMESTAMP(), INTERVAL 12 HOUR))',
      [digest(token), rows[0].ID],
    );
    res.cookie('touchline_session', token, { ...cookieOptions, maxAge: 12 * 3600000 });
    res.json({ ID: rows[0].ID, NAME: rows[0].NAME, EMAIL: rows[0].EMAIL });
  });
  router.use('/auth', authenticate(db));
  router.get('/auth/me', (req, res) => res.json(req.user));
  router.post('/auth/logout', async (req, res) => {
    await db.execute('DELETE FROM SESSIONS WHERE TOKEN_HASH=?', [digest(sessionCookie(req))]);
    res.clearCookie('touchline_session', cookieOptions);
    res.status(204).end();
  });
  return router;
}
