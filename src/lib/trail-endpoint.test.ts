import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deviceOf, parseTrail } from '../trail-endpoint.ts';

const NOW = Date.parse('2026-11-15T12:00:00Z');
const good = {
  vid: '11111111-2222-4333-8444-555555555555',
  visit: '99999999-2222-4333-8444-555555555555',
  i: 2,
  path: '/services/',
  title: '  Prices   and tiers ',
  src: 'search-google',
  t0: NOW - 60_000,
  ms: 45_000,
  sc: 140,
  ev: ['tool:tier_picker', 7, 'x'.repeat(200)],
};

test('parseTrail shapes a good beacon', () => {
  const row = parseTrail(good, NOW);
  assert.ok(row);
  assert.equal(row.title, 'Prices and tiers');
  assert.equal(row.scrollPct, 100);
  assert.equal(row.engagedMs, 45_000);
  assert.equal(row.events.length, 2);
  assert.equal(row.events[1].length, 80);
});

test('parseTrail refuses what is not ours', () => {
  assert.equal(parseTrail(null, NOW), null);
  assert.equal(parseTrail({ ...good, vid: 'nope' }, NOW), null);
  assert.equal(parseTrail({ ...good, path: 'https://evil.example/' }, NOW), null);
  assert.equal(parseTrail({ ...good, path: '//evil.example/' }, NOW), null);
  assert.equal(parseTrail({ ...good, i: 'x' }, NOW), null);
});

test('parseTrail caps time in use by time since the page opened', () => {
  const row = parseTrail({ ...good, t0: NOW - 10_000, ms: 3_600_000 }, NOW);
  assert.equal(row?.engagedMs, 15_000);
  const old = parseTrail({ ...good, t0: 0 }, NOW);
  assert.equal(old?.startedAt, new Date(NOW - 86_400_000).toISOString());
});

test('deviceOf gives a coarse device', () => {
  const iphone =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit Version/18.0 Mobile/15E148 Safari/604.1';
  const edge =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36 Edg/130.0';
  const pixel = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/130.0 Mobile Safari/537.36';
  assert.equal(deviceOf(iphone), 'iPhone, Safari');
  assert.equal(deviceOf(edge), 'Windows, Edge');
  assert.equal(deviceOf(pixel), 'Android phone, Chrome');
});
