import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isoDay, mondayOf, weeksFrom } from '../client-weeks.mjs';

// Local noon, so no time zone can move a date to the day before.
const day = (s) => new Date(`${s}T12:00:00`);

test('a week starts on Monday', () => {
  assert.equal(isoDay(mondayOf(day('2026-11-09'))), '2026-11-09'); // a Monday
  assert.equal(isoDay(mondayOf(day('2026-11-15'))), '2026-11-09'); // the Sunday after
  assert.equal(isoDay(mondayOf(day('2026-11-08'))), '2026-11-02'); // the Sunday before
});

test('weeks count from the first commit to the as-of week, and active weeks are 0-based', () => {
  const row = weeksFrom(
    'demo',
    [day('2026-10-06'), day('2026-10-08'), day('2026-10-21'), day('2026-11-03')],
    day('2026-11-10'),
  );
  assert.deepEqual(row, {
    slug: 'demo',
    firstWeek: '2026-10-05',
    weeks: 6,
    active: [0, 2, 4],
    asOf: '2026-11-10',
  });
});

test('no commits gives no row', () => {
  assert.equal(weeksFrom('demo', [], day('2026-11-10')), null);
});

test('the committed data holds week numbers and counts only', () => {
  const rows = JSON.parse(
    readFileSync(new URL('../../src/data/client-weeks.json', import.meta.url)),
  );
  assert.ok(rows.length > 0);
  for (const r of rows) {
    assert.deepEqual(Object.keys(r).sort(), ['active', 'asOf', 'firstWeek', 'slug', 'weeks']);
    assert.match(r.firstWeek, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(new Date(`${r.firstWeek}T12:00:00`).getDay(), 1, `${r.slug} starts on a Monday`);
    assert.ok(
      r.active.every((i) => Number.isInteger(i) && i >= 0 && i < r.weeks),
      r.slug,
    );
  }
});
