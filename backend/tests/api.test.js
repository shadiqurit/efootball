import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../src/app.js';
import { hashPassword } from '../src/auth.js';

process.env.APP_ORIGIN = 'http://localhost:5173';
const origin = process.env.APP_ORIGIN;
const token = 'a'.repeat(64);
const cookie = `touchline_session=${token}`;
let server,
  base,
  impl,
  calls = [],
  txCalls = 0;
const passwordHash = await hashPassword('test-password-123');
const database = {
  async execute(sql, args) {
    calls.push({ sql, args });
    if (sql.startsWith('SELECT u.ID'))
      return [[{ ID: 1, NAME: 'Manager', EMAIL: 'manager@example.test' }]];
    if (sql.startsWith('SELECT * FROM USERS'))
      return [
        [{ ID: 1, NAME: 'Manager', EMAIL: 'manager@example.test', PASSWORD_HASH: passwordHash }],
      ];
    return impl(sql, args);
  },
};
test.before(async () => {
  server = createApp(database, async (fn) => {
    txCalls++;
    return fn(database);
  }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
});
test.beforeEach(() => {
  calls = [];
  txCalls = 0;
  impl = async () => [{ affectedRows: 1, insertId: 10 }];
});
test.after(() => new Promise((resolve) => server.close(resolve)));
async function request(path, method = 'GET', body, headers = {}) {
  const response = await fetch(base + '/api' + path, {
    method,
    headers: {
      cookie,
      ...(method !== 'GET' ? { origin, 'content-type': 'application/json' } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { response, data: response.status === 204 ? null : await response.json() };
}
test('unauthenticated reads and cross-origin mutations are rejected before database writes', async () => {
  assert.equal((await request('/players', 'GET', undefined, { cookie: '' })).response.status, 401);
  assert.equal(
    (await request('/accounts', 'POST', {}, { origin: 'https://evil.example' })).response.status,
    403,
  );
  assert.equal((await request('/accounts', 'POST', {}, { origin: '' })).response.status, 403);
  assert.equal(calls.length, 0);
});
test('CORS preflight succeeds only for the configured frontend and supported headers/methods', async () => {
  const headers = {
    origin,
    'access-control-request-method': 'PATCH',
    'access-control-request-headers': 'content-type',
  };
  const response = await fetch(base + '/api/assignments/10/rating', { method: 'OPTIONS', headers });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), origin);
  assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
  assert.match(response.headers.get('access-control-allow-methods'), /PATCH/);
  assert.equal(calls.length, 0);
  for (const invalid of [
    { origin: 'https://evil.example' },
    { 'access-control-request-method': 'TRACE' },
    { 'access-control-request-headers': 'x-unexpected' },
  ]) {
    const denied = await fetch(base + '/api/accounts', {
      method: 'OPTIONS',
      headers: { ...headers, ...invalid },
    });
    assert.equal(denied.status, 403);
  }
});
test('credentialed reads expose CORS headers to the configured frontend and reject other origins', async () => {
  const result = await request('/auth/me', 'GET', undefined, { origin });
  assert.equal(result.response.status, 200);
  assert.equal(result.response.headers.get('access-control-allow-origin'), origin);
  assert.equal(result.response.headers.get('access-control-allow-credentials'), 'true');
  calls = [];
  const denied = await request('/auth/me', 'GET', undefined, { origin: 'https://evil.example' });
  assert.equal(denied.response.status, 403);
  assert.equal(denied.response.headers.get('access-control-allow-origin'), null);
  assert.equal(calls.length, 0);
});
test('backend root is API status JSON and frontend files are never served', async () => {
  const response = await fetch(base + '/');
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { service: 'Touchline API', status: 'ok' });
  for (const path of ['/index.html', '/config.js', '/assets/index.js'])
    assert.equal((await fetch(base + path)).status, 404);
});
test('sign-in sets an HttpOnly SameSite cookie, stores only a token digest, and rejects wrong passwords', async () => {
  const result = await request('/auth/login', 'POST', {
    email: 'manager@example.test',
    password: 'test-password-123',
  });
  assert.equal(result.response.status, 200);
  assert.equal(result.data.NAME, 'Manager');
  assert.equal(result.data.PASSWORD_HASH, undefined);
  const header = result.response.headers.get('set-cookie');
  assert.match(header, /HttpOnly/);
  assert.match(header, /SameSite=Strict/);
  const sessionInsert = calls.find((c) => c.sql.startsWith('INSERT INTO SESSIONS'));
  const raw = header.match(/touchline_session=([a-f0-9]+)/)[1];
  assert.notEqual(sessionInsert.args[0], raw);
  assert.equal(sessionInsert.args[0].length, 64);
  const wrong = await request('/auth/login', 'POST', {
    email: 'manager@example.test',
    password: 'wrong',
  });
  assert.equal(wrong.response.status, 401);
});
test('player searches bind hostile input as a value and cap result sizes', async () => {
  impl = async (sql) => (sql.startsWith('SELECT COUNT') ? [[{ total: 0 }]] : [[]]);
  const term = "'; DROP TABLE PLAYERS; --";
  const result = await request(`/players?q=${encodeURIComponent(term)}&limit=12&page=2`);
  assert.equal(result.response.status, 200);
  assert.equal(result.data.total, 0);
  const query = calls.find((c) => c.sql.includes('SELECT p.*'));
  assert.ok(!query.sql.includes(term));
  assert.equal(query.args[0], `%${term}%`);
  assert.match(query.sql, /LIMIT 12 OFFSET 12/);
  assert.equal((await request('/players?limit=999')).response.status, 400);
});
test('assignment and initial rating history are created in one transaction', async () => {
  const result = await request('/assignments', 'POST', {
    PLAYER_ID: 5,
    GAME_ACCOUNT_ID: 2,
    RATING: 99,
  });
  assert.equal(result.response.status, 201);
  assert.equal(txCalls, 1);
  assert.deepEqual(calls.find((c) => c.sql.startsWith('INSERT INTO ASSIGNMENTS')).args, [2, 5, 99]);
  assert.deepEqual(
    calls.find((c) => c.sql.startsWith('INSERT INTO RATING_HISTORY')).args,
    [10, 99, 1],
  );
  assert.equal(
    (await request('/assignments', 'POST', { PLAYER_ID: 5, GAME_ACCOUNT_ID: 2, RATING: 121 }))
      .response.status,
    400,
  );
});
test('rating changes lock the assignment and record the previous value; unchanged ratings add no history', async () => {
  impl = async (sql) =>
    sql.startsWith('SELECT RATING') ? [[{ RATING: 95 }]] : [{ affectedRows: 1 }];
  assert.equal(
    (await request('/assignments/10/rating', 'PATCH', { RATING: 101 })).response.status,
    200,
  );
  assert.equal(txCalls, 1);
  assert.ok(calls.some((c) => c.sql.endsWith('FOR UPDATE')));
  assert.deepEqual(
    calls.find((c) => c.sql.startsWith('INSERT INTO RATING_HISTORY')).args,
    [10, 95, 101, 1],
  );
  calls = [];
  await request('/assignments/10/rating', 'PATCH', { RATING: 95 });
  assert.ok(!calls.some((c) => c.sql.startsWith('INSERT INTO RATING_HISTORY')));
});
test('duplicate and referenced-record failures return useful conflict responses', async () => {
  impl = async () => {
    throw Object.assign(new Error('internal SQL detail'), { code: 'ER_DUP_ENTRY' });
  };
  assert.equal(
    (await request('/assignments', 'POST', { PLAYER_ID: 5, GAME_ACCOUNT_ID: 2, RATING: 90 }))
      .response.status,
    409,
  );
  impl = async () => {
    throw Object.assign(new Error('internal SQL detail'), { code: 'ER_ROW_IS_REFERENCED_2' });
  };
  const result = await request('/players/5', 'DELETE', {});
  assert.equal(result.response.status, 409);
  assert.match(result.data.message, /Remove this player/);
  assert.ok(!result.data.message.includes('SQL'));
});
test('invalid IDs and unexpected routes are rejected', async () => {
  assert.equal((await request('/players/not-a-number', 'DELETE', {})).response.status, 400);
  assert.equal((await request('/not-a-route')).response.status, 404);
});
