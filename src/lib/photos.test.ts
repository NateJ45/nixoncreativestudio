import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { CmsDeps, CmsReader, Raw } from './cms.ts';
import { fallbackFromFiles } from './cmsFallback.ts';
import {
  comparePhotos,
  galleryItem,
  galleryItems,
  getPhotos,
  groupPhotos,
  heroPhoto,
  mediaUrl,
  normalizePhoto,
  resizedUrl,
  type Photo,
} from './photos.ts';

// ── Fixtures ─────────────────────────────────────────────────────────────────

/** A stored image value, as EmDash hands it back for an image field. */
function stored(width: number, height: number, key = 'ABC123.jpg') {
  return {
    id: '01CIPHOTO',
    provider: 'local',
    filename: 'x.jpg',
    mimeType: 'image/jpeg',
    width,
    height,
    meta: { storageKey: key },
  };
}

function rawPhoto(over: Raw = {}): Raw {
  return {
    title: 'Sunday morning',
    image: stored(1600, 1200),
    alt: 'A congregation standing to sing',
    category: 'events',
    caption: 'Doors open at nine',
    location: 'Cincinnati',
    year: 2026,
    featured: 0,
    ...over,
  };
}

/** The `photos` collection has NO committed fallback: an empty fallback, like production. */
const noFallback = fallbackFromFiles({});

function deps(entries: { id: string; data: Raw }[] | 'throw' | 'missing-table') {
  const logs: string[] = [];
  const reader: CmsReader = {
    async getEntry() {
      return { data: null };
    },
    async getList() {
      if (entries === 'throw') throw new Error('D1 is down');
      // What EmDash returns for a collection whose table has not been created yet.
      if (entries === 'missing-table')
        return { entries: [], error: new Error('no such table: ec_photos') };
      return { entries };
    },
    async getMenu() {
      return { items: null };
    },
  };
  const d: CmsDeps = { reader, fallback: noFallback, log: (m) => logs.push(m) };
  return { d, logs };
}

const photo = (id: string, over: Raw = {}) => normalizePhoto(rawPhoto(over), id) as Photo;

// ── Zero photos: the empty state ─────────────────────────────────────────────

test('an empty collection reads as no photos, with nothing to group and no hero', async () => {
  const { d, logs } = deps([]);
  const photos = await getPhotos({}, { deps: d });
  assert.deepEqual(photos, []);
  assert.deepEqual(groupPhotos(photos), []);
  assert.equal(heroPhoto(photos), undefined);
  // An empty `photos` is normal, not an incident: nothing to log.
  assert.deepEqual(logs, []);
});

test('a read error reads as no photos (the page shows its in-progress note, never breaks)', async () => {
  const { d, logs } = deps('throw');
  assert.deepEqual(await getPhotos({}, { deps: d }), []);
  assert.ok(logs.some((l) => /read of photos threw/.test(l)));
});

test('production before the schema is applied (no photos table) reads as no photos', async () => {
  const { d, logs } = deps('missing-table');
  assert.deepEqual(await getPhotos({}, { deps: d }), []);
  assert.ok(logs.some((l) => /read of photos failed/.test(l)));
});

// ── What counts as a usable photo ────────────────────────────────────────────

test('a complete photo is kept with its fields read', () => {
  const p = photo('sunday');
  assert.equal(p.id, 'sunday');
  assert.equal(p.title, 'Sunday morning');
  assert.equal(p.alt, 'A congregation standing to sing');
  assert.equal(p.category, 'events');
  assert.equal(p.caption, 'Doors open at nine');
  assert.equal(p.year, 2026);
  assert.equal(p.featured, false);
  assert.equal(p.width, 1600);
  assert.equal(p.height, 1200);
});

test('a photo with no description for screen readers is left out, never shipped without alt', () => {
  assert.equal(normalizePhoto(rawPhoto({ alt: '' }), 'x'), undefined);
  assert.equal(normalizePhoto(rawPhoto({ alt: '   ' }), 'x'), undefined);
  assert.equal(normalizePhoto(rawPhoto({ alt: null }), 'x'), undefined);
});

test('a photo with no picture, no stored size, or an unknown group is left out', () => {
  assert.equal(normalizePhoto(rawPhoto({ image: null }), 'x'), undefined);
  assert.equal(normalizePhoto(rawPhoto({ image: { $file: 'src/assets/x.jpg' } }), 'x'), undefined);
  assert.equal(normalizePhoto(rawPhoto({ image: stored(0, 0) }), 'x'), undefined);
  assert.equal(normalizePhoto(rawPhoto({ category: 'weddings' }), 'x'), undefined);
  assert.equal(normalizePhoto(rawPhoto({ title: '' }), 'x'), undefined);
});

