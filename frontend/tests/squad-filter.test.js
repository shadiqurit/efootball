import test from 'node:test';
import assert from 'node:assert/strict';
import { filterSquad } from '../src/utils/squad-filter.js';
import { sortSquad } from '../src/utils/squad-sort.js';
import { toCsv, squadFields, squadExportRows } from '../src/utils/csv-export.js';

test('squad name search ignores case, accents and extra spaces without searching unrelated fields', () => {
  const rows = [
    { NAME: 'Lúcio' },
    { NAME: 'Erling  Haaland' },
    { NAME: 'Bruno', COUNTRY: 'Lucio', PLAYER_CODE: 'haaland' },
    { NAME: null },
  ];
  const original = structuredClone(rows);
  assert.deepEqual(filterSquad(rows, ' LUCIO '), [rows[0]]);
  assert.deepEqual(filterSquad(rows, 'erling haaland'), [rows[1]]);
  assert.deepEqual(filterSquad(rows, 'aal'), [rows[1]]);
  assert.deepEqual(filterSquad(rows, 'no matches'), []);
  assert.deepEqual(filterSquad(rows, '  '), rows);
  assert.deepEqual(filterSquad([], 'lucio'), []);
  assert.deepEqual(rows, original);
});

test('filtered squad CSV contains matching players in the selected column order', () => {
  const rows = [
    { NAME: 'Lionel Messi', RATING: 99 },
    { NAME: 'Miroslav Klose', RATING: 100 },
    { NAME: 'Messi Junior', RATING: 101 },
  ];
  const visible = filterSquad(sortSquad(rows, 'rating-desc'), 'messi');
  const exported = sortSquad(filterSquad(rows, 'messi'), 'rating-desc');
  assert.deepEqual(exported, visible);
  const csv = toCsv(squadFields, squadExportRows({ ID: 1, LABEL: 'Main squad' }, exported));
  assert.ok(!csv.includes('Miroslav Klose'));
  assert.ok(csv.indexOf('Messi Junior') < csv.indexOf('Lionel Messi'));
  assert.equal(filterSquad(rows, '').length, 3);
});
