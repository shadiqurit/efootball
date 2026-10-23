import { db } from '../src/db.js';
import { hashPassword } from '../src/auth.js';
import { z } from 'zod';
try {
  const email = z.email().max(254).parse(process.env.ADMIN_EMAIL).toLowerCase();
  const password = z.string().min(12).max(256).parse(process.env.ADMIN_PASSWORD);
  const name = z
    .string()
    .trim()
    .min(1)
    .max(100)
    .parse(process.env.ADMIN_NAME || 'Manager');
  await db.execute(
    "INSERT INTO USERS (EMAIL,NAME,PASSWORD_HASH,ROLE) VALUES (?,?,?,'super_admin')",
    [email, name, await hashPassword(password)],
  );
  console.log('Super administrator created. Remove ADMIN_PASSWORD from .env.');
} finally {
  await db.end();
}
