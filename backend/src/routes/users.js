import { Router } from 'express';
import { z } from 'zod';
import { hashPassword } from '../auth.js';
import { requireSuperAdmin } from '../permissions.js';
import { id, userSchema, createUserSchema, newPassword } from '../validation.js';

// Serialize privilege changes so concurrent requests cannot remove every active super admin.
async function lockSuperAdmins(conn, actorId) {
  const [rows] = await conn.execute(
    "SELECT ID FROM USERS WHERE ROLE='super_admin' AND IS_ACTIVE=1 ORDER BY ID FOR UPDATE",
  );
  if (!rows.some((u) => u.ID === actorId))
    throw Object.assign(new Error('Super administrator permission is required.'), { status: 403 });
  return rows;
}

export function createUsersRoutes(db, transaction) {
  const router = Router();
  router.use('/users', requireSuperAdmin);
  router.get('/users', async (req, res) => {
    const [rows] = await db.execute(
      'SELECT ID,NAME,EMAIL,ROLE,IS_ACTIVE,CREATED_AT FROM USERS ORDER BY ID',
    );
    res.json(rows);
  });
  router.post('/users', async (req, res) => {
    const input = createUserSchema.parse(req.body);
    const passwordHash = await hashPassword(input.PASSWORD);
    const userId = await transaction(async (conn) => {
      await lockSuperAdmins(conn, req.user.ID);
      const [result] = await conn.execute(
        'INSERT INTO USERS (NAME,EMAIL,ROLE,IS_ACTIVE,PASSWORD_HASH) VALUES (?,?,?,?,?)',
        [input.NAME, input.EMAIL, input.ROLE, input.IS_ACTIVE, passwordHash],
      );
      return result.insertId;
    });
    res.status(201).json({ ID: userId });
  });
  router.put('/users/:id', async (req, res) => {
    const userId = id.parse(req.params.id);
    const input = userSchema.parse(req.body);
    await transaction(async (conn) => {
      const superAdmins = await lockSuperAdmins(conn, req.user.ID);
      const [rows] = await conn.execute(
        'SELECT ID,ROLE,IS_ACTIVE FROM USERS WHERE ID=? FOR UPDATE',
        [userId],
      );
      if (!rows.length) throw Object.assign(new Error('User not found.'), { status: 404 });
      if (
        rows[0].ROLE === 'super_admin' &&
        rows[0].IS_ACTIVE &&
        (!input.IS_ACTIVE || input.ROLE !== 'super_admin') &&
        superAdmins.length <= 1
      )
        throw Object.assign(new Error('Keep at least one active super administrator.'), {
          status: 409,
        });
      await conn.execute('UPDATE USERS SET NAME=?,EMAIL=?,ROLE=?,IS_ACTIVE=? WHERE ID=?', [
        input.NAME,
        input.EMAIL,
        input.ROLE,
        input.IS_ACTIVE,
        userId,
      ]);
      if (rows[0].ROLE !== input.ROLE || !input.IS_ACTIVE)
        await conn.execute('DELETE FROM SESSIONS WHERE USER_ID=?', [userId]);
    });
    res.json({ message: 'User updated.' });
  });
  router.put('/users/:id/password', async (req, res) => {
    const userId = id.parse(req.params.id);
    const { password } = z.object({ password: newPassword }).strict().parse(req.body);
    const passwordHash = await hashPassword(password);
    await transaction(async (conn) => {
      await lockSuperAdmins(conn, req.user.ID);
      const [rows] = await conn.execute('SELECT ID FROM USERS WHERE ID=? FOR UPDATE', [userId]);
      if (!rows.length) throw Object.assign(new Error('User not found.'), { status: 404 });
      await conn.execute('UPDATE USERS SET PASSWORD_HASH=? WHERE ID=?', [passwordHash, userId]);
      await conn.execute('DELETE FROM SESSIONS WHERE USER_ID=?', [userId]);
    });
    res.json({ message: 'Password reset. The user must sign in again on all devices.' });
  });
  return router;
}