test('one unusable photo does not take the others down', async () => {
  const { d } = deps([
    { id: 'good', data: rawPhoto() },
    { id: 'no-alt', data: rawPhoto({ alt: '' }) },
    { id: 'good-two', data: rawPhoto({ category: 'portraits' }) },
  ]);
  const photos = await getPhotos({}, { deps: d });
  assert.deepEqual(photos.map((p) => p.id).sort(), ['good', 'good-two']);
});

test('D1 booleans and numbers read as real ones', () => {
  const p = photo('x', { featured: 1, sort_order: '3', year: '2024' });
  assert.equal(p.featured, true);
  assert.equal(p.sortOrder, 3);
  assert.equal(p.year, 2024);
});

// ── Order, groups and the hero ───────────────────────────────────────────────

test('order: Order number first, unnumbered after, then newest year, then slug', () => {
  const a = photo('a', { sort_order: 2, year: 2020 });
  const b = photo('b', { sort_order: 1, year: 2010 });
  const c = photo('c', { year: 2026 });
  const d = photo('d', { year: 2024 });
  const e = photo('e', { year: 2024 });
  assert.deepEqual(
    [a, b, c, d, e].sort(comparePhotos).map((p) => p.id),
    ['b', 'a', 'c', 'd', 'e'],
  );
});

test('groups come out in the fixed order and empty groups are hidden', () => {
  const photos = [
    photo('env', { category: 'environments' }),
    photo('ev-old', { year: 2020 }),
    photo('ev-new', { year: 2026 }),
  ];
  const groups = groupPhotos(photos);
  assert.deepEqual(
    groups.map((g) => g.id),
    ['events', 'environments'],
  );
  assert.deepEqual(
    groups[0].photos.map((p) => p.id),
    ['ev-new', 'ev-old'],
  );
  assert.equal(groups[0].cover.id, 'ev-new');
});

test('the hero is the first featured photo, else the first photo', () => {
  const plain = photo('plain', { year: 2026 });
  const star = photo('star', { featured: 1, year: 2020 });
  assert.equal(heroPhoto([plain, star])?.id, 'star');
  assert.equal(heroPhoto([plain])?.id, 'plain');
});

// ── Image URLs: width only ───────────────────────────────────────────────────

test('media URLs are absolute on the page origin and resizer URLs carry a width and no height', () => {
  const url = mediaUrl(stored(1600, 1200) as never, 'https://example.test');
  assert.equal(url, 'https://example.test/_emdash/api/media/file/ABC123.jpg');
  const resized = resizedUrl(url!, 800);
  assert.equal(
    resized,
    '/_image?href=https%3A%2F%2Fexample.test%2F_emdash%2Fapi%2Fmedia%2Ffile%2FABC123.jpg&w=800&f=webp',
  );
  assert.ok(!/[?&]h=/.test(resized), 'a height in the request can trigger the 4096 px trap');
});

test('a gallery item offers widths up to the original, never a height, never upscaling', () => {
  const item = galleryItem(photo('sunday'), 'https://example.test')!;
  assert.deepEqual(
    item.srcSet.map((s) => s.width),
    [480, 800, 1200, 1600],
  );
  for (const s of [item, ...item.srcSet]) assert.ok(!/[?&]h=/.test(s.src), s.src);
  assert.ok(item.src.includes('&w=1600&'));
  // The grid lays rows out from the real proportions.
  assert.equal(item.width, 1600);
  assert.equal(item.height, 1200);
  assert.equal(item.srcSet[0].height, 360);
  assert.equal(item.alt, 'A congregation standing to sing');
  assert.equal(item.title, 'Sunday morning');
  assert.equal(item.caption, 'Doors open at nine');
  assert.ok(item.lightboxSrc.includes('&w=1600&'));
});

test('a small original is never asked for a larger width', () => {
  const small = photo('small', { image: stored(900, 600) });
  const item = galleryItem(small, 'https://example.test')!;
  assert.deepEqual(
    item.srcSet.map((s) => s.width),
    [480, 800, 900],
  );
  assert.ok(item.lightboxSrc.includes('&w=900&'));
});

test('a very tall photo never puts its height in the request (the 4096 px resizer trap)', () => {
  const tall = photo('tall', { image: stored(1200, 5000) });
  const item = galleryItem(tall, 'https://example.test')!;
  assert.equal(item.height, 5000);
  for (const s of [item, ...item.srcSet]) {
    assert.ok(!/[?&]h=/.test(s.src), s.src);
  }
  // Only widths are ever requested.
  assert.ok(item.srcSet.every((s) => /&w=\d+&f=webp$/.test(s.src)));
});

test('with no caption the viewer shows the title', () => {
  const p = photo('nocap', { caption: '' });
  assert.equal(galleryItem(p, 'https://example.test')!.caption, 'Sunday morning');
});

test('a group becomes gallery items in its own order', () => {
  const groups = groupPhotos([photo('b', { year: 2020 }), photo('a', { year: 2026 })]);
  const items = galleryItems(groups[0], 'https://example.test');
  assert.equal(items.length, 2);
});
