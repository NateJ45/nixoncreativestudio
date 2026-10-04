import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  applyRewrites,
  hasFileRefs,
  loadEntries,
  loadMenus,
  loadRedirects,
  planEntry,
  planPatch,
  resolveFiles,
  sameMenuItems,
  toEntries,
} from '../../scripts/lib/cms-load.mjs';
import { isSafeTarget } from '../../scripts/cms/args.mjs';
import { contentSurprises } from '../../scripts/lib/production-load.mjs';

const quiet = () => {};

test('toEntries accepts a singleton or a list and rejects a bad shape', () => {
  assert.deepEqual(toEntries({ slug: 'home', data: { a: 1 } }), [{ slug: 'home', data: { a: 1 } }]);
  assert.equal(
    toEntries([
      { slug: 'a', data: {} },
      { slug: 'b', data: {} },
    ]).length,
    2,
  );
  assert.throws(() => toEntries({ data: {} }), /needs a string "slug"/);
  assert.throws(() => toEntries({ slug: 'x', data: [] }), /"data" must be an object/);
  assert.throws(
    () =>
      toEntries([
        { slug: 'a', data: {} },
        { slug: 'a', data: {} },
      ]),
    /duplicate slug "a"/,
  );
});

test('resolveFiles swaps every $file (nested, in repeaters) and copies the rest', () => {
  const seen: string[] = [];
  const out = resolveFiles(
    {
      title: 'About',
      headshot: { $file: 'src/assets/brand/headshot.jpg', alt: 'Nathan' },
      photos: [{ image: { $file: 'src/assets/about/family.jpg', alt: 'Family' }, caption: 'Us' }],
      untouched: { src: '/x.png' },
    },
    (file: string, alt: string) => {
      seen.push(file);
      return { id: `id:${file}`, alt };
    },
  );
  assert.deepEqual(seen, ['src/assets/brand/headshot.jpg', 'src/assets/about/family.jpg']);
  assert.deepEqual(out.headshot, { id: 'id:src/assets/brand/headshot.jpg', alt: 'Nathan' });
  assert.deepEqual(out.photos[0].image, { id: 'id:src/assets/about/family.jpg', alt: 'Family' });
  assert.deepEqual(out.untouched, { src: '/x.png' });
  assert.equal(hasFileRefs({ a: [{ b: { $file: 'x' } }] }), true);
  assert.equal(hasFileRefs(out), false);
});

test('planEntry: a stored 0/1 equals a file boolean (EmDash stores booleans as 0 or 1)', () => {
  const desired = { highlighted: false, show_toc: true, rows: [{ on: false }] };
  const stored = {
    status: 'published',
    data: { highlighted: 0, show_toc: 1, rows: [{ on: 0 }] },
  };
  assert.equal(planEntry(stored, desired), 'unchanged');
  assert.equal(
    planEntry({ ...stored, data: { ...stored.data, highlighted: 1 } }, desired),
    'update',
  );
});

test('planEntry: a stored image (extra meta, no src) equals the loader-built one', () => {
  const built = {
    id: 'M1',
    src: '/_emdash/api/media/file/K.jpg',
    alt: 'A',
    width: 10,
    height: 20,
    provider: 'local',
    meta: { storageKey: 'K.jpg' },
  };
  const stored = {
    id: 'M1',
    provider: 'local',
    width: 10,
    height: 20,
    alt: 'A',
    meta: { storageKey: 'K.jpg', caption: null, blurhash: 'L9', dominantColor: 'rgb(1,2,3)' },
  };
  const desired = { headshot: built, photos: [{ image: built, caption: 'c' }] };
  const existing = {
    status: 'published',
    data: { headshot: stored, photos: [{ image: stored, caption: 'c' }] },
  };
  assert.equal(planEntry(existing, desired), 'unchanged');
  const other = { ...existing, data: { ...existing.data, headshot: { ...stored, id: 'M2' } } };
  assert.equal(planEntry(other, desired), 'update');
  const alt = { ...existing, data: { ...existing.data, headshot: { ...stored, alt: 'B' } } };
  assert.equal(planEntry(alt, desired), 'update');
});

