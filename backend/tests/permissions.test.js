import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../src/app.js';
import { hashPassword, verifyPassword } from '../src/auth.js';

process.env.APP_ORIGIN = 'http://localhost:5173';
const origin = process.env.APP_ORIGIN;
const passwordHash = await hashPassword('old-password-123');
let actor, calls, impl, server, base;
const db = {
  async execute(sql, args = []) {
    calls.push({ sql, args });
    if (sql.startsWith('SELECT u.ID')) return [actor.IS_ACTIVE ? [{ ...actor }] : []];
    if (sql.startsWith('SELECT * FROM USERS')) return [[{ ...actor, PASSWORD_HASH: passwordHash }]];
    return impl(sql, args);
  },
};
test.before(async () => {
  server = createApp(db, (fn) => fn(db)).listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}/api`;
});
test.after(() => new Promise((resolve) => server.close(resolve)));
test.beforeEach(() => {
  actor = { ID: 2, NAME: 'Squad owner', EMAIL: 'owner@example.test', ROLE: 'user', IS_ACTIVE: 1 };
  calls = [];
  impl = async () => [{ affectedRows: 1, insertId: 20 }];
});
async function request(path, method = 'GET', body) {
  const response = await fetch(base + path, {
    method,
    headers: {
      cookie: `touchline_session=${'a'.repeat(64)}`,
      origin,
      'content-type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { response, data: response.status === 204 ? null : await response.json() };
}
const writes = () => calls.filter((c) => /^(INSERT|UPDATE|DELETE)/.test(c.sql));

test('regular users cannot edit the catalog, add reference styles or manage users', async () => {
  for (const [path, method] of [
    ['/players', 'POST'],
    ['/players/1', 'PUT'],
    ['/players/1', 'DELETE'],
    ['/playing-styles', 'POST'],
    ['/users', 'GET'],
    ['/users', 'POST'],
    ['/users/1', 'PUT'],
    ['/users/1/password', 'PUT'],
    ['/accounts/1/owner', 'PATCH'],
  ])
    assert.equal(
      (await request(path, method, method === 'GET' ? undefined : {})).response.status,
      403,
      path,
    );
  assert.equal(writes().length, 0);
});

test('admins can maintain shared references but cannot administer users', async () => {
  actor.ROLE = 'admin';
  assert.equal(
    (await request('/playing-styles', 'POST', { NAME: 'New style' })).response.status,
    201,
  );
  assert.equal(
    (await request('/players', 'POST', { NAME: 'New player', PLAYER_CODE: 'new-player' })).response
      .status,
    201,
  );
  assert.equal((await request('/users')).response.status, 403);
});

test('squad creation always uses the signed-in owner and rejects owner spoofing', async () => {
  const input = { LABEL: 'My squad', GAME_ID: 'mine', PLATFORM: 'PC', NOTES: '' };
  assert.equal((await request('/accounts', 'POST', input)).response.status, 201);
  assert.equal(writes()[0].args.at(-1), actor.ID);
  assert.equal(
    (await request('/accounts', 'POST', { ...input, OWNER_ID: 1 })).response.status,
    400,
  );
});

test('squad list, account mutations and player assignment counts are scoped to the owner', async () => {
  impl = async (sql) => {
    if (sql.startsWith('SELECT COUNT')) return [[{ total: 0 }]];
    if (sql.startsWith('SELECT')) return [[]];
    return [{ affectedRows: 0 }];
  };
  assert.equal((await request('/accounts')).response.status, 200);
  assert.ok(calls.some((c) => c.sql.includes('WHERE g.OWNER_ID=?') && c.args[0] === actor.ID));
  assert.equal(
    (await request('/accounts/99', 'PUT', { LABEL: 'Theirs', GAME_ID: 'theirs', PLATFORM: 'PC' }))
      .response.status,
    404,
  );
  assert.equal((await request('/accounts/99', 'DELETE', {})).response.status, 404);
  for (const write of writes()) assert.equal(write.args.at(-1), actor.ID);
  assert.equal((await request('/players')).response.status, 200);
  const catalog = calls.find((c) => c.sql.startsWith('SELECT p.*'));
  assert.match(catalog.sql, /g\.OWNER_ID=\?/);
  assert.equal(catalog.args[0], actor.ID);
});

test('other users squads and assignments cannot be read, changed or deleted by users or admins', async () => {
  impl = async () => [[]];
  for (const role of ['user', 'admin']) {
    actor.ROLE = role;
    for (const [path, method, body] of [
      ['/assignments?accountId=99', 'GET'],
      ['/analytics?accountId=99', 'GET'],
      ['/assignments', 'POST', { GAME_ACCOUNT_ID: 99, PLAYER_ID: 1, RATING: 90 }],
      ['/assignments/99/rating', 'PATCH', { RATING: 95 }],
      ['/assignments/99/playing-style', 'PATCH', { PLAYING_STYLE_ID: null }],
      ['/assignments/99/history', 'GET'],
      ['/assignments/99', 'DELETE', {}],
    ])
      assert.equal((await request(path, method, body)).response.status, 404, `${role} ${path}`);
  }
  assert.equal(writes().length, 0);
});

test('regular users can add players, set styles and ratings, and remove players in their own squad', async () => {
  impl = async (sql, args) => {
    if (sql.startsWith('SELECT ID FROM GAME_ACCOUNTS') || sql.startsWith('SELECT a.ID'))
      return [[{ ID: args[0] }]];
    if (sql.startsWith('SELECT RATING')) return [[{ RATING: 90 }]];
    return [{ affectedRows: 1, insertId: 20 }];
  };
  assert.equal(
    (await request('/assignments', 'POST', { GAME_ACCOUNT_ID: 3, PLAYER_ID: 1, RATING: 90 }))
      .response.status,
    201,
  );
  assert.equal(
    (await request('/assignments/20/rating', 'PATCH', { RATING: 95 })).response.status,
    200,
  );
  assert.equal(
    (await request('/assignments/20/playing-style', 'PATCH', { PLAYING_STYLE_ID: null })).response
      .status,
    200,
  );
  assert.equal((await request('/assignments/20', 'DELETE', {})).response.status, 204);
  assert.equal(
    writes()
      .find((c) => c.sql.includes('OLD_RATING'))
      .args.at(-1),
    actor.ID,
  );
});

test('analytics applies ownership to totals, ratings, positions, leaders and history', async () => {
  impl = async () => [[{}]];
  assert.equal((await request('/analytics')).response.status, 200);
  const queries = calls.filter((c) => !c.sql.startsWith('SELECT u.ID'));
  assert.equal(queries.length, 5);
  for (const query of queries) {
    assert.match(query.sql, /g\.OWNER_ID=\?/);
    assert.deepEqual(query.args, [actor.ID]);
  }
});

test('super admins can access all squads without owner filtering', async () => {
  actor.ROLE = 'super_admin';
  impl = async () => [[]];
  assert.equal((await request('/accounts')).response.status, 200);
  assert.equal((await request('/assignments?accountId=99')).response.status, 200);
  assert.equal(
    calls.some((c) => c.sql.includes('OWNER_ID=?')),
    false,
  );
});

test('only super admins can transfer squads to active users', async () => {
  actor.ROLE = 'super_admin';
  impl = async (sql, args) =>
    sql.startsWith('SELECT ID FROM USERS') ? [[{ ID: args[0] }]] : [{ affectedRows: 1 }];
  assert.equal((await request('/accounts/9/owner', 'PATCH', { OWNER_ID: 3 })).response.status, 200);
  assert.deepEqual(writes()[0].args, [3, 9]);
  impl = async () => [[]];
  assert.equal((await request('/accounts/9/owner', 'PATCH', { OWNER_ID: 4 })).response.status, 404);
});

test('disabled accounts cannot sign in or use an existing session', async () => {
  actor.IS_ACTIVE = 0;
  assert.equal((await request('/auth/me')).response.status, 401);
  assert.equal(
    (await request('/auth/login', 'POST', { email: actor.EMAIL, password: 'old-password-123' }))
      .response.status,
    401,
  );
  assert.equal(writes().length, 0);
});

test('profile changes require the current password and cannot change roles', async () => {
  const input = { NAME: 'Updated name', EMAIL: 'new@example.test', currentPassword: 'wrong' };
  assert.equal((await request('/auth/profile', 'PATCH', input)).response.status, 403);
  assert.equal(writes().length, 0);
  input.currentPassword = 'old-password-123';
  assert.equal(
    (await request('/auth/profile', 'PATCH', { ...input, ROLE: 'super_admin' })).response.status,
    400,
  );
  const result = await request('/auth/profile', 'PATCH', input);
  assert.equal(result.response.status, 200);
  assert.equal(result.data.ROLE, 'user');
  assert.equal(result.data.PASSWORD_HASH, undefined);
});

test('password changes verify current password, hash the replacement and invalidate every session', async () => {
  const input = { currentPassword: 'wrong', newPassword: 'replacement-password-123' };
  assert.equal((await request('/auth/password', 'PUT', input)).response.status, 403);
  assert.equal(writes().length, 0);
  input.currentPassword = 'old-password-123';
  assert.equal(
    (await request('/auth/password', 'PUT', { ...input, newPassword: 'short' })).response.status,
    400,
  );
  const result = await request('/auth/password', 'PUT', input);
  assert.equal(result.response.status, 200);
  const update = writes().find((c) => c.sql.startsWith('UPDATE USERS'));
  assert.equal(await verifyPassword(input.newPassword, update.args[0]), true);
  assert.notEqual(update.args[0], input.newPassword);
  assert.deepEqual(writes().find((c) => c.sql.startsWith('DELETE FROM SESSIONS')).args, [actor.ID]);
  assert.match(result.response.headers.get('set-cookie'), /Expires=Thu, 01 Jan 1970/);
});

test('the last active super admin cannot be demoted or disabled', async () => {
  actor.ROLE = 'super_admin';
  impl = async (sql) =>
    sql.includes("WHERE ROLE='super_admin'") ? [[{ ID: actor.ID }]] : [[{ ...actor }]];
  for (const input of [
    { ROLE: 'user', IS_ACTIVE: true },
    { ROLE: 'super_admin', IS_ACTIVE: false },
  ]) {
    const result = await request(`/users/${actor.ID}`, 'PUT', {
      NAME: actor.NAME,
      EMAIL: actor.EMAIL,
      ...input,
    });
    assert.equal(result.response.status, 409);
  }
  assert.equal(writes().length, 0);
});

test('super admin user creation hashes passwords, and role changes/reset revoke sessions', async () => {
  actor.ROLE = 'super_admin';
  impl = async (sql) => {
    if (sql.includes("WHERE ROLE='super_admin'")) return [[{ ID: actor.ID }]];
    if (sql.startsWith('SELECT ID')) return [[{ ID: 3, ROLE: 'user', IS_ACTIVE: 1 }]];
    return [{ affectedRows: 1, insertId: 3 }];
  };
  const input = {
    NAME: 'New user',
    EMAIL: 'new@example.test',
    ROLE: 'user',
    IS_ACTIVE: true,
    PASSWORD: 'initial-password-123',
  };
  assert.equal((await request('/users', 'POST', input)).response.status, 201);
  assert.equal(await verifyPassword(input.PASSWORD, writes()[0].args.at(-1)), true);
  const { PASSWORD, ...update } = input;
  assert.equal(
    (await request('/users/3', 'PUT', { ...update, ROLE: 'admin' })).response.status,
    200,
  );
  assert.ok(
    writes().some((c) => c.sql === 'DELETE FROM SESSIONS WHERE USER_ID=?' && c.args[0] === 3),
  );
  assert.equal(
    (await request('/users/3/password', 'PUT', { password: 'reset-password-123' })).response.status,
    200,
  );
  const changed = writes().findLast((c) => c.sql.startsWith('UPDATE USERS SET PASSWORD_HASH'));
  assert.equal(await verifyPassword('reset-password-123', changed.args[0]), true);
});
