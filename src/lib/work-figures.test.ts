// Safe to edit. Site-owned (not PORTABLE).
// The "What changed" stack on /work: the figures it reads out of the study bodies, the number in
// each figure, the part-of-a-whole maths, the captures, and the capture sizes the window marks print.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { figureNumber, share, sourcedFigures } from './work-figures.ts';
import { mp4Size, webpSize } from './capture-size.ts';
import sizes from '../data/capture-sizes.json' with { type: 'json' };
import images from '../data/study-images.json' with { type: 'json' };

test('the number in a figure', () => {
  assert.equal(figureNumber('About 5,200'), 5200);
  assert.equal(figureNumber('2,345'), 2345);
  assert.equal(figureNumber('37'), 37);
  assert.ok(Number.isNaN(figureNumber('Many')));
});

test('a figure that is part of a stated whole', () => {
  const base = { text: 't', source: 's' };
  assert.equal(share({ ...base, figure: '37' }), undefined);
  assert.deepEqual(share({ ...base, figure: '195', of: '216', ofLabel: 'library items' }), {
    part: 195,
    whole: 216,
    ratio: 195 / 216,
    words: '195 of 216 library items',
  });
  assert.equal(share({ ...base, figure: '1,200', of: '2,400' })?.words, '1,200 of 2,400');
  assert.throws(() => share({ ...base, figure: '300', of: '200' }));
  assert.throws(() => share({ ...base, figure: 'Many', of: '200' }));
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
    {
      figure: '195',
      text: 'of 216 items',
      source: 'the home page',
      of: '216',
      ofLabel: 'items',
      shot: 'some-capture',
      shotAlt: 'A capture',
      shotNote: 'What it shows',
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
    {
      figure: '195',
      text: 'of 216 items',
      source: 'the home page',
      shot: 'some-capture',
      shotAlt: 'A capture',
      shotNote: 'What it shows',
      of: '216',
      ofLabel: 'items',
    },
  ]);
});

// The real studies: every sourced figure has a number, and shows the page it lives on.
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
    assert.ok(n > 0, `${f.file}: "${f.figure}" has no number`);
    // A card on /work is the number beside the real page: no capture, no card worth reading.
    assert.ok(
      f.shot && f.shot in images,
      `${f.file}: "${f.figure}" needs a shot in public/assets/study/`,
    );
    assert.ok(existsSync(new URL(`../../public/assets/study/${f.shot}.webp`, import.meta.url)));
    assert.ok(f.shotAlt && f.shotNote, `${f.file}: "${f.figure}" needs shotAlt and shotNote`);
    if (f.of) assert.ok(share(f)!.ratio <= 1);
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
