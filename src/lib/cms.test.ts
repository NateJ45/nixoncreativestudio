import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  bool,
  choice,
  date,
  getMenuItems,
  getOrdered,
  getSingleton,
  image,
  int,
  num,
  portable,
  rows,
  rowsOf,
  text,
  texts,
  type CmsDeps,
  type CmsFallback,
  type CmsReader,
  type Raw,
} from './cms.ts';
import { entriesOfJson, fallbackFromFiles } from './cmsFallback.ts';

// ── Field normalisers ────────────────────────────────────────────────────────

test('bool accepts the 0/1 D1 stores, true/false and "1"/"true"', () => {
  assert.equal(bool(1), true);
  assert.equal(bool(0), false);
  assert.equal(bool(true), true);
  assert.equal(bool(false), false);
  assert.equal(bool('1'), true);
  assert.equal(bool('true'), true);
  assert.equal(bool('TRUE'), true);
  assert.equal(bool('0'), false);
  assert.equal(bool(null), false);
  assert.equal(bool(undefined), false);
});

test('text turns blank, null and non-strings into undefined', () => {
  assert.equal(text('hello'), 'hello');
  assert.equal(text(''), undefined);
  assert.equal(text('   '), undefined);
  assert.equal(text(null), undefined);
  assert.equal(text(4), undefined);
});

test('num and int read numbers and numeric strings, nothing else', () => {
  assert.equal(num(7), 7);
  assert.equal(num('7'), 7);
  assert.equal(num(''), undefined);
  assert.equal(num('abc'), undefined);
  assert.equal(num(NaN), undefined);
  assert.equal(int(7.9), 7);
  assert.equal(int('4000'), 4000);
  assert.equal(int(null), undefined);
});

test('date reads ISO strings and rejects garbage', () => {
  assert.equal(date('2026-10-03T00:00:00.000Z')?.toISOString(), '2026-10-03T00:00:00.000Z');
  assert.equal(date('not a date'), undefined);
  assert.equal(date(''), undefined);
  assert.equal(date(null), undefined);
});

test('image keeps stored image values and drops un-uploaded $file references', () => {
  assert.deepEqual(image({ id: 'm1', src: '/x.png', alt: 'a' }), {
    id: 'm1',
    src: '/x.png',
    alt: 'a',
  });
  assert.equal(image({ $file: 'src/assets/a.jpg', alt: 'a' }), undefined);
  assert.equal(image({}), undefined);
  assert.equal(image(null), undefined);
  assert.equal(image('x'), undefined);
  assert.equal(image([]), undefined);
});

test('empty and malformed repeaters read as []', () => {
  assert.deepEqual(rowsOf(undefined), []);
  assert.deepEqual(rowsOf(null), []);
  assert.deepEqual(rowsOf([]), []);
  assert.deepEqual(rowsOf('not json'), []);
  assert.deepEqual(rowsOf({ text: 'x' }), []);
  assert.deepEqual(rowsOf([null, 'a', 3, ['x']]), []);
  assert.deepEqual(texts(undefined), []);
  assert.deepEqual(
    rows(null, (r) => r),
    [],
  );
});

test('repeaters map rows, drop undefined results, and accept JSON text', () => {
  const v = [{ text: 'one' }, { text: '' }, { text: 'two' }];
  assert.deepEqual(texts(v), ['one', 'two']);
  assert.deepEqual(texts(JSON.stringify(v)), ['one', 'two']);
  assert.deepEqual(
    rows([{ label: 'A', n: 1 }, { n: 2 }], (r, i) =>
      text(r.label) ? { label: String(r.label), i } : undefined,
    ),
    [{ label: 'A', i: 0 }],
  );
  assert.deepEqual(texts([{ title: 'x' }, { title: ' ' }], 'title'), ['x']);
});

test('portable gives an array for arrays and [] otherwise', () => {
  assert.deepEqual(portable([{ _type: 'block' }]), [{ _type: 'block' }]);
  assert.deepEqual(portable(null), []);
  assert.deepEqual(portable('x'), []);
});

test('choice keeps known options and falls back otherwise', () => {
  assert.equal(choice('zoom', ['scroll', 'zoom'] as const, 'scroll'), 'zoom');
  assert.equal(choice('spin', ['scroll', 'zoom'] as const, 'scroll'), 'scroll');
  assert.equal(choice(null, ['scroll', 'zoom'] as const, 'scroll'), 'scroll');
});

