import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${(await scrypt(password, salt, 64)).toString('hex')}`;
}
export async function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const actual = await scrypt(password, salt, 64);
  const expected = Buffer.from(hash || '', 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export const digest = (token) => createHash('sha256').update(token).digest('hex');
export const sessionCookie = (req) =>
  req.headers.cookie
    ?.split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith('touchline_session='))
    ?.slice(18);
export function getCookieOptions() {
  const sameSite = process.env.SESSION_SAME_SITE || 'strict';
  const secure = process.env.NODE_ENV === 'production';
  if (!['strict', 'lax', 'none'].includes(sameSite))
    throw new Error('SESSION_SAME_SITE must be strict, lax or none.');
  if (sameSite === 'none' && !secure)
    throw new Error('Cross-site cookies require production mode and HTTPS.');
  return { httpOnly: true, sameSite, secure, path: '/' };
}
export function authenticate(db) {
  return async (req, res, next) => {
    const token = sessionCookie(req);
    if (!token || !/^[a-f0-9]{64}$/.test(token))
      return res.status(401).json({ message: 'Please sign in to continue.' });
    try {
      const [rows] = await db.execute(
        'SELECT u.ID, u.NAME, u.EMAIL FROM SESSIONS s JOIN USERS u ON u.ID=s.USER_ID WHERE s.TOKEN_HASH=? AND s.EXPIRES_AT>UTC_TIMESTAMP()',
        [digest(token)],
      );
      if (!rows.length)
        return res.status(401).json({ message: 'Your session expired. Please sign in again.' });
      req.user = rows[0];
      next();
    } catch (err) {
      next(err);
    }
  };
}
