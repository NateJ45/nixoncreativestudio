import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_AGE_DAYS, liveScoreFact, type LiveScore } from './live-scores.ts';

const entry: LiveScore = {
  url: 'https://example.com',
  measuredAt: '2026-10-31T12:00:00.000Z',
  formFactor: 'mobile',
  runs: 3,
  performance: 98,
  accessibility: 100,
  bestPractices: 96,
  seo: 100,
  lcpMs: 1800,
  cls: 0,
};
const day = 86_400_000;
const at = (offsetDays: number) => new Date(Date.parse(entry.measuredAt) + offsetDays * day);

test('a fresh entry prints the two scores and the measured date', () => {
  assert.deepEqual(liveScoreFact(entry, at(1)), {
    scores: 'Performance 98 · Accessibility 100',
    date: '31 Oct 2026',
    iso: '2026-10-31',
  });
});

test('a study with no entry shows nothing', () => {
  assert.equal(liveScoreFact(undefined, at(0)), undefined);
});

test('an entry is shown on day 120 and hidden after it', () => {
  assert.equal(MAX_AGE_DAYS, 120);
  assert.ok(liveScoreFact(entry, at(120)));
  assert.equal(liveScoreFact(entry, at(121)), undefined);
  assert.equal(liveScoreFact(entry, at(400)), undefined);
});

test('a future or unreadable date shows nothing', () => {
  assert.equal(liveScoreFact(entry, at(-1)), undefined);
  assert.equal(liveScoreFact({ ...entry, measuredAt: 'soon' }, at(0)), undefined);
});