test('planEntry: create, unchanged, publish and update', () => {
  const desired = { title: 'T', n: 2, rows: [{ text: 'a' }] };
  assert.equal(planEntry(null, desired), 'create');
  const same = {
    id: '1',
    status: 'published',
    data: { title: 'T', n: 2, rows: [{ text: 'a' }], extra: 'ignored' },
  };
  assert.equal(planEntry(same, desired), 'unchanged');
  assert.equal(planEntry({ ...same, status: 'draft' }, desired), 'publish');
  assert.equal(planEntry({ ...same, data: { ...same.data, title: 'Changed' } }, desired), 'update');
  assert.equal(planEntry(same, desired, { force: true }), 'update');
  // empty values compare equal to missing ones
  assert.equal(
    planEntry(
      { ...same, data: { title: 'T', n: 2, rows: [{ text: 'a' }], note: null } },
      { ...desired, note: '' },
    ),
    'unchanged',
  );
});

function stubCli(store: Record<string, any>) {
  const calls: string[][] = [];
  const emdashFn = (args: string[]) => {
    calls.push(args);
    if (args[0] === 'content' && args[1] === 'get') {
      const e = store[`${args[2]}/${args[3]}`];
      if (!e) throw new Error('emdash content get failed: Not found');
      return e;
    }
    return { id: 'new' };
  };
  const withFile = (data: unknown, fn: (path: string) => unknown) =>
    fn(`<file ${JSON.stringify(data).length}>`);
  return { emdashFn, withFile, calls };
}

test('loadEntries creates new entries and updates changed ones with the revision token', () => {
  const stub = stubCli({
    'page_home/home': { id: 'H1', _rev: 'r9', status: 'published', data: { title: 'Old' } },
  });
  const results = loadEntries({
    collection: 'page_home',
    entries: [
      { slug: 'home', data: { title: 'New' } },
      { slug: 'extra', data: { title: 'Fresh' } },
    ],
    emdashFn: stub.emdashFn,
    withFile: stub.withFile,
    imageValue: () => ({}),
    log: quiet,
  });
  assert.deepEqual(results, [
    { slug: 'home', action: 'update' },
    { slug: 'extra', action: 'create' },
  ]);
  const update = stub.calls.find((c) => c[1] === 'update')!;
  assert.deepEqual(update.slice(0, 6), ['content', 'update', 'page_home', 'H1', '--rev', 'r9']);
  assert.ok(stub.calls.some((c) => c[1] === 'create' && c.includes('extra')));
});

test('loadEntries is a no-op on a second run (nothing written)', () => {
  const stub = stubCli({
    'page_home/home': { id: 'H1', _rev: 'r1', status: 'published', data: { title: 'Same' } },
  });
  const results = loadEntries({
    collection: 'page_home',
    entries: [{ slug: 'home', data: { title: 'Same' } }],
    emdashFn: stub.emdashFn,
    withFile: stub.withFile,
    imageValue: () => ({}),
    log: quiet,
  });
  assert.deepEqual(results, [{ slug: 'home', action: 'unchanged' }]);
  assert.deepEqual(
    stub.calls.filter((c) => c[1] !== 'get'),
    [],
  );
});

test('loadEntries publishes an identical draft, and dry run writes nothing', () => {
  const stub = stubCli({
    'page_home/home': { id: 'H1', _rev: 'r1', status: 'draft', data: { title: 'Same' } },
  });
  loadEntries({
    collection: 'page_home',
    entries: [{ slug: 'home', data: { title: 'Same' } }],
    emdashFn: stub.emdashFn,
    withFile: stub.withFile,
    imageValue: () => ({}),
    dryRun: true,
    log: quiet,
  });
  assert.deepEqual(
    stub.calls.filter((c) => c[1] !== 'get'),
    [],
  );
  loadEntries({
    collection: 'page_home',
    entries: [{ slug: 'home', data: { title: 'Same' } }],
    emdashFn: stub.emdashFn,
    withFile: stub.withFile,
    imageValue: () => ({}),
    log: quiet,
  });
  assert.ok(stub.calls.some((c) => c[1] === 'publish'));
});

