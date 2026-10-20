import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hashPassword,
  verifyPassword,
  digest,
  sessionCookie,
  getCookieOptions,
} from '../src/auth.js';
import { playerSchema, assignmentSchema, listSchema } from '../src/validation.js';
import { sourcePlayers } from '../scripts/source-data.js';
import { withTransaction, db } from '../src/db.js';

test('passwords use unique salts and verify without storing plaintext', async () => {
  const a = await hashPassword('a-long-test-password'),
    b = await hashPassword('a-long-test-password');
  assert.notEqual(a, b);
  assert.equal(await verifyPassword('a-long-test-password', a), true);
  assert.equal(await verifyPassword('wrong-password', a), false);
  assert.equal(a.includes('a-long-test-password'), false);
  assert.equal(digest('token').length, 64);
  assert.equal(sessionCookie({ headers: { cookie: 'other=1; touchline_session=abc' } }), 'abc');
});
test('cross-site session cookies require Secure production mode and supported SameSite values', () => {
  const previousMode = process.env.NODE_ENV,
    previousSite = process.env.SESSION_SAME_SITE;
  try {
    process.env.NODE_ENV = 'development';
    process.env.SESSION_SAME_SITE = 'none';
    assert.throws(getCookieOptions, /production mode and HTTPS/);
    process.env.NODE_ENV = 'production';
    assert.deepEqual(getCookieOptions(), {
      httpOnly: true,
      sameSite: 'none',
      secure: true,
      path: '/',
    });
    process.env.SESSION_SAME_SITE = 'strict';
    assert.equal(getCookieOptions().sameSite, 'strict');
    process.env.SESSION_SAME_SITE = 'invalid';
    assert.throws(getCookieOptions, /strict, lax or none/);
  } finally {
    if (previousMode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousMode;
    if (previousSite === undefined) delete process.env.SESSION_SAME_SITE;
    else process.env.SESSION_SAME_SITE = previousSite;
  }
});
test('all supplied players parse, retain Oracle IDs, preserve accents and fit the API schema', async () => {
  const players = await sourcePlayers();
  assert.equal(players.length, 103);
  assert.equal(players[0].PLAYER_ID, 1);
  assert.equal(players[0].NAME, 'Miroslav Klose');
  assert.equal(players[0].UPD_DATE, '2025-05-24 12:44:44');
  assert.equal(players.find((p) => p.NAME === 'Erling Haaland').UPD_DATE, '2026-08-06 15:57:00');
  assert.equal(players[3].NAME, 'Lúcio');
  assert.equal(players[5].NAME, 'Dedê');
  assert.equal(players[11].NAME, 'Tamás Hajnal');
  assert.equal(new Set(players.map((p) => p.PLAYER_CODE)).size, players.length);
  assert.equal(new Set(players.map((p) => p.PLAYER_ID)).size, players.length);
  for (const { PLAYER_ID, UPD_DATE, UPD_BY, ...player } of players)
    assert.equal(playerSchema.safeParse(player).success, true, player.NAME);
});
test('validation rejects invalid ratings, dates, identifiers, arbitrary fields and unbounded pagination', async () => {
  for (const RATING of [0, 121, 90.5, '90', NaN])
    assert.equal(
      assignmentSchema.safeParse({ PLAYER_ID: 1, GAME_ACCOUNT_ID: 1, RATING }).success,
      false,
    );
  assert.equal(
    assignmentSchema.safeParse({ PLAYER_ID: 1, GAME_ACCOUNT_ID: 1, RATING: 120 }).success,
    true,
  );
  const { PLAYER_ID, UPD_DATE, UPD_BY, ...player } = (await sourcePlayers())[0];
  assert.equal(playerSchema.safeParse({ ...player, DOB: '2025-02-30' }).success, false);
  assert.equal(playerSchema.safeParse({ ...player, DOB: '2099-01-01' }).success, false);
  assert.equal(
    playerSchema.safeParse({ ...player, PLAYER_CODE: "x'; DROP TABLE USERS;--" }).success,
    false,
  );
  assert.equal(playerSchema.safeParse({ ...player, UPD_BY: 1 }).success, false);
  assert.equal(listSchema.safeParse({ limit: 100000 }).success, false);
  assert.equal(listSchema.safeParse({ sort: 'NAME;DROP TABLE PLAYERS' }).success, false);
});
test('transactions commit once on success and always roll back and release on failure', async () => {
  const calls = [],
    conn = {
      beginTransaction: async () => calls.push('begin'),
      commit: async () => calls.push('commit'),
      rollback: async () => calls.push('rollback'),
      release: () => calls.push('release'),
    },
    pool = { getConnection: async () => conn };
  assert.equal(await withTransaction(pool, async () => 42), 42);
  assert.deepEqual(calls, ['begin', 'commit', 'release']);
  calls.length = 0;
  await assert.rejects(
    withTransaction(pool, async () => {
      throw new Error('history insert failed');
    }),
    /history insert failed/,
  );
  assert.deepEqual(calls, ['begin', 'rollback', 'release']);
});
test.after(async () => db.end());
