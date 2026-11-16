import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isLive, todayInCincinnati } from '../data/journal-gate.ts';

// A date-only `published` parses as UTC midnight, the way the content loader gives it.
const day = (iso: string) => new Date(iso);

test('todayInCincinnati reads the calendar day in New York, not UTC', () => {
  // 02:00 UTC on the 17th is still the evening of the 16th in Cincinnati.
  assert.equal(todayInCincinnati(new Date('2026-11-17T02:00:00Z')), '2026-11-16');
  assert.equal(todayInCincinnati(new Date('2026-11-17T06:00:00Z')), '2026-11-17');
});

test('a scheduled post goes live on its day in Cincinnati, not before', () => {
  const post = { published: day('2026-11-17') };
  assert.equal(isLive(post, new Date('2026-11-17T02:00:00Z')), false);
  assert.equal(isLive(post, new Date('2026-11-17T11:17:00Z')), true);
  assert.equal(isLive(post, new Date('2026-12-01T00:00:00Z')), true);
});

test('a draft never goes live, whatever its date', () => {
  assert.equal(
    isLive({ published: day('2026-01-01'), draft: true }, new Date('2027-01-01')),
    false,
  );
});
