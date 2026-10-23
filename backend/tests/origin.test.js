import test from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedOrigin } from '../src/middleware/origin.js';

test('local development accepts localhost and IPv4 loopback on the configured scheme and port', () => {
  assert.equal(
    isAllowedOrigin('http://localhost:5173', 'http://127.0.0.1:5173', 'development'),
    true,
  );
  assert.equal(
    isAllowedOrigin('http://127.0.0.1:5173', 'http://localhost:5173', 'development'),
    true,
  );
  for (const origin of [
    'http://localhost:5174',
    'https://localhost:5173',
    'http://localhost.evil.test:5173',
    'http://127.0.0.2:5173',
    'null',
    'http://localhost:5173/path',
  ]) {
    assert.equal(isAllowedOrigin(origin, 'http://127.0.0.1:5173', 'development'), false, origin);
  }
});

test('production and unconfigured environments require the exact origin', () => {
  for (const environment of ['production', 'test', undefined]) {
    assert.equal(
      isAllowedOrigin('http://localhost:5173', 'http://127.0.0.1:5173', environment),
      false,
    );
    assert.equal(
      isAllowedOrigin('https://app.example.com', 'https://app.example.com', environment),
      true,
    );
    assert.equal(
      isAllowedOrigin('https://other.example.com', 'https://app.example.com', environment),
      false,
    );
    assert.equal(isAllowedOrigin(undefined, 'https://app.example.com', environment), false);
  }
});
