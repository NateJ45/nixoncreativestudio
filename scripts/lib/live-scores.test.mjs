import { test } from 'node:test';
import assert from 'node:assert/strict';
import { liveUrlOf, median, readReport, summarise } from './live-scores.mjs';

test('median picks the middle value, order-independent', () => {
  assert.equal(median([98, 71, 90]), 90);
  assert.equal(median([4, 1, 3, 2]), 2.5);
  assert.throws(() => median([]));
});

test('readReport turns category scores into whole numbers and keeps the raw metrics', () => {
  const r = readReport({
    categories: {
      performance: { score: 0.984 },
      accessibility: { score: 1 },
      'best-practices': { score: 0.96 },
      seo: { score: 0.92 },
    },
    audits: {
      'largest-contentful-paint': { numericValue: 1834.6 },
      'cumulative-layout-shift': { numericValue: 0.0123 },
    },
  });
  assert.deepEqual(r, {
    performance: 98,
    accessibility: 100,
    bestPractices: 96,
    seo: 92,
    lcpMs: 1834.6,
    cls: 0.0123,
  });
  assert.throws(() => readReport({ categories: {}, audits: {} }), /no performance score/);
});

test('summarise takes the median of every figure across runs', () => {
  const run = (performance, lcpMs, cls) => ({
    performance,
    accessibility: 100,
    bestPractices: 100,
    seo: 100,
    lcpMs,
    cls,
  });
  const s = summarise([run(90, 2000, 0.01), run(70, 3000, 0.2), run(95, 1800.4, 0.0004)]);
  assert.equal(s.performance, 90);
  assert.equal(s.lcpMs, 2000);
  assert.equal(s.cls, 0.01);
});

test('liveUrlOf reads the frontmatter line, quoted or not', () => {
  assert.equal(liveUrlOf('title: x\nliveUrl: https://a.example\nyear: 1'), 'https://a.example');
  assert.equal(liveUrlOf('liveUrl: "https://b.example"\n'), 'https://b.example');
  assert.equal(liveUrlOf('title: x'), undefined);
});
