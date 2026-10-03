import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import {
  allUnchanged,
  buildPlan,
  contentSurprises,
  followUps,
  formatPlan,
  makeScrubber,
  resultLines,
  runLoad,
  schemaSurprises,
  selectPlan,
} from '../../scripts/lib/production-load.mjs';

// A fake instance. Default behaviour is a state machine per "tool:collection": a dry run
// before apply says "would ...", apply flips it to done, any later dry run says "unchanged".
type Call = { tool: string; collection: string; mode: string };
function fakeInstance(
  opts: { stuck?: string; fail?: string; dirty?: Record<string, string>; preDone?: string[] } = {},
) {
  const done = new Set<string>(opts.preDone ?? []);
  const calls: Call[] = [];
  const runStep = async (c: Call) => {
    calls.push(c);
    const key = `${c.tool}:${c.collection}`;
    if (opts.fail === key && c.mode === 'apply') {
      return { code: 1, output: 'boom: 502 from origin' };
    }
    if (c.mode === 'apply') {
      done.add(key);
      return { code: 0, output: '' };
    }
    const isDone = done.has(key) && opts.stuck !== key;
    if (!isDone && opts.dirty?.[key]) return { code: 0, output: opts.dirty[key] };
    const line =
      c.tool === 'schema'
        ? isDone
          ? '  unchanged field title\n  unchanged collection settings'
          : '  would added field title (string)'
        : isDone
          ? '  x: unchanged'
          : '  x: would create';
    return { code: 0, output: `${c.collection} -> url\n${line}\nok` };
  };
  return { runStep, calls };
}

const plan = buildPlan(
  ['site_settings', 'pricing_tiers', 'page_home', 'pages', 'photos', 'service_offerings'],
  [
    'site_settings',
    'menus',
    'pricing_tiers',
    'page_home',
    'pages',
    'service_offerings',
    'redirects',
  ],
);

async function run(
  p: typeof plan,
  fake: ReturnType<typeof fakeInstance>,
  extra: Record<string, unknown> = {},
  yes = true,
) {
  const logs: string[] = [];
  const pauses: string[] = [];
  const result = await runLoad(
    p,
    {
      runStep: fake.runStep,
      pause: async (m: string) => void pauses.push(m),
      log: (l: string) => void logs.push(l),
      ...extra,
    },
    { url: 'https://prod.test', yes },
  );
  return { result, logs, pauses, calls: fake.calls };
}

const names = (p: typeof plan) => p.map((u) => u.name);

test('plan order follows the runbook and is built from the files on disk', () => {
  assert.deepEqual(names(plan), [
    'site_settings',
    'menus',
    'pricing_tiers',
    'page_home',
    'service_offerings',
    'pages',
    'photos',
    'redirects',
  ]);
  const photos = plan.find((u) => u.name === 'photos');
  assert.deepEqual([photos?.schema, photos?.content], [true, false]);
  const menus = plan.find((u) => u.name === 'menus');
  assert.deepEqual([menus?.schema, menus?.content], [false, true]);
  // A later PR's files slot in with no edit: posts after photos, unknown ones before redirects.
  assert.deepEqual(names(buildPlan(['posts', 'zeta', 'photos'], ['redirects', 'zeta'])), [
    'photos',
    'posts',
    'zeta',
    'redirects',
  ]);
});

test('the real cms/ folders give a plan that starts with site_settings, menus', () => {
  const schema = readdirSync('cms/schema').map((f) => f.replace(/\.mjs$/, ''));
  const content = readdirSync('cms/content').map((f) => f.replace(/\.json$/, ''));
  const real = names(buildPlan(schema, content));
  assert.deepEqual(real.slice(0, 2), ['site_settings', 'menus']);
  assert.ok(real.indexOf('pages') > real.indexOf('service_offerings'));
  assert.ok(real.indexOf('photos') > real.indexOf('pages'));
});

test('selectPlan: --only, --from, bad and conflicting names', () => {
  assert.deepEqual(names(selectPlan(plan, { only: 'pages' })), ['pages']);
  assert.deepEqual(names(selectPlan(plan, { from: 'pages' })), ['pages', 'photos', 'redirects']);
  assert.throws(() => selectPlan(plan, { only: 'nope' }), /Unknown collection "nope"/);
  assert.throws(() => selectPlan(plan, { only: 'pages', from: 'pages' }), /not both/);
});

test('plan mode text lists every step, the pause and the pages expectation', () => {
  const text = formatPlan(plan, 'https://prod.test').join('\n');
  assert.match(text, /Target: https:\/\/prod\.test/);
  assert.match(text, /1\. site_settings: schema \+ content/);
  assert.match(text, /2\. menus: content \(REST\)/);
  assert.match(text, /pages: schema \+ content.*expect updated fields/);
  assert.match(text, /photos: schema.*schema only/);
  assert.match(text, /pauses for Enter/);
});