// ── Test harness: a stub reader, a stub fallback, a recording cache ──────────

interface Calls {
  logs: string[];
  tags: unknown[];
}

function makeDeps(
  reader: Partial<CmsReader>,
  fallback: Partial<CmsFallback> = {},
): { deps: CmsDeps; calls: Calls } {
  const calls: Calls = { logs: [], tags: [] };
  const deps: CmsDeps = {
    reader: {
      getEntry: async () => ({ data: null }),
      getList: async () => ({ entries: [] }),
      getMenu: async () => ({ items: null }),
      ...reader,
    },
    fallback: {
      entry: () => undefined,
      list: () => undefined,
      menu: () => undefined,
      ...fallback,
    },
    log: (m) => calls.logs.push(m),
  };
  return { deps, calls };
}

const cacheFor = (calls: Calls, enabled = true) => ({
  enabled,
  set: (hint: unknown) => calls.tags.push(hint),
});

const normHeading = (raw: Raw) => ({
  heading: String(raw.heading ?? ''),
  featured: bool(raw.featured),
  steps: texts(raw.steps),
});

// ── getSingleton ─────────────────────────────────────────────────────────────

test('getSingleton reads the CMS entry and normalises it', async () => {
  const hint = { tags: ['page_home', 'abc'] };
  const { deps, calls } = makeDeps({
    getEntry: async () => ({
      data: { heading: 'Hello', featured: 1, steps: [{ text: 'a' }, { text: 'b' }] },
      cacheHint: hint,
    }),
  });
  const res = await getSingleton('page_home', 'home', normHeading, {
    deps,
    cache: cacheFor(calls),
  });
  assert.equal(res.source, 'cms');
  assert.equal(res.slug, 'home');
  assert.deepEqual(res.data, { heading: 'Hello', featured: true, steps: ['a', 'b'] });
  assert.deepEqual(calls.tags, [hint], 'the read adds its cache tags to the page');
  assert.deepEqual(calls.logs, []);
});

test('getSingleton gives an empty repeater and a real false for empty fields', async () => {
  const { deps } = makeDeps({
    getEntry: async () => ({ data: { heading: 'H', featured: 0, steps: null } }),
  });
  const res = await getSingleton('page_home', 'home', normHeading, { deps });
  assert.deepEqual(res.data, { heading: 'H', featured: false, steps: [] });
});

test('getSingleton falls back to the JSON when the entry is missing', async () => {
  const hint = { tags: ['page_home'] };
  const { deps, calls } = makeDeps(
    { getEntry: async () => ({ data: null, cacheHint: hint }) },
    { entry: (c, s) => (c === 'page_home' && s === 'home' ? { heading: 'From JSON' } : undefined) },
  );
  const res = await getSingleton('page_home', 'home', normHeading, {
    deps,
    cache: cacheFor(calls),
  });
  assert.equal(res.source, 'fallback');
  assert.equal(res.data.heading, 'From JSON');
  assert.equal(calls.logs.length, 1);
  assert.match(calls.logs[0], /page_home\/home is missing or unpublished/);
  assert.deepEqual(
    calls.tags,
    [hint],
    'a miss is still tagged so publishing the entry purges the page',
  );
});

test('getSingleton falls back to the JSON when the read returns an error (D1 down)', async () => {
  const { deps, calls } = makeDeps(
    { getEntry: async () => ({ data: null, error: new Error('D1_ERROR: no such table') }) },
    { entry: () => ({ heading: 'From JSON' }) },
  );
  const res = await getSingleton('page_home', 'home', normHeading, { deps });
  assert.equal(res.source, 'fallback');
  assert.equal(res.data.heading, 'From JSON');
  assert.match(calls.logs[0], /read of page_home\/home failed/);
});

test('getSingleton falls back to the JSON when the read throws', async () => {
  const { deps, calls } = makeDeps(
    {
      getEntry: async () => {
        throw new Error('network');
      },
    },
    { entry: () => ({ heading: 'From JSON' }) },
  );
  const res = await getSingleton('page_home', 'home', normHeading, { deps });
  assert.equal(res.source, 'fallback');
  assert.match(calls.logs[0], /threw/);
});

