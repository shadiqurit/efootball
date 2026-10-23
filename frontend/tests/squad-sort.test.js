import test from 'node:test';
import assert from 'node:assert/strict';
import { sortSquad } from '../src/utils/squad-sort.js';

const rows = [
  {
    ASSIGNMENT_ID: 1,
    NAME: 'Zico',
    PLAYER_CODE: 'player-10',
    POSITION_CODE: 'CF',
    COUNTRY: 'Brazil',
    PLAYING_STYLE: null,
    RATING: '99',
  },
  {
    ASSIGNMENT_ID: 2,
    NAME: 'Álvaro',
    PLAYER_CODE: 'player-2',
    POSITION_CODE: 'AMF',
    COUNTRY: 'Spain',
    PLAYING_STYLE: 'Goal Poacher',
    RATING: '100',
  },
  {
    ASSIGNMENT_ID: 3,
    NAME: 'Bruno',
    PLAYER_CODE: 'player-1',
    POSITION_CODE: 'GK',
    COUNTRY: 'Portugal',
    PLAYING_STYLE: 'Fox in the Box',
    RATING: 9,
  },
];
const ids = (items) => items.map((p) => p.ASSIGNMENT_ID);

test('squad ratings sort numerically in both directions without changing source rows', () => {
  const original = structuredClone(rows);
  assert.deepEqual(ids(sortSquad(rows)), [2, 1, 3]);
  assert.deepEqual(ids(sortSquad(rows, 'rating-asc')), [3, 1, 2]);
  assert.deepEqual(rows, original);
});

test('all squad text fields support ascending and descending sorting', () => {
  for (const [field, asc, desc] of [
    ['name', [2, 3, 1], [1, 3, 2]],
    ['code', [3, 2, 1], [1, 2, 3]],
    ['position', [2, 1, 3], [3, 1, 2]],
    ['country', [1, 3, 2], [2, 3, 1]],
    ['style', [3, 2, 1], [2, 3, 1]],
  ]) {
    assert.deepEqual(ids(sortSquad(rows, `${field}-asc`)), asc, field);
    assert.deepEqual(ids(sortSquad(rows, `${field}-desc`)), desc, field);
  }
});

test('missing values stay last and ties use player names and assignment IDs consistently', () => {
  const players = [
    { ASSIGNMENT_ID: 3, NAME: 'Beta', COUNTRY: '', RATING: 95 },
    { ASSIGNMENT_ID: 2, NAME: 'Alpha', COUNTRY: 'Brazil', RATING: 95 },
    { ASSIGNMENT_ID: 1, NAME: 'Alpha', COUNTRY: 'Brazil', RATING: 95 },
  ];
  assert.deepEqual(ids(sortSquad(players, 'country-desc')), [1, 2, 3]);
  assert.deepEqual(ids(sortSquad(players, 'rating-asc')), [1, 2, 3]);
  assert.deepEqual(ids(sortSquad(players, 'rating-desc')), [1, 2, 3]);
  assert.deepEqual(sortSquad([], 'style-asc'), []);
  assert.deepEqual(ids(sortSquad(rows, 'invalid-desc')), [2, 1, 3]);
});
