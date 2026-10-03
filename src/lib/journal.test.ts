import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Raw } from './cms.ts';
import {
  compareJournal,
  formatJournalDate,
  getJournalEntries,
  getJournalEntry,
  hasJournalEntries,
  normalizeJournalEntry,
  type JournalDeps,
  type JournalReader,
} from './journal.ts';

// ── Fixtures ─────────────────────────────────────────────────────────────────

function raw(over: Raw = {}): Raw {
  return {
    title: 'Why the footer matters',
    excerpt: 'A short note on the part of the page nobody designs.',
    publishedAt: '2026-10-03T14:00:00.000Z',
    featured_image: { id: '01CIIMG', provider: 'local', meta: { storageKey: 'ABC.jpg' } },
    updated: null,
    terms: { tag: [{ slug: 'design', label: 'Design' }] },
    content: [
      {
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{ _type: 'span', text: 'word '.repeat(450), marks: [] }],
      },
    ],
    ...over,
  };
}

type Entry = { id: string; data: Raw };

/** A stub reader. `entries` is the published list; 'throw' and 'error' are the failure shapes. */
function deps(entries: Entry[] | 'throw' | 'error') {
  const logs: string[] = [];
  const calls = { list: 0, get: 0, limits: [] as (number | undefined)[] };
  const reader: JournalReader = {
    async list(opts) {
      calls.list += 1;
      calls.limits.push(opts?.limit);
      if (entries === 'throw') throw new Error('D1 is down');
      if (entries === 'error') return { entries: [], error: new Error('no such table: ec_posts') };
      return { entries, cacheHint: { tags: ['posts'] } };
    },
    async get(slug) {
      calls.get += 1;
      if (entries === 'throw') throw new Error('D1 is down');
      if (entries === 'error') return { entry: null, error: new Error('no such table: ec_posts') };
      return { entry: entries.find((e) => e.id === slug) ?? null, cacheHint: { tags: ['posts'] } };
    },
  };
  const d: JournalDeps = { reader, log: (m) => logs.push(m) };
  return { d, logs, calls };
}

// ── normalizeJournalEntry ────────────────────────────────────────────────────

test('normalizeJournalEntry reads the fields, tags, cover and a reading time', () => {
  const e = normalizeJournalEntry(raw(), 'footer');
  assert.ok(e);
  assert.equal(e.id, 'footer');
  assert.equal(e.title, 'Why the footer matters');
  assert.equal(e.summary, 'A short note on the part of the page nobody designs.');
  assert.equal(e.publishedAt.toISOString(), '2026-10-03T14:00:00.000Z');
  assert.equal(e.updated, undefined);
  assert.deepEqual(e.tags, ['Design']);
  assert.equal(e.cover?.id, '01CIIMG');
  assert.equal(e.body.length, 1);
  // 450 words at 200 wpm, rounded up.
  assert.equal(e.minutes, 3);
});

test('normalizeJournalEntry reads the optional updated date and a Date publish stamp', () => {
  const e = normalizeJournalEntry(
    raw({ updated: '2026-10-05T12:00:00.000Z', publishedAt: new Date('2026-10-03T00:00:00Z') }),
    'x',
  );
  assert.equal(e?.updated?.toISOString(), '2026-10-05T12:00:00.000Z');
  assert.equal(e?.publishedAt.toISOString(), '2026-10-03T00:00:00.000Z');
});

test('normalizeJournalEntry: an entry with no title or no summary is left out, never half rendered', () => {
  assert.equal(normalizeJournalEntry(raw({ title: '  ' }), 'x'), undefined);
  assert.equal(normalizeJournalEntry(raw({ excerpt: '' }), 'x'), undefined);
  assert.equal(normalizeJournalEntry(raw({ excerpt: null }), 'x'), undefined);
  assert.equal(normalizeJournalEntry(raw(), ''), undefined);
});

test('normalizeJournalEntry tolerates a missing body, tags, cover and publish stamp', () => {
  const e = normalizeJournalEntry(
    { title: 'T', excerpt: 'S', createdAt: '2026-09-01T00:00:00.000Z' },
    'x',
  );
  assert.ok(e);
  assert.deepEqual(e.body, []);
  assert.deepEqual(e.tags, []);
  assert.equal(e.cover, undefined);
  assert.equal(e.minutes, 1);
  assert.equal(e.publishedAt.toISOString(), '2026-09-01T00:00:00.000Z');
  // An un-uploaded migration reference is not a picture.
  assert.equal(
    normalizeJournalEntry(raw({ featured_image: { $file: 'src/assets/x.jpg' } }), 'x')?.cover,
    undefined,
  );
});

test('compareJournal sorts newest first and breaks ties by slug', () => {
  const a = normalizeJournalEntry(raw({ publishedAt: '2026-10-01T00:00:00Z' }), 'a')!;
  const b = normalizeJournalEntry(raw({ publishedAt: '2026-10-02T00:00:00Z' }), 'b')!;
  const c = normalizeJournalEntry(raw({ publishedAt: '2026-10-02T00:00:00Z' }), 'c')!;
  assert.deepEqual(
    [a, c, b].sort(compareJournal).map((e) => e.id),
    ['b', 'c', 'a'],
  );
});

