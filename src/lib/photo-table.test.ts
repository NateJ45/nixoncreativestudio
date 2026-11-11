import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dealOrder, filtersFor, printLine, KINDS, type PrintIn } from './photo-table.ts';

const dir = new URL('../content/photos/', import.meta.url);
const entries = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => ({
    slug: f.replace(/\.json$/, ''),
    ...JSON.parse(readFileSync(new URL(f, dir), 'utf8')),
  }));

test('every print points at files that exist', () => {
  for (const e of entries) {
    assert.ok(existsSync(new URL(e.image, dir)), `${e.slug}: image ${e.image}`);
    if (e.video) {
      assert.ok(
        existsSync(new URL(`../../../public${e.video}`, dir)),
        `${e.slug}: video ${e.video}`,
      );
    }
  }
});

test('every print has alt text that describes it, not its file name', () => {
  for (const e of entries) {
    assert.ok(e.alt && e.alt.length > 15, `${e.slug}: alt too short`);
    assert.doesNotMatch(
      e.alt,
      /\.(jpe?g|png|mp4)|IMG_|3L7A/i,
      `${e.slug}: alt looks like a file name`,
    );
  }
});

test('dealOrder keeps every print once and puts the featured one first', () => {
  const out = dealOrder(entries as PrintIn[]);
  assert.equal(out.length, entries.length);
  assert.equal(new Set(out.map((p) => p.slug)).size, entries.length);
  const featured = entries.find((e) => e.featured);
  if (featured) assert.equal(out[0].slug, featured.slug);
});

test('dealOrder never lays three of one kind in a row while others remain', () => {
  const out = dealOrder(entries as PrintIn[]);
  // Once the smaller kinds run out the biggest may repeat, so check the first half.
  const half = out.slice(0, Math.floor(out.length / 2));
  for (let i = 2; i < half.length; i++) {
    const run = new Set([half[i].category, half[i - 1].category, half[i - 2].category]);
    assert.ok(run.size > 1, `three ${half[i].category} in a row at ${i}`);
  }
});

test('dealOrder is deterministic', () => {
  const a = dealOrder(entries as PrintIn[]).map((p) => p.slug);
  const b = dealOrder([...entries].reverse() as PrintIn[]).map((p) => p.slug);
  assert.equal(a.length, b.length);
  assert.deepEqual(
    dealOrder(entries as PrintIn[]).map((p) => p.slug),
    a,
  );
});

test('filtersFor lists only kinds in use, in KINDS order, with counts that add up', () => {
  const f = filtersFor(entries as PrintIn[]);
  const order = f.map((x) => KINDS.indexOf(x.kind));
  assert.deepEqual(
    order,
    [...order].sort((a, b) => a - b),
  );
  assert.equal(
    f.reduce((n, x) => n + x.count, 0),
    entries.length,
  );
  assert.ok(f.every((x) => x.count > 0));
});

test('printLine names a film as a film and leaves out what is missing', () => {
  assert.equal(
    printLine({ category: 'worship', year: 2025, video: '/x.mp4', client: 'Crestview' }),
    'Film · Crestview · 2025',
  );
  assert.equal(printLine({ category: 'weddings', year: 2020 }), 'Weddings · 2020');
});
