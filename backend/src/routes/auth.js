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
import { loginSchema, profileSchema, changePasswordSchema } from '../validation.js';

export function createAuthRoutes(db, transaction) {
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
    const token = randomBytes(32).toString('hex');
    // Hold the user lock through session creation so password resets/disabling
    // cannot race an old-password sign-in and leave a new session behind.
    const user = await transaction(async (conn) => {
      const [rows] = await conn.execute('SELECT * FROM USERS WHERE EMAIL=? FOR UPDATE', [
        input.email.toLowerCase(),
      ]);
      const valid = await verifyPassword(
        input.password,
        rows[0]?.PASSWORD_HASH || (await dummyHash),
      );
      if (!rows[0] || !rows[0].IS_ACTIVE || !valid) return null;
      await conn.execute('DELETE FROM SESSIONS WHERE USER_ID=? AND EXPIRES_AT<=UTC_TIMESTAMP()', [
        rows[0].ID,
      ]);
      await conn.execute(
        'INSERT INTO SESSIONS (TOKEN_HASH,USER_ID,EXPIRES_AT) VALUES (?,?,DATE_ADD(UTC_TIMESTAMP(), INTERVAL 12 HOUR))',
        [digest(token), rows[0].ID],
      );
      return rows[0];
    });
    if (!user) return res.status(401).json({ message: 'Email or password is incorrect.' });
    res.cookie('touchline_session', token, { ...cookieOptions, maxAge: 12 * 3600000 });
    res.json({ ID: user.ID, NAME: user.NAME, EMAIL: user.EMAIL, ROLE: user.ROLE });
  });
  router.use('/auth', authenticate(db));
  router.get('/auth/me', (req, res) => res.json(req.user));
  router.patch('/auth/profile', loginLimiter, async (req, res) => {
    const input = profileSchema.parse(req.body);
    const user = await transaction(async (conn) => {
      const [rows] = await conn.execute('SELECT * FROM USERS WHERE ID=? FOR UPDATE', [req.user.ID]);
      if (
        !rows[0]?.IS_ACTIVE ||
        !(await verifyPassword(input.currentPassword, rows[0].PASSWORD_HASH))
      )
        throw Object.assign(new Error('Current password is incorrect.'), { status: 403 });
      await conn.execute('UPDATE USERS SET NAME=?,EMAIL=? WHERE ID=?', [
        input.NAME,
        input.EMAIL,
        req.user.ID,
      ]);
      return { ID: req.user.ID, NAME: input.NAME, EMAIL: input.EMAIL, ROLE: rows[0].ROLE };
    });
    res.json(user);
  });
  router.put('/auth/password', loginLimiter, async (req, res) => {
    const input = changePasswordSchema.parse(req.body);
    if (input.currentPassword === input.newPassword)
      return res.status(400).json({ message: 'Choose a different new password.' });
    const passwordHash = await hashPassword(input.newPassword);
    await transaction(async (conn) => {
      const [rows] = await conn.execute('SELECT * FROM USERS WHERE ID=? FOR UPDATE', [req.user.ID]);
      if (
        !rows[0]?.IS_ACTIVE ||
        !(await verifyPassword(input.currentPassword, rows[0].PASSWORD_HASH))
      )
        throw Object.assign(new Error('Current password is incorrect.'), { status: 403 });
      await conn.execute('UPDATE USERS SET PASSWORD_HASH=? WHERE ID=?', [
        passwordHash,
        req.user.ID,
      ]);
      await conn.execute('DELETE FROM SESSIONS WHERE USER_ID=?', [req.user.ID]);
    });
    res.clearCookie('touchline_session', cookieOptions);
    res.json({ message: 'Password changed. Sign in again on all devices.' });
  });
  router.post('/auth/logout', async (req, res) => {
    await db.execute('DELETE FROM SESSIONS WHERE TOKEN_HASH=?', [digest(sessionCookie(req))]);
    res.clearCookie('touchline_session', cookieOptions);
    res.status(204).end();
  });
  return router;
}
