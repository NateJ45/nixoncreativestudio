// Safe to edit. Site-owned (not PORTABLE).
// The "What changed" stack on /work: the figures it reads out of the study bodies, the number in
// each figure, the dot maths, and the capture sizes the window marks print.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dotPlan, dotWords, figureNumber, MAX_DOTS, sourcedFigures } from './work-figures.ts';
import { mp4Size, webpSize } from './capture-size.ts';
import sizes from '../data/capture-sizes.json' with { type: 'json' };

test('the number in a figure', () => {
  assert.equal(figureNumber('About 5,200'), 5200);
  assert.equal(figureNumber('2,345'), 2345);
  assert.equal(figureNumber('37'), 37);
  assert.ok(Number.isNaN(figureNumber('Many')));
});

test('dots are round(n / unit), with the smallest round unit that keeps them at 120 or fewer', () => {
  assert.deepEqual(dotPlan(37), { unit: 1, dots: 37, exact: true });
  assert.deepEqual(dotPlan(120), { unit: 1, dots: 120, exact: true });
  assert.deepEqual(dotPlan(121), { unit: 2, dots: 61, exact: false });
  assert.deepEqual(dotPlan(195), { unit: 2, dots: 98, exact: false });
  assert.deepEqual(dotPlan(300), { unit: 5, dots: 60, exact: true });
  assert.deepEqual(dotPlan(458), { unit: 5, dots: 92, exact: false });
  assert.deepEqual(dotPlan(2345), { unit: 20, dots: 117, exact: false });
  assert.deepEqual(dotPlan(5200), { unit: 50, dots: 104, exact: true });
  assert.deepEqual(dotPlan(1_000_000), { unit: 10_000, dots: 100, exact: true });
  for (const n of [1, 7, 99, 241, 999, 1234, 98_765]) {
    const { unit, dots } = dotPlan(n);
    assert.ok(dots >= 1 && dots <= MAX_DOTS, `${n}: ${dots} dots`);
    assert.equal(dots, Math.round(n / unit));
  }
  assert.throws(() => dotPlan(0));
  assert.throws(() => dotPlan(NaN));
});

test('the words under the grid', () => {
  assert.equal(dotWords(dotPlan(37)), 'Each dot is 1.');
  assert.equal(dotWords(dotPlan(5200)), 'Each dot is 50.');
  assert.equal(dotWords(dotPlan(2345)), 'Each dot is 20, rounded to the nearest dot.');
});

test('figures come out of a ResultsBlock with their text and source', () => {
  const body = `Some words.

<ResultsBlock
  items={[
    {
      figure: 'About 5,200',
      text: "feet of climbing, the race's own",
      source:
        'measured, not estimated',
    },
    { figure: '12', text: 'no source here' },
    'A plain line.',
  ]}
/>`;
  assert.deepEqual(sourcedFigures(body), [
    {
      figure: 'About 5,200',
      text: "feet of climbing, the race's own",
      source: 'measured, not estimated',
    },
  ]);
});

// The real studies: every sourced figure has a number the dot grid can draw.
const dir = new URL('../content/case-studies/', import.meta.url);
const all = readdirSync(dir)
  .filter((f) => f.endsWith('.mdx'))
  .flatMap((f) =>
    sourcedFigures(readFileSync(new URL(f, dir), 'utf8')).map((x) => ({ file: f, ...x })),
  );

test('the studies have sourced figures, and each one has a number', () => {
  assert.ok(all.length > 0);
  for (const f of all) {
    const n = figureNumber(f.figure);
    assert.ok(n > 0, `${f.file}: "${f.figure}" has no number for the dot grid`);
    assert.ok(dotPlan(n).dots <= MAX_DOTS);
  }
});

// The window marks print src/data/capture-sizes.json. It has to match the real files, every study.
test('the capture sizes on file match the real still and footage of every study', () => {
  const assets = new URL('../../public/assets/', import.meta.url);
  const real: Record<string, { still: number[]; footage: number[] }> = {};
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.mdx'))) {
    const slug = f.replace(/\.mdx$/, '');
    const s = webpSize(readFileSync(new URL(`${slug}-cover.webp`, assets)));
    const v = mp4Size(readFileSync(new URL(`${slug}.mp4`, assets)));
    real[slug] = { still: [s.w, s.h], footage: [v.w, v.h] };
  }
  assert.deepEqual(
    sizes,
    real,
    `src/data/capture-sizes.json is out of date. Write this:\n${JSON.stringify(real, null, 2)}`,
  );
  assert.throws(() => webpSize(new Uint8Array(32)));
  assert.throws(() => mp4Size(new Uint8Array(32)));
});
