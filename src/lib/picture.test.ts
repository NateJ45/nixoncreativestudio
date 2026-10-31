import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ladder, MAX_STEP, PICTURE } from './picture.ts';

test('keeps every requested width, sorted and unique', () => {
  const out = ladder([800, 480, 1200, 800]);
  for (const w of [480, 800, 1200]) assert.ok(out.includes(w), `${w} kept`);
  assert.deepEqual(
    out,
    [...out].sort((a, b) => a - b),
  );
  assert.equal(new Set(out).size, out.length);
});

test('no step wider than MAX_STEP plus rounding', () => {
  for (const input of [
    [480, 800, 1200],
    [160, 240, 360],
    [240, 360, 480, 720, 1200, 1600],
    [640, 1440],
  ]) {
    const out = ladder(input);
    for (let i = 1; i < out.length; i++) {
      // 20px rounding can stretch a step by a hair.
      assert.ok(out[i] / out[i - 1] <= MAX_STEP + 0.05, `${out[i - 1]} -> ${out[i]} in ${out}`);
    }
  }
});

test('never adds a step outside the requested range', () => {
  const out = ladder([480, 1200]);
  assert.equal(out[0], 480);
  assert.equal(out.at(-1), 1200);
});

test('a ladder that is already tight is left alone', () => {
  assert.deepEqual(ladder([600, 700, 800]), [600, 700, 800]);
});

test('PICTURE: AVIF first, WebP fallback, a fresh pictureAttributes per spread', () => {
  const a = { ...PICTURE };
  const b = { ...PICTURE };
  assert.deepEqual(a.formats, ['avif']);
  assert.equal(a.fallbackFormat, 'webp');
  assert.notEqual(a.pictureAttributes, b.pictureAttributes);
  (a.pictureAttributes as { class?: string }).class = 'astro-abc12345';
  assert.equal((b.pictureAttributes as { class?: string }).class, undefined);
});
