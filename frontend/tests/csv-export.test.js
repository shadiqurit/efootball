import test from 'node:test';
import assert from 'node:assert/strict';
import { toCsv, squadExportRows, squadFields } from '../src/utils/csv-export.js';

test('CSV preserves Unicode, quotes, commas, multiline values and empty fields for Excel', () => {
  assert.equal(
    toCsv(
      ['NAME', 'NOTES', 'EMPTY'],
      [{ NAME: 'Lúcio, "Captain"', NOTES: 'line one\nline two', EMPTY: null }],
    ),
    '\uFEFF"NAME","NOTES","EMPTY"\r\n"Lúcio, ""Captain""","line one\nline two",""',
  );
});

test('CSV neutralizes formulas including leading whitespace', () => {
  for (const value of [
    '=1+1',
    '+SUM(A1)',
    '-1+1',
    '@SUM(A1)',
    '  =HYPERLINK("url")',
    '\tvalue',
    '\nvalue',
  ])
    assert.ok(
      toCsv(['VALUE'], [{ VALUE: value }])
        .split('\r\n')[1]
        .startsWith('"\''),
      value,
    );
});

test('squad exports include full player details, account context, style, rating and timestamps', () => {
  const rows = squadExportRows(
    { ID: 3, LABEL: 'Main squad', GAME_ID: 'EF-123', PLATFORM: 'PC', NOTES: 'First team' },
    [
      {
        PLAYER_ID: 7,
        NAME: 'Lúcio',
        FIRST_NAME: 'Lucimar',
        DOB: '1978-05-08',
        FOOT: 'right',
        HEIGHT_CM: 188,
        RATING: 99,
        PLAYING_STYLE_ID: 4,
        PLAYING_STYLE: 'Build Up',
        ASSIGNED_AT: '2026-10-20 10:00:00',
        UPDATED_AT: '2026-10-21 10:00:00',
      },
    ],
  );
  const csv = toCsv(squadFields, rows);
  for (const value of [
    'Lúcio',
    'Lucimar',
    '1978-05-08',
    'right',
    '188',
    'Main squad',
    'EF-123',
    'PC',
    'First team',
    'Build Up',
    '99',
    '2026-10-21 10:00:00',
  ])
    assert.ok(csv.includes(`"${value}"`), value);
  assert.equal(rows[0].RATING_UPDATED_AT, '2026-10-21 10:00:00');
  assert.equal(
    squadExportRows({ ID: 3 }, [{ NAME: 'Unstyled player' }])[0].PLAYING_STYLE,
    'Not specified',
  );
  assert.ok(toCsv(squadFields, []).includes('"PLAYING_STYLE"'));
});