test('loadEntries refuses to update without a revision token', () => {
  const stub = stubCli({
    'page_home/home': { id: 'H1', status: 'published', data: { title: 'Old' } },
  });
  assert.throws(
    () =>
      loadEntries({
        collection: 'page_home',
        entries: [{ slug: 'home', data: { title: 'New' } }],
        emdashFn: stub.emdashFn,
        withFile: stub.withFile,
        imageValue: () => ({}),
        log: quiet,
      }),
    /no _rev/,
  );
});

test('loadEntries resolves images before comparing', () => {
  const stub = stubCli({
    'page_about/about': {
      id: 'A',
      _rev: 'r',
      status: 'published',
      data: { headshot: { id: 'm1', alt: 'N' } },
    },
  });
  const results = loadEntries({
    collection: 'page_about',
    entries: [
      { slug: 'about', data: { headshot: { $file: 'src/assets/brand/headshot.jpg', alt: 'N' } } },
    ],
    emdashFn: stub.emdashFn,
    withFile: stub.withFile,
    imageValue: (_f: string, alt: string) => ({ id: 'm1', alt }),
    log: quiet,
  });
  assert.equal(results[0].action, 'unchanged');
});

// ── menus and redirects ─────────────────────────────────────────────────────

function fakeRest(initial: {
  menus?: any[];
  menuItems?: Record<string, any[]>;
  redirects?: any[];
}) {
  const writes: string[] = [];
  const request = async (method: string, path: string, body?: any) => {
    if (method !== 'GET') writes.push(`${method} ${path}${body ? ' ' + JSON.stringify(body) : ''}`);
    if (method === 'GET' && path === '/menus') return initial.menus ?? [];
    const m = path.match(/^\/menus\/([a-z]+)$/);
    if (m && method === 'GET') return { name: m[1], items: initial.menuItems?.[m[1]] ?? [] };
    if (method === 'GET' && path.startsWith('/redirects'))
      return { items: initial.redirects ?? [] };
    return {};
  };
  return { request, writes };
}

test('loadMenus creates a missing menu and its items in order', async () => {
  const rest = fakeRest({});
  await loadMenus(
    rest.request,
    {
      primary: {
        label: 'Header navigation',
        items: [
          { label: 'Work', url: '/work/', titleAttr: 'Case studies' },
          { label: 'About', url: '/about' },
        ],
      },
    },
    { log: quiet },
  );
  assert.equal(rest.writes[0], 'POST /menus {"name":"primary","label":"Header navigation"}');
  assert.match(
    rest.writes[1],
    /POST \/menus\/primary\/items .*"customUrl":"\/work\/".*"titleAttr":"Case studies".*"sortOrder":0/,
  );
  assert.match(rest.writes[2], /"customUrl":"\/about".*"sortOrder":1/);
});

test('loadMenus leaves a matching menu alone and rebuilds a different one', async () => {
  const items = [
    { id: 'i1', label: 'Work', customUrl: '/work/', titleAttr: 'Case studies' },
    { id: 'i2', label: 'About', customUrl: '/about' },
  ];
  const same = fakeRest({ menus: [{ name: 'primary' }], menuItems: { primary: items } });
  const wanted = {
    primary: {
      label: 'Header navigation',
      items: [
        { label: 'Work', url: '/work/', titleAttr: 'Case studies' },
        { label: 'About', url: '/about' },
      ],
    },
  };
  assert.deepEqual(await loadMenus(same.request, wanted, { log: quiet }), [
    { name: 'primary', action: 'unchanged' },
  ]);
  assert.deepEqual(same.writes, []);

  const changed = fakeRest({
    menus: [{ name: 'primary' }],
    menuItems: { primary: items.slice(0, 1) },
  });
  const res = await loadMenus(changed.request, wanted, { log: quiet });
  assert.deepEqual(res, [{ name: 'primary', action: 'rebuilt' }]);
  assert.equal(changed.writes[0], 'DELETE /menus/primary/items/i1');
  assert.equal(changed.writes.filter((w) => w.startsWith('POST /menus/primary/items')).length, 2);

  const dry = fakeRest({ menus: [{ name: 'primary' }], menuItems: { primary: items.slice(0, 1) } });
  await loadMenus(dry.request, wanted, { dryRun: true, log: quiet });
  assert.deepEqual(dry.writes, []);
  assert.equal(sameMenuItems(items, wanted.primary.items), true);
});

