import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  hasFileRefs,
  loadEntries,
  loadMenus,
  loadRedirects,
  planEntry,
  resolveFiles,
  sameMenuItems,
  toEntries,
} from '../../scripts/lib/cms-load.mjs';
import { isSafeTarget } from '../../scripts/cms/args.mjs';

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
