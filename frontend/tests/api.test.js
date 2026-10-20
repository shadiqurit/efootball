import test from 'node:test';
import assert from 'node:assert/strict';
import { getApiBase } from '../src/api-config.js';
import { request as api } from '../src/http.js';

test('runtime API URL overrides the build URL and default remains the development proxy', () => {
  assert.equal(getApiBase(), '/api');
  assert.equal(getApiBase('', 'https://api.example.com/api/'), 'https://api.example.com/api');
  assert.equal(
    getApiBase('https://other.example.com/api/', '/api'),
    'https://other.example.com/api',
  );
  for (const value of [
    '//untrusted.example/api',
    'javascript:alert(1)',
    'https://user:secret@example.com/api',
    'https://example.com/api?secret=x',
  ])
    assert.throws(() => getApiBase(value), /config.js/);
});
test('separate-origin API calls include session credentials and JSON for writes', async () => {
  const previousFetch = globalThis.fetch,
    previousConfig = globalThis.TOUCHLINE_CONFIG;
  let request;
  try {
    globalThis.TOUCHLINE_CONFIG = { apiUrl: 'https://api.example.com/api' };
    globalThis.fetch = async (url, options) => {
      request = { url, options };
      return Response.json({ message: 'saved' });
    };
    assert.deepEqual(await api('/accounts', 'POST', { LABEL: 'Squad' }), { message: 'saved' });
    assert.equal(request.url, 'https://api.example.com/api/accounts');
    assert.equal(request.options.credentials, 'include');
    assert.equal(request.options.headers['Content-Type'], 'application/json');
    assert.deepEqual(JSON.parse(request.options.body), { LABEL: 'Squad' });
  } finally {
    globalThis.fetch = previousFetch;
    globalThis.TOUCHLINE_CONFIG = previousConfig;
  }
});
test('API preserves authentication status and handles empty responses', async () => {
  const previousFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({ message: 'Sign in again.' }, { status: 401 });
    await assert.rejects(
      api('/auth/me'),
      (err) => err.status === 401 && err.message === 'Sign in again.',
    );
    globalThis.fetch = async () => new Response(null, { status: 204 });
    assert.equal(await api('/auth/logout', 'POST', {}), null);
  } finally {
    globalThis.fetch = previousFetch;
  }
});
test('incorrect deployment URLs return a useful error instead of a JSON parse failure', async () => {
  const previousFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response('<html>Static hosting page</html>');
    await assert.rejects(api('/auth/me'), /configured API URL/);
  } finally {
    globalThis.fetch = previousFetch;
  }
});