test('getSingleton falls back when the stored entry cannot be normalised', async () => {
  const { deps, calls } = makeDeps(
    { getEntry: async () => ({ data: { heading: 'x' } }) },
    { entry: () => ({ heading: 'From JSON' }) },
  );
  const strict = (raw: Raw) => {
    if (raw.heading === 'x') throw new Error('bad shape');
    return { heading: String(raw.heading) };
  };
  const res = await getSingleton('page_home', 'home', strict, { deps });
  assert.equal(res.source, 'fallback');
  assert.equal(res.data.heading, 'From JSON');
  assert.match(calls.logs[0], /could not be read as the expected shape/);
});

test('getSingleton throws when neither the CMS nor the JSON has the entry', async () => {
  const { deps } = makeDeps({ getEntry: async () => ({ data: null }) });
  await assert.rejects(
    () => getSingleton('page_home', 'home', normHeading, { deps }),
    /cms\/content\/page_home\.json has no entry "home"/,
  );
});

test('getSingleton does not touch the cache when it is disabled (dev)', async () => {
  const { deps, calls } = makeDeps({
    getEntry: async () => ({ data: { heading: 'H' }, cacheHint: { tags: ['x'] } }),
  });
  await getSingleton('page_home', 'home', normHeading, { deps, cache: cacheFor(calls, false) });
  assert.deepEqual(calls.tags, []);
});

// ── getOrdered ───────────────────────────────────────────────────────────────

const tier = (raw: Raw, slug: string) => ({
  slug,
  name: String(raw.name),
  order: int(raw.sort_order),
});

test('getOrdered sorts on sort_order numerically, ties by slug, missing last', async () => {
  const { deps } = makeDeps({
    getList: async () => ({
      entries: [
        { id: 'c', data: { name: 'C', sort_order: 10 } },
        { id: 'a', data: { name: 'A', sort_order: 2 } },
        { id: 'z', data: { name: 'Z' } },
        { id: 'b', data: { name: 'B', sort_order: 2 } },
      ],
    }),
  });
  const res = await getOrdered('pricing_tiers', tier, { deps });
  assert.deepEqual(
    res.map((r) => r.slug),
    ['a', 'b', 'c', 'z'],
  );
  assert.ok(res.every((r) => r.source === 'cms'));
});

test('getOrdered honours limit, descending and a custom orderBy', async () => {
  const { deps } = makeDeps({
    getList: async () => ({
      entries: [
        { id: 'a', data: { name: 'A', year: 2024 } },
        { id: 'b', data: { name: 'B', year: 2026 } },
        { id: 'c', data: { name: 'C', year: 2025 } },
      ],
    }),
  });
  const res = await getOrdered('photos', tier, {
    deps,
    orderBy: 'year',
    descending: true,
    limit: 2,
  });
  assert.deepEqual(
    res.map((r) => r.slug),
    ['b', 'c'],
  );
});

test('getOrdered tags the page with the read it made', async () => {
  const hint = { tags: ['pricing_tiers'] };
  const { deps, calls } = makeDeps({
    getList: async () => ({ entries: [{ id: 'a', data: { name: 'A' } }], cacheHint: hint }),
  });
  await getOrdered('pricing_tiers', tier, { deps, cache: cacheFor(calls) });
  assert.deepEqual(calls.tags, [hint]);
});

test('getOrdered falls back to the JSON list on a D1 error', async () => {
  const { deps, calls } = makeDeps(
    { getList: async () => ({ entries: [], error: new Error('D1 down') }) },
    {
      list: () => [
        { slug: 'signature', data: { name: 'Signature', sort_order: 2 } },
        { slug: 'launch', data: { name: 'Launch', sort_order: 1 } },
      ],
    },
  );
  const res = await getOrdered('pricing_tiers', tier, { deps });
  assert.deepEqual(
    res.map((r) => [r.slug, r.source]),
    [
      ['launch', 'fallback'],
      ['signature', 'fallback'],
    ],
  );
  assert.match(calls.logs[0], /read of pricing_tiers failed/);
});

test('getOrdered falls back when the CMS list is empty and a JSON list exists', async () => {
  const { deps, calls } = makeDeps(
    { getList: async () => ({ entries: [] }) },
    { list: () => [{ slug: 'launch', data: { name: 'Launch', sort_order: 1 } }] },
  );
  const res = await getOrdered('pricing_tiers', tier, { deps });
  assert.equal(res[0].source, 'fallback');
  assert.match(calls.logs[0], /has no published entries/);
});