// ── readers ──────────────────────────────────────────────────────────────────

test('getJournalEntries returns the published entries newest first', async () => {
  const { d } = deps([
    { id: 'old', data: raw({ publishedAt: '2026-01-01T00:00:00Z' }) },
    { id: 'new', data: raw({ publishedAt: '2026-06-01T00:00:00Z' }) },
  ]);
  assert.deepEqual(
    (await getJournalEntries({ deps: d })).map((e) => e.id),
    ['new', 'old'],
  );
});

test('getJournalEntries: zero entries reads as an empty list (the empty state), no log', async () => {
  const { d, logs } = deps([]);
  assert.deepEqual(await getJournalEntries({ deps: d }), []);
  assert.deepEqual(logs, []);
});

test('getJournalEntries drops an unusable entry but keeps the rest', async () => {
  const { d } = deps([
    { id: 'ok', data: raw() },
    { id: 'no-summary', data: raw({ excerpt: '' }) },
  ]);
  assert.deepEqual(
    (await getJournalEntries({ deps: d })).map((e) => e.id),
    ['ok'],
  );
});

test('a read error, a thrown error and a missing table all read as an empty journal, with a log', async () => {
  for (const failure of ['error', 'throw'] as const) {
    const { d, logs } = deps(failure);
    assert.deepEqual(await getJournalEntries({ deps: d }), []);
    assert.equal(await getJournalEntry('x', { deps: d }), undefined);
    assert.equal(await hasJournalEntries({}, { deps: d }), false);
    assert.equal(logs.length, 3, `${failure}: each read logs why`);
  }
});

test('getJournalEntry finds a published slug and answers undefined for an unknown one', async () => {
  const { d } = deps([{ id: 'footer', data: raw() }]);
  assert.equal((await getJournalEntry('footer', { deps: d }))?.title, 'Why the footer matters');
  assert.equal(await getJournalEntry('nope', { deps: d }), undefined);
});

test('a draft is never returned: the reader only ever hands over published rows', async () => {
  // EmDash filters drafts out before they reach us (status = published); the stub models
  // that by not listing one. What we add: an entry that reaches us half-written is dropped.
  const { d } = deps([{ id: 'draft-like', data: raw({ title: '', excerpt: '' }) }]);
  assert.deepEqual(await getJournalEntries({ deps: d }), []);
  assert.equal(await getJournalEntry('draft-like', { deps: d }), undefined);
  assert.equal(await hasJournalEntries({}, { deps: d }), false);
});

test('reads add their cache tags to the route cache when it is on', async () => {
  const { d } = deps([{ id: 'a', data: raw() }]);
  const seen: unknown[] = [];
  const cache = { enabled: true, set: (h: unknown) => seen.push(h) };
  await getJournalEntries({ deps: d, cache });
  await getJournalEntry('a', { deps: d, cache });
  await hasJournalEntries({ cache }, { deps: d });
  assert.equal(seen.length, 3);
  assert.deepEqual(seen[0], { tags: ['posts'] });
  // A disabled cache (dev) is left alone.
  const off = { enabled: false, set: () => assert.fail('must not be called') };
  await getJournalEntries({ deps: d, cache: off });
});

// ── hasJournalEntries ────────────────────────────────────────────────────────

test('hasJournalEntries is false for none and true for at least one', async () => {
  assert.equal(await hasJournalEntries({}, { deps: deps([]).d }), false);
  assert.equal(await hasJournalEntries({}, { deps: deps([{ id: 'a', data: raw() }]).d }), true);
  // An entry that cannot be shown does not turn the menu item on.
  assert.equal(
    await hasJournalEntries({}, { deps: deps([{ id: 'a', data: raw({ excerpt: '' }) }]).d }),
    false,
  );
});

test('hasJournalEntries is read once per request (the Header and the Footer share it)', async () => {
  const { d, calls } = deps([{ id: 'a', data: raw() }]);
  const request = new Request('https://example.com/');
  const [one, two] = await Promise.all([
    hasJournalEntries({ request }, { deps: d }),
    hasJournalEntries({ request }, { deps: d }),
  ]);
  assert.equal(one, true);
  assert.equal(two, true);
  assert.equal(calls.list, 1);
  // A different request reads again.
  await hasJournalEntries({ request: new Request('https://example.com/other') }, { deps: d });
  assert.equal(calls.list, 2);
});

// ── dates ────────────────────────────────────────────────────────────────────

test('formatJournalDate shows the studio day (Cincinnati), not the Worker UTC day', () => {
  // 02:00 UTC on Oct 4 is still the evening of Oct 3 in Cincinnati.
  const d = new Date('2026-10-04T02:00:00.000Z');
  assert.equal(formatJournalDate(d), 'Oct 3, 2026');
  assert.equal(formatJournalDate(d, true), 'October 3, 2026');
});