test('one collection: dry run, apply, read-only re-check, schema then content', async () => {
  const { result, calls } = await run(plan.slice(0, 1), fakeInstance());
  assert.equal(result.ok, true);
  assert.deepEqual(
    calls.map((c) => `${c.tool}:${c.mode}`),
    [
      'schema:dry-run',
      'schema:apply',
      'schema:dry-run',
      'content:dry-run',
      'content:apply',
      'content:dry-run',
    ],
  );
});

test('the whole plan runs in plan order', async () => {
  const { result, calls } = await run(plan, fakeInstance());
  assert.equal(result.ok, true);
  assert.deepEqual([...new Set(calls.map((c) => c.collection))], names(plan));
});

test('stops when the re-check is not all unchanged, and says what to do next', async () => {
  const { result, logs, calls } = await run(plan, fakeInstance({ stuck: 'schema:pricing_tiers' }));
  assert.equal(result.ok, false);
  assert.equal(result.stoppedAt, 'pricing_tiers');
  assert.match(result.step as string, /schema re-check/);
  assert.ok(!calls.some((c) => c.collection === 'page_home'), 'nothing after the stop ran');
  const text = logs.join('\n');
  assert.match(text, /STOPPED at pricing_tiers schema re-check/);
  assert.match(text, /--from pricing_tiers/);
  assert.match(
    text,
    /npm run cms:schema -- --collection pricing_tiers --url https:\/\/prod\.test --dry-run/,
  );
});

test('stops on a non-zero exit from a write and shows the real error text', async () => {
  const { result, logs } = await run(plan, fakeInstance({ fail: 'content:site_settings' }));
  assert.equal(result.ok, false);
  assert.equal(result.stoppedAt, 'site_settings');
  assert.match(logs.join('\n'), /boom: 502 from origin/);
});

test('stops before writing when a dry run would overwrite or remove something', async () => {
  const over = fakeInstance({ dirty: { 'content:pricing_tiers': '  launch: would update' } });
  const a = await run(plan, over);
  assert.equal(a.result.ok, false);
  assert.equal(a.result.stoppedAt, 'pricing_tiers');
  assert.ok(
    !a.calls.some(
      (c) => c.collection === 'pricing_tiers' && c.tool === 'content' && c.mode === 'apply',
    ),
  );
  const drop = fakeInstance({
    dirty: {
      'schema:page_home': '  would dropped title (string -> text); rerun the content loader',
    },
  });
  const b = await run(plan, drop);
  assert.equal(b.result.stoppedAt, 'page_home');
});

test('an already-loaded plan is skipped step by step, so a rerun writes nothing', async () => {
  const sub = plan.slice(0, 3);
  const preDone = sub.flatMap((u) => [
    ...(u.schema ? [`schema:${u.name}`] : []),
    ...(u.content ? [`content:${u.name}`] : []),
  ]);
  const { result, calls } = await run(sub, fakeInstance({ preDone }));
  assert.equal(result.ok, true);
  assert.equal(calls.filter((c) => c.mode === 'apply').length, 0);
});

test('resume: --from starts at the named collection and runs the rest', async () => {
  const { result, calls } = await run(
    selectPlan(plan, { from: 'service_offerings' }),
    fakeInstance(),
  );
  assert.equal(result.ok, true);
  assert.deepEqual(
    [...new Set(calls.map((c) => c.collection))],
    ['service_offerings', 'pages', 'photos', 'redirects'],
  );
});

test('pauses once for Enter, between menus and the rest; not under yes, not when nothing follows', async () => {
  const order: string[] = [];
  const fake = fakeInstance();
  await runLoad(
    plan,
    {
      runStep: async (c: Call) => {
        order.push(c.collection);
        return fake.runStep(c);
      },
      pause: async () => void order.push('PAUSE'),
      log: () => {},
    },
    { url: 'u', yes: false },
  );
  assert.equal(order.filter((x) => x === 'PAUSE').length, 1);
  const i = order.indexOf('PAUSE');
  assert.equal(order[i - 1], 'menus');
  assert.equal(order[i + 1], 'pricing_tiers');

  const only = await run(selectPlan(plan, { only: 'menus' }), fakeInstance(), {}, false);
  assert.equal(only.pauses.length, 0);
  const yes = await run(plan, fakeInstance(), {}, true);
  assert.equal(yes.pauses.length, 0);
});

test('the pages preflight text is logged', async () => {
  const seen: string[] = [];
  const { logs } = await run(selectPlan(plan, { only: 'pages' }), fakeInstance(), {
    preflight: async (c: string) => {
      seen.push(c);
      return c === 'pages' ? 'existing pages entries: about' : undefined;
    },
  });
  assert.deepEqual(seen, ['pages']);
  assert.match(logs.join('\n'), /existing pages entries: about/);
});

test('only the pages collection may update fields', () => {
  const lines = [
    'would updated field title',
    'would updated field content',
    'would added field x (string)',
    'would reorder fields',
  ];
  assert.deepEqual(schemaSurprises(lines, 'pages'), []);
  assert.equal(schemaSurprises(lines, 'page_home').length, 2);
  assert.equal(schemaSurprises(['removed obsolete field a'], 'pages').length, 1);
});