test('loadRedirects creates, updates and skips by source path', async () => {
  const rest = fakeRest({
    redirects: [
      { id: 'r1', source: '/now', destination: '/about/#now', type: 301, enabled: true },
      { id: 'r2', source: '/old', destination: '/somewhere/', type: 302, enabled: true },
    ],
  });
  const res = await loadRedirects(
    rest.request,
    [
      { source: '/now', destination: '/about/#now' },
      { source: '/old', destination: '/work/' },
      { source: '/work/west-chester-preschool', destination: '/work/' },
    ],
    { log: quiet },
  );
  assert.deepEqual(
    res.map((r: { action: string }) => r.action),
    ['unchanged', 'updated', 'created'],
  );
  assert.equal(rest.writes.length, 2);
  assert.match(rest.writes[0], /^PUT \/redirects\/r2/);
  assert.match(rest.writes[1], /^POST \/redirects .*west-chester-preschool/);
});

// ── the production guard ────────────────────────────────────────────────────

test('only ncs-ci and local addresses are safe without --yes', () => {
  assert.equal(isSafeTarget('https://ncs-ci.nathanjnixon86.workers.dev'), true);
  assert.equal(isSafeTarget('http://localhost:4321'), true);
  assert.equal(isSafeTarget('http://127.0.0.1:8787'), true);
  assert.equal(isSafeTarget('https://www.nixoncreativestudio.com'), false);
  assert.equal(isSafeTarget('https://nixoncreativestudio.com'), false);
  assert.equal(isSafeTarget('https://nixoncreativestudio.nathanjnixon86.workers.dev'), false);
  assert.equal(isSafeTarget('https://ncs-ci.nathanjnixon86.workers.dev.evil.example'), false);
  assert.equal(isSafeTarget('not a url'), false);
});

// ── patch entries (case_studies.json, CMS-DESIGN PR 13) ─────────────────────
// An entry that exists already gets a few fields, once. A value the instance already holds (even
// 0 or false) is never overwritten, so a rerun cannot undo an edit made in the admin.

test('toEntries keeps the patch flag and nothing else extra', () => {
  assert.deepEqual(toEntries([{ slug: 'a', patch: true, data: { in_hero: true } }]), [
    { slug: 'a', data: { in_hero: true }, patch: true },
  ]);
  assert.deepEqual(toEntries([{ slug: 'a', patch: 'yes', data: {} }]), [{ slug: 'a', data: {} }]);
});

test('planPatch sets only the fields the instance holds nothing for', () => {
  const want = { in_hero: true, hero_order: 2 };
  // Production before the load: the columns exist (or not) and are empty.
  assert.deepEqual(planPatch({ data: { title: 'T' } }, want), { action: 'seed', data: want });
  assert.deepEqual(planPatch({ data: { in_hero: null, hero_order: null } }, want), {
    action: 'seed',
    data: want,
  });
  // One field already set: only the other is written.
  assert.deepEqual(planPatch({ data: { in_hero: 1 } }, want), {
    action: 'seed',
    data: { hero_order: 2 },
  });
  // Both set, even to "off" values an editor chose: nothing to do.
  assert.deepEqual(planPatch({ data: { in_hero: 0, hero_order: 9 } }, want), {
    action: 'unchanged',
  });
  assert.equal(
    planPatch({ item: { data: { in_hero: 1, hero_order: 1 } } }, want).action,
    'unchanged',
  );
  // An entry that is not in this instance is skipped, never created.
  assert.equal(planPatch(null, want).action, 'unchanged');
});

