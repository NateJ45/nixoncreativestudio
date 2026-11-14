import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import {
  dealOrder,
  filtersFor,
  printLine,
  columnSpeed,
  lensScale,
  hexToRgb,
  hueOf,
  byHue,
  inFilter,
  SETS,
  CHAPTERS,
  chapterFrames,
  STUDY_FOR_CLIENT,
  BOOKING_EVERY,
  LENS_MIN,
  KINDS,
  type PrintIn,
} from './photo-table.ts';

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
    printLine({ category: 'church', video: '/x.mp4', client: 'Crestview' }),
    'Film · Crestview',
  );
  assert.equal(printLine({ category: 'people' }), 'People and places');
});

test('every print has a colour for the wash (run `npm run photo-colors` after adding a photo)', () => {
  const colors = JSON.parse(
    readFileSync(new URL('../data/photo-colors.json', import.meta.url), 'utf8'),
  ) as Record<string, string>;
  for (const e of entries) {
    assert.ok(hexToRgb(colors[e.slug]), `${e.slug}: no colour in src/data/photo-colors.json`);
  }
  const slugs = new Set(entries.map((e) => e.slug));
  for (const slug of Object.keys(colors)) {
    assert.ok(slugs.has(slug), `${slug}: a colour with no photo, run npm run photo-colors`);
  }
});

test('columnSpeed gives neighbours different speeds, all close to the table', () => {
  for (let c = -3; c < 20; c++) {
    const s = columnSpeed(c);
    assert.ok(s >= 0.8 && s <= 1.2, `column ${c}: ${s}`);
    assert.notEqual(s, columnSpeed(c + 1), `columns ${c} and ${c + 1} move together`);
  }
  assert.equal(columnSpeed(0), 1);
});

test('lensScale is full size in the middle and only ever falls toward the edge', () => {
  assert.equal(lensScale(0), 1);
  assert.equal(lensScale(0.3), 1);
  let last = 1;
  for (let d = 0; d <= 2; d += 0.05) {
    const s = lensScale(d);
    assert.ok(s <= last + 1e-9, `rises at ${d}`);
    assert.ok(s >= LENS_MIN - 1e-9 && s <= 1);
    last = s;
  }
  assert.ok(Math.abs(lensScale(5) - LENS_MIN) < 1e-9);
});

test('hexToRgb reads a six-digit colour and refuses anything else', () => {
  assert.deepEqual(hexToRgb('#2f3fe6'), [47, 63, 230]);
  assert.equal(hexToRgb('blue'), null);
  assert.equal(hexToRgb(undefined), null);
});

test('nothing a visitor reads on a print carries a year', () => {
  // The page shows no dates (2026-11-13). The year field itself is never printed;
  // this keeps one from slipping in through a title, a caption or the alt text.
  const year = /\b(19|20)\d{2}\b/;
  for (const e of entries) {
    for (const field of ['title', 'alt', 'caption', 'client', 'location'] as const) {
      const value = (e as Record<string, unknown>)[field];
      if (typeof value === 'string') {
        assert.doesNotMatch(value, year, `${e.slug}: ${field} carries a year`);
      }
    }
    assert.doesNotMatch(printLine(e as PrintIn & { client?: string }), year, `${e.slug}: line`);
  }
});

test('the selects stay a short list, and every one is a real print', () => {
  const selects = entries.filter((e) => e.select);
  assert.ok(selects.length >= 8, 'too few selects for the page to open on');
  assert.ok(
    selects.length <= entries.length / 4,
    `${selects.length} selects of ${entries.length}: a select only means something while most are not one`,
  );
});

test('every set has a name and at least three frames, so its strip is worth showing', () => {
  const counts = new Map<string, number>();
  for (const e of entries) {
    if (!e.set) continue;
    assert.ok(e.set in SETS, `${e.slug}: unknown set ${e.set}`);
    counts.set(e.set, (counts.get(e.set) ?? 0) + 1);
  }
  for (const id of Object.keys(SETS)) {
    assert.ok((counts.get(id) ?? 0) >= 3, `set ${id} has ${counts.get(id) ?? 0} frames`);
  }
});

test('every chapter is a real set, its lead is in that set, and it has frames to show', () => {
  assert.equal(new Set(CHAPTERS.map((c) => c.set)).size, CHAPTERS.length, 'a set told twice');
  for (const c of CHAPTERS) {
    assert.ok(c.set in SETS, `chapter ${c.set} is not a set`);
    if (c.lead) {
      const lead = entries.find((e) => e.slug === c.lead);
      assert.ok(lead, `chapter ${c.set}: no entry ${c.lead}`);
      assert.equal(lead.set, c.set, `chapter ${c.set}: ${c.lead} is in ${lead.set}`);
    }
    const frames = chapterFrames(entries, c);
    assert.ok(frames.length >= 3, `chapter ${c.set} has ${frames.length} frames`);
    assert.ok(!/\b(19|20)\d{2}\b/.test(c.line), `chapter ${c.set}: no years on the page`);
  }
});

test('chapterFrames leads with the named frame, then photos before films', () => {
  const p = [
    { slug: 'a', set: 's', video: '/a.mp4' },
    { slug: 'b', set: 's' },
    { slug: 'c', set: 't' },
    { slug: 'd', set: 's', video: '/d.mp4' },
    { slug: 'e', set: 's' },
  ];
  assert.deepEqual(
    chapterFrames(p, { set: 's', lead: 'd' }).map((x) => x.slug),
    ['d', 'b', 'e', 'a'],
  );
  // With no lead named, the set's first film leads.
  assert.equal(chapterFrames(p, { set: 's', lead: '' })[0].slug, 'a');
  assert.deepEqual(chapterFrames(p, { set: 'none', lead: '' }), []);
});

test('a client is only linked to a case study that exists', () => {
  const clients = new Set(entries.map((e) => e.client).filter(Boolean));
  for (const [client, slug] of Object.entries(STUDY_FOR_CLIENT)) {
    assert.ok(clients.has(client), `no photo is for ${client}`);
    assert.ok(
      existsSync(new URL(`../content/case-studies/${slug}.mdx`, import.meta.url)),
      `no case study ${slug}`,
    );
  }
});

test('inFilter: selects and films cut across the kinds', () => {
  const p = { kind: 'church', select: true, video: '/x.mp4' };
  assert.ok(inFilter(p, 'all') && inFilter(p, 'selects') && inFilter(p, 'films'));
  assert.ok(inFilter(p, 'church') && !inFilter(p, 'people'));
  assert.ok(!inFilter({ kind: 'church' }, 'selects') && !inFilter({ kind: 'church' }, 'films'));
});

test('byHue runs round the colour wheel and puts the greys last', () => {
  const out = byHue([{ c: '#808080' }, { c: '#3074cf' }, { c: '#c87637' }, { c: '#629d63' }, {}]);
  assert.deepEqual(
    out.map((p) => p.c),
    ['#c87637', '#629d63', '#3074cf', '#808080', undefined],
  );
  assert.equal(hueOf('#808080'), null);
  assert.equal(Math.round(hueOf('#ff0000') ?? -1), 0);
  assert.ok(BOOKING_EVERY >= 4, 'a booking card every few steps, not every step');
});