test('getOrdered returns [] for an empty collection with no JSON (photos, journal)', async () => {
  const { deps, calls } = makeDeps({ getList: async () => ({ entries: [] }) });
  assert.deepEqual(await getOrdered('photos', tier, { deps }), []);
  assert.deepEqual(calls.logs, []);
});

test('getOrdered returns [] when the read throws and there is no JSON', async () => {
  const { deps } = makeDeps({
    getList: async () => {
      throw new Error('boom');
    },
  });
  assert.deepEqual(await getOrdered('photos', tier, { deps }), []);
});

// ── getMenuItems ─────────────────────────────────────────────────────────────

test('getMenuItems returns top-level items, drops blanks, ignores children', async () => {
  const hint = { tags: ['emdash:menu:primary'] };
  const { deps, calls } = makeDeps({
    getMenu: async () => ({
      items: [
        {
          label: 'Work',
          url: '/work/',
          titleAttr: 'Case studies',
          children: [{ label: 'x', url: '/x' }],
        },
        { label: '', url: '/blank/' },
        { label: 'About', url: '/about', target: '_blank', titleAttr: '' },
      ],
      cacheHint: hint,
    }),
  });
  const items = await getMenuItems('primary', { deps, cache: cacheFor(calls) });
  assert.deepEqual(items, [
    { label: 'Work', url: '/work/', target: undefined, titleAttr: 'Case studies' },
    { label: 'About', url: '/about', target: '_blank', titleAttr: undefined },
  ]);
  assert.deepEqual(calls.tags, [hint]);
});

test('getMenuItems falls back to menus.json for a missing or empty menu', async () => {
  const fb = [{ label: 'Work', url: '/work/' }];
  const missing = makeDeps({ getMenu: async () => ({ items: null }) }, { menu: () => fb });
  assert.deepEqual(await getMenuItems('primary', { deps: missing.deps }), fb);
  assert.match(missing.calls.logs[0], /menu "primary" is missing or empty/);

  const empty = makeDeps({ getMenu: async () => ({ items: [] }) }, { menu: () => fb });
  assert.deepEqual(await getMenuItems('primary', { deps: empty.deps }), fb);
});

test('getMenuItems falls back when the read throws, and is [] with no fallback', async () => {
  const fb = [{ label: 'Work', url: '/work/' }];
  const boom = {
    getMenu: async (): Promise<never> => {
      throw new Error('D1 down');
    },
  };
  const withFb = makeDeps(boom, { menu: () => fb });
  assert.deepEqual(await getMenuItems('footer', { deps: withFb.deps }), fb);
  assert.deepEqual(await getMenuItems('footer', { deps: makeDeps(boom).deps }), []);
});

// ── The bundled fallback reader ──────────────────────────────────────────────

test('entriesOfJson accepts a singleton or a list and drops malformed entries', () => {
  assert.deepEqual(entriesOfJson({ slug: 'home', data: { a: 1 } }), [
    { slug: 'home', data: { a: 1 } },
  ]);
  assert.deepEqual(entriesOfJson([{ slug: 'a', data: {} }, { slug: 'b' }, null, { data: {} }]), [
    { slug: 'a', data: {} },
  ]);
  assert.deepEqual(entriesOfJson(undefined), []);
});

test('fallbackFromFiles serves entries, lists and menus from parsed JSON', () => {
  const fb = fallbackFromFiles({
    page_home: { slug: 'home', data: { heading: 'H' } },
    pricing_tiers: [
      { slug: 'launch', data: { name: 'Launch' } },
      { slug: 'signature', data: { name: 'Signature' } },
    ],
    menus: {
      primary: {
        label: 'Header navigation',
        items: [{ label: 'Work', url: '/work/', titleAttr: 'Case studies' }, { label: 'bad' }],
      },
    },
  });
  assert.deepEqual(fb.entry('page_home', 'home'), { heading: 'H' });
  assert.equal(fb.entry('page_home', 'other'), undefined);
  assert.equal(fb.entry('nope', 'home'), undefined);
  assert.equal(fb.list('pricing_tiers')?.length, 2);
  assert.equal(fb.list('nope'), undefined);
  assert.deepEqual(fb.menu('primary'), [
    { label: 'Work', url: '/work/', target: undefined, titleAttr: 'Case studies' },
  ]);
  assert.equal(fb.menu('footer'), undefined);
});