test('loadEntries patches an existing entry with only the missing fields, via content update', () => {
  const stub = stubCli({
    'case_studies/a': {
      id: 'A1',
      _rev: 'r1',
      status: 'published',
      data: { title: 'Kept', in_hero: null, hero_order: null },
    },
    'case_studies/b': {
      id: 'B1',
      _rev: 'r2',
      status: 'published',
      data: { title: 'Edited', in_hero: 0, hero_order: 7 },
    },
  });
  const lines: string[] = [];
  const results = loadEntries({
    collection: 'case_studies',
    entries: [
      { slug: 'a', patch: true, data: { in_hero: true, hero_order: 1 } },
      { slug: 'b', patch: true, data: { in_hero: true, hero_order: 2 } },
      { slug: 'gone', patch: true, data: { in_hero: true, hero_order: 3 } },
    ],
    emdashFn: stub.emdashFn,
    withFile: stub.withFile,
    imageValue: () => ({}),
    log: (l: string) => void lines.push(l),
  });
  assert.deepEqual(results, [
    { slug: 'a', action: 'seed' },
    { slug: 'b', action: 'unchanged' },
    { slug: 'gone', action: 'unchanged' },
  ]);
  const updates = stub.calls.filter((c) => c[1] === 'update');
  assert.equal(updates.length, 1, 'only entry a is written');
  assert.deepEqual(updates[0].slice(0, 6), [
    'content',
    'update',
    'case_studies',
    'A1',
    '--rev',
    'r1',
  ]);
  assert.ok(!stub.calls.some((c) => c[1] === 'create'), 'a patch never creates an entry');
  assert.ok(lines.includes('  a: seed'));
  assert.ok(lines.includes('  gone: unchanged'));
});

test('a patch dry run writes nothing and reads "would seed"; the rerun reads unchanged', () => {
  const entries = [{ slug: 'a', patch: true, data: { in_hero: true, hero_order: 1 } }];
  const run = (data: object, dryRun: boolean) => {
    const stub = stubCli({
      'case_studies/a': { id: 'A1', _rev: 'r1', status: 'published', data },
    });
    const lines: string[] = [];
    loadEntries({
      collection: 'case_studies',
      entries,
      emdashFn: stub.emdashFn,
      withFile: stub.withFile,
      imageValue: () => ({}),
      dryRun,
      log: (l: string) => void lines.push(l),
    });
    return { lines, calls: stub.calls };
  };
  const before = run({}, true);
  assert.deepEqual(before.lines, ['  a: would seed']);
  assert.ok(!before.calls.some((c) => c[1] === 'update'));
  const after = run({ in_hero: 1, hero_order: 1 }, true);
  assert.deepEqual(after.lines, ['  a: unchanged']);
});

// ── patch "set" and "rewrite" (redesign 2026 copy pass) ─────────────────────

test('toEntries keeps set and rewrite on a patch and rejects a bad rewrite', () => {
  const [e] = (toEntries as (j: unknown) => Record<string, unknown>[])([
    {
      slug: 'a',
      patch: true,
      data: {},
      set: { featured: false },
      rewrite: { body: [{ find: 'we built', replace: 'I built' }] },
    },
  ]);
  assert.deepEqual(e.set, { featured: false });
  assert.deepEqual(e.rewrite, { body: [{ find: 'we built', replace: 'I built' }] });
  assert.throws(
    () => toEntries([{ slug: 'a', patch: true, data: {}, rewrite: { body: [{ find: '' }] } }]),
    /"rewrite" must be/,
  );
  assert.throws(
    () => toEntries([{ slug: 'a', patch: true, data: {}, set: [] }]),
    /"set" must be an object/,
  );
  // Only a patch reads them.
  assert.deepEqual(toEntries([{ slug: 'a', data: {}, set: { x: 1 } }]), [{ slug: 'a', data: {} }]);
});

test('applyRewrites edits strings, Portable Text spans and repeater rows, never other keys', () => {
  const body = [
    { _type: 'block', style: 'h2', children: [{ _type: 'span', text: 'What we built' }] },
    { _type: 'block', children: [{ _type: 'span', text: 'They came to us in May.' }] },
    { _type: 'image', alt: 'we built this' },
  ];
  const rules = [
    { find: 'came to us', replace: 'came to me' },
    { find: 'we built', replace: 'I built' },
  ];
  const { value, applied, missing } = applyRewrites(body, rules);
  assert.equal(applied, 2);
  assert.deepEqual(missing, []);
  assert.equal(value[0].children[0].text, 'What I built');
  assert.equal(value[1].children[0].text, 'They came to me in May.');
  assert.equal(value[2].alt, 'we built this', 'only text keys are touched');
  assert.equal(
    applyRewrites('We built it.', [{ find: 'We built', replace: 'I built' }]).value,
    'I built it.',
  );
  assert.deepEqual(applyRewrites([{ text: 'a row' }], [{ find: 'row', replace: 'line' }]).value, [
    { text: 'a line' },
  ]);
});

