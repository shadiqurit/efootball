import { z } from 'zod';
const text = (max = 100) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => v || null);
export const id = z.coerce.number().int().positive().max(4294967295);
export const rating = z.number().int().min(1).max(120);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(v);
    return (
      !Number.isNaN(d.valueOf()) &&
      d.toISOString().slice(0, 10) === v &&
      v <= new Date().toISOString().slice(0, 10)
    );
  }, 'Use a valid date of birth in the past')
  .nullable()
  .optional();
export const playerSchema = z
  .object({
    FIRST_NAME: text(),
    LAST_NAME: text(),
    NAME: z.string().trim().min(1).max(100),
    PLAYER_CODE: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers and hyphens'),
    COUNTRY: text(),
    DOB: date,
    SUB_POSITION: text(),
    POSITION: z.enum(['Attack', 'Midfield', 'Defender', 'Goalkeeper']).nullable().optional(),
    FOOT: z.enum(['left', 'right', 'both']).nullable().optional(),
    HEIGHT_CM: z.number().int().min(100).max(250).nullable().optional(),
    POSITIONS: text(),
    POSITION_CODE: z
      .enum(['GK', 'CB', 'LB', 'RB', 'DMF', 'CMF', 'AMF', 'LMF', 'RMF', 'LWF', 'RWF', 'SS', 'CF'])
      .nullable()
      .optional(),
  })
  .strict();
export const accountSchema = z
  .object({
    LABEL: z.string().trim().min(1).max(100),
    GAME_ID: z.string().trim().min(1).max(100),
    PLATFORM: z.enum(['Mobile', 'PC', 'PlayStation', 'Xbox']),
    NOTES: text(500),
  })
  .strict();
export const assignmentSchema = z
  .object({
    GAME_ACCOUNT_ID: id,
    PLAYER_ID: id,
    RATING: rating,
    PLAYING_STYLE_ID: id.nullable().default(null),
  })
  .strict();
export const playingStyleSchema = z.object({ NAME: z.string().trim().min(1).max(100) }).strict();
export const assignmentStyleSchema = z.object({ PLAYING_STYLE_ID: id.nullable() }).strict();
export const loginSchema = z
  .object({ email: z.email().max(254), password: z.string().min(1).max(256) })
  .strict();
export const newPassword = z.string().min(12).max(256);
export const userSchema = z
  .object({
    NAME: z.string().trim().min(1).max(100),
    EMAIL: z
      .email()
      .max(254)
      .transform((v) => v.toLowerCase()),
    ROLE: z.enum(['user', 'admin', 'super_admin']),
    IS_ACTIVE: z.boolean(),
  })
  .strict();
export const createUserSchema = userSchema.extend({ PASSWORD: newPassword });
export const profileSchema = z
  .object({
    NAME: z.string().trim().min(1).max(100),
    EMAIL: z
      .email()
      .max(254)
      .transform((v) => v.toLowerCase()),
    currentPassword: z.string().min(1).max(256),
  })
  .strict();
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(256),
    newPassword,
  })
  .strict();
export const listSchema = z.object({
  q: z.string().trim().max(100).default(''),
  position: z.string().max(20).default(''),
  country: z.string().max(100).default(''),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
  sort: z.enum(['name', 'recent', 'country']).default('name'),
});