test('posts (the Journal, an existing template collection) may update fields too, nothing else may', () => {
  // The PR 12 dry run: Title, Content and Excerpt are relabelled, `updated` is new.
  const lines = [
    'would updated field title',
    'would updated field content',
    'would updated field excerpt',
    'would added field updated (datetime)',
    'would reorder fields',
    'would applied collection settings',
  ];
  assert.deepEqual(schemaSurprises(lines, 'posts'), []);
  assert.equal(schemaSurprises(lines, 'photos').length, 3);
  assert.equal(schemaSurprises(['removed obsolete field a'], 'posts').length, 1);
});

test('menus: a rebuild of an existing menu is a surprise, a new menu is not', () => {
  assert.equal(contentSurprises(['menu primary: would rebuild 4 items']).length, 1);
  assert.deepEqual(
    contentSurprises(['menu primary: would create', 'menu primary: would rebuild 4 items']),
    [],
  );
  assert.equal(contentSurprises(['redirect /a: would updated']).length, 1);
  assert.deepEqual(contentSurprises(['home: would create', 'about: unchanged']), []);
});

test('reading step output: only the two-space result lines count', () => {
  const out =
    'home -> url (dry run)\n  home: would unchanged\n    [dry-run] would upload a.jpg\ncontent ok\n';
  assert.deepEqual(resultLines(out), ['home: would unchanged']);
  assert.equal(allUnchanged(resultLines(out)), true);
  assert.equal(allUnchanged([]), false);
  assert.equal(allUnchanged(['unchanged field a', 'added field b']), false);
});

test('scrubbing: the token never reaches the log or an error line', async () => {
  const token = 'tok_SECRET_value_123456';
  const scrub = makeScrubber([token]);
  assert.equal(
    scrub(`curl -H "Authorization: Bearer ${token}"`),
    'curl -H "Authorization: Bearer [token hidden]"',
  );
  assert.equal(scrub('Bearer abcdefgh12345678'), 'Bearer [token hidden]');
  assert.equal(makeScrubber(['', 'abc'])('abc stays'), 'abc stays');
  // Through a run: a failing step whose output leaks the token, with the logger scrubbing.
  const logs: string[] = [];
  const result = await runLoad(
    plan.slice(0, 1),
    {
      runStep: async () => ({ code: 1, output: `401 for token ${token}` }),
      log: (l: string) => void logs.push(scrub(l)),
      pause: async () => {},
    },
    { url: 'u', yes: true },
  );
  assert.equal(result.ok, false);
  assert.ok(!logs.join('\n').includes(token));
  assert.match(logs.join('\n'), /\[token hidden\]/);
});

test('follow-ups name the PRODUCTION_HAS collections (no menus, redirects) and automate nothing', () => {
  const text = followUps(plan, 'https://prod.test').join('\n');
  const addLine = text.split('\n').find((l) => l.includes('Add these to PRODUCTION_HAS')) ?? '';
  assert.match(addLine, /'site_settings'.*'pages'/);
  assert.ok(!/'(menus|redirects|photos)'/.test(addLine));
  assert.match(text, /export-seed-from-instance\.mjs --url https:\/\/prod\.test/);
  assert.match(text, /Revoke the API token/);
});

test('the classifiers read the loaders real output, not just the fakes', async () => {
  const { loadEntries, loadMenus } = await import('../../scripts/lib/cms-load.mjs');
  const grab = (fn: (log: (l: string) => void) => unknown) => {
    const out: string[] = [];
    fn((l) => out.push(l));
    return out;
  };
  const get = (data: object) => () => ({ data, status: 'published', _rev: 'r1', id: 'i' });
  const base = { collection: 'c', withFile: () => {}, imageValue: () => ({}), dryRun: true };
  const same = grab((log) =>
    loadEntries({
      ...base,
      entries: [{ slug: 'a', data: { t: 1 } }],
      emdashFn: get({ t: 1 }),
      log,
    }),
  );
  assert.equal(allUnchanged(resultLines(same.join('\n'))), true);
  const changed = grab((log) =>
    loadEntries({
      ...base,
      entries: [{ slug: 'a', data: { t: 2 } }],
      emdashFn: get({ t: 1 }),
      log,
    }),
  );
  assert.equal(contentSurprises(resultLines(changed.join('\n'))).length, 1);
  const fresh = grab((log) =>
    loadEntries({
      ...base,
      entries: [{ slug: 'a', data: { t: 2 } }],
      emdashFn: () => {
        throw new Error('not found');
      },
      log,
    }),
  );
  assert.deepEqual(contentSurprises(resultLines(fresh.join('\n'))), []);

  const menuLines: string[] = [];
  const request = async (method: string, path: string) =>
    method === 'GET' && path === '/menus'
      ? [{ name: 'primary' }]
      : { items: [{ id: 1, label: 'Old', customUrl: '/old' }] };
  await loadMenus(
    request,
    { primary: { label: 'Nav', items: [{ label: 'New', url: '/new' }] } },
    { dryRun: true, log: (l: string) => void menuLines.push(l) },
  );
  assert.equal(contentSurprises(resultLines(menuLines.join('\n'))).length, 1);
});