test('planPatch: a rewrite fires only while the old words are there, and says update', () => {
  const rewrite = {
    designer_note: [{ find: 'the time dropped a lot.', replace: 'the office had a record.' }],
  };
  const before = { data: { designer_note: 'After launch, the time dropped a lot.' } };
  assert.deepEqual(planPatch(before, {}, { rewrite }), {
    action: 'update',
    data: { designer_note: 'After launch, the office had a record.' },
  });
  // Already applied: nothing to do, no note.
  const done = { data: { designer_note: 'After launch, the office had a record.' } };
  assert.deepEqual(planPatch(done, {}, { rewrite }), { action: 'unchanged' });
  // Edited in the admin since: left alone, with a note saying so.
  const edited = { data: { designer_note: 'Nathan rewrote this himself.' } };
  const plan = planPatch(edited, {}, { rewrite });
  assert.equal(plan.action, 'unchanged');
  assert.match(plan.note ?? '', /designer_note: "the time dropped a lot\." not found, left alone/);
});

test('planPatch: set overwrites only what differs, and set-once fields still never overwrite', () => {
  const existing = { data: { featured: 1, outcome: 'Old', in_hero: 0, launch_status: null } };
  const plan = planPatch(
    existing,
    { in_hero: true, launch_status: 'built-not-launched' },
    { set: { featured: false, outcome: 'New' } },
  );
  assert.deepEqual(plan, {
    action: 'update',
    data: { launch_status: 'built-not-launched', featured: false, outcome: 'New' },
  });
  // After the apply the same plan reads unchanged (booleans come back as 0/1).
  const after = {
    data: { featured: 0, outcome: 'New', in_hero: 0, launch_status: 'built-not-launched' },
  };
  assert.deepEqual(
    planPatch(
      after,
      { in_hero: true, launch_status: 'built-not-launched' },
      { set: { featured: false, outcome: 'New' } },
    ),
    { action: 'unchanged' },
  );
});

test('a patch with overwrites reads "would update", which cms:production-load stops on', () => {
  const stub = stubCli({
    'case_studies/a': { id: 'A1', _rev: 'r1', status: 'published', data: { outcome: 'Old' } },
  });
  const lines: string[] = [];
  loadEntries({
    collection: 'case_studies',
    entries: [{ slug: 'a', patch: true, data: {}, set: { outcome: 'New' } }],
    emdashFn: stub.emdashFn,
    withFile: stub.withFile,
    imageValue: () => ({}),
    dryRun: true,
    log: (l: string) => void lines.push(l),
  });
  assert.deepEqual(lines, ['  a: would update']);
  assert.ok(!stub.calls.some((c) => c[1] === 'update'), 'a dry run writes nothing');
  assert.equal(contentSurprises(lines.map((l) => l.trim())).length, 1);
});

test('the committed case_studies.json loads: every rewrite rule is well formed', () => {
  const entries = toEntries(
    JSON.parse(readFileSync(join(process.cwd(), 'cms/content/case_studies.json'), 'utf8')),
  );
  assert.ok(
    entries.every((e) => 'patch' in e && e.patch === true),
    'every entry is a patch',
  );
});

// ── every committed content file has a valid shape ──────────────────────────

test('every cms/content/*.json is readable by the loader and the fallback', () => {
  const dir = join(process.cwd(), 'cms/content');
  if (!existsSync(dir)) return;
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const json = JSON.parse(readFileSync(join(dir, file), 'utf8'));
    const name = file.replace(/\.json$/, '');
    if (name === 'menus') {
      for (const [menu, def] of Object.entries<any>(json)) {
        assert.ok(def.label && Array.isArray(def.items), `${file}: ${menu} needs label and items`);
      }
    } else if (name === 'redirects') {
      assert.ok(Array.isArray(json), `${file}: must be an array`);
    } else {
      toEntries(json, file);
    }
  }
});
