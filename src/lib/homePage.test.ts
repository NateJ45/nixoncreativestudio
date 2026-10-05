import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CmsDeps, CmsReader, Raw } from './cms.ts';
import { fallbackFromFiles } from './cmsFallback.ts';
import { getHomePage, homeTitle, normalizeHome } from './homePage.ts';

// ── Fixtures ─────────────────────────────────────────────────────────────────
// The committed fallback, read the way the Worker bundles it.

const readJson = (name: string): unknown =>
  JSON.parse(readFileSync(join(process.cwd(), 'cms/content', `${name}.json`), 'utf8'));
const fallback = fallbackFromFiles({ page_home: readJson('page_home') });
const fallbackRaw = (fallback.entry('page_home', 'home') ?? {}) as Raw;

/** A reader that serves the given entry, or fails the way D1 would. */
function reader(opts: { entry?: Raw | null; entryError?: Error; throws?: boolean }): CmsReader {
  return {
    async getEntry() {
      if (opts.throws) throw new Error('D1 is down');
      return { data: opts.entry ?? null, error: opts.entryError };
    },
    async getList() {
      return { entries: [] };
    },
    async getMenu() {
      return { items: null };
    },
  };
}

function deps(r: CmsReader) {
  const logs: string[] = [];
  const d: CmsDeps = { reader: r, fallback, log: (m) => logs.push(m) };
  return { d, logs };
}

// ── The fallback IS today's hardcoded homepage copy ──────────────────────────
// These literals were copied from Hero.astro, SelectedWork.astro,
// PricingTeaser.astro and ProcessBand.astro on main before this PR. If one of
// them changes, the production homepage changes with it, so it should be a
// deliberate edit of cms/content/page_home.json.

test('the committed fallback reproduces the words the hero and sections used to hold', async () => {
  const { d } = deps(reader({}));
  const home = await getHomePage({}, { deps: d });

  assert.equal(home.hero.heading, 'I make websites that');
  assert.equal(home.hero.headingAccent, 'pull their weight.');
  assert.equal(
    home.hero.positioning,
    'For churches, schools, nonprofits, and small businesses, wherever you are.',
  );
  assert.deepEqual(home.hero.proof, {
    before: 'Based in Cincinnati. Every site designed, built, and photographed by',
    linkText: 'one person',
    after: ', start to finish.',
  });
  assert.equal(home.hero.primaryLabel, 'Start a project');
  assert.equal(home.hero.secondaryLabel, 'See the work');

  assert.equal(home.work.heading, 'Selected work');
  assert.match(home.work.sub, /^A few recent projects\. Each one started with a conversation/);
  assert.equal(home.work.linkLabel, 'Explore more projects');

  assert.equal(home.pricing.heading, 'What it costs');
  assert.equal(home.pricing.includesLead, 'Every build includes, whatever the tier:');
  assert.deepEqual(home.pricing.includes, [
    'A custom design, yours to keep',
    '100 / 100 accessibility',
    'Strategy and a content system, included',
    'One person, start to finish',
  ]);
  assert.equal(home.pricing.linkLabel, 'See full pricing and services');

  assert.equal(home.process.heading, 'How we work');
  assert.equal(home.process.sub, 'Four steps, from the first conversation to launch day.');
  assert.deepEqual(
    home.process.steps.map((s) => [s.num, s.title]),
    [
      ['01', 'Conversation'],
      ['02', 'Strategy'],
      ['03', 'Design and build'],
      ['04', 'Launch and follow-through'],
    ],
  );
  assert.equal(home.process.ctaTitle, 'Tell me what you are building.');
  assert.equal(home.process.ctaLabel, 'Start a project');

  assert.equal(home.seoTitle, 'Nixon Creative Studio | Strategy-led design and photography');
});

// ── Fallback path (production before its data is loaded) ─────────────────────

test('a missing or unpublished entry serves the fallback and logs it', async () => {
  const { d, logs } = deps(reader({ entry: null }));
  const home = await getHomePage({}, { deps: d });
  assert.equal(home.hero.heading, 'I make websites that');
  assert.ok(logs.some((l) => /page_home\/home is missing or unpublished/.test(l)));
});

test('a D1 error or throw serves the fallback', async () => {
  for (const r of [reader({ entryError: new Error('no such table') }), reader({ throws: true })]) {
    const { d, logs } = deps(r);
    const home = await getHomePage({}, { deps: d });
    assert.equal(home.process.steps.length, 4);
    assert.ok(logs.length > 0);
  }
});

test('a half-filled entry (blank headline) falls back instead of rendering a blank hero', async () => {
  const { d, logs } = deps(reader({ entry: { ...fallbackRaw, hero_heading: '   ' } }));
  const home = await getHomePage({}, { deps: d });
  assert.equal(home.hero.heading, 'I make websites that');
  assert.ok(logs.some((l) => /could not be read as the expected shape/.test(l)));
});

test('a short process list or includes list falls back (the layout needs four of each)', async () => {
  for (const patch of [
    { process_steps: (fallbackRaw.process_steps as unknown[]).slice(0, 3) },
    { pricing_includes: (fallbackRaw.pricing_includes as unknown[]).slice(0, 2) },
  ]) {
    const { d, logs } = deps(reader({ entry: { ...fallbackRaw, ...patch } }));
    const home = await getHomePage({}, { deps: d });
    assert.equal(home.process.steps.length, 4);
    assert.equal(home.pricing.includes.length, 4);
    assert.ok(logs.some((l) => /could not be read as the expected shape/.test(l)));
  }
});

// ── CMS path ─────────────────────────────────────────────────────────────────

test('CMS values win over the fallback and a published edit reads through', async () => {
  const edited = {
    ...fallbackRaw,
    hero_heading: 'I build sites that',
    hero_heading_accent: 'earn their keep.',
    process_steps: [
      { title: 'One', body: 'First.' },
      { title: 'Two', body: 'Second.' },
      { title: 'Three', body: 'Third.' },
      { title: 'Four', body: 'Fourth.' },
    ],
  };
  const { d, logs } = deps(reader({ entry: edited }));
  const home = await getHomePage({}, { deps: d });
  assert.equal(logs.length, 0, 'no fallback line is logged on the CMS path');
  assert.equal(home.hero.heading, 'I build sites that');
  assert.equal(home.hero.headingAccent, 'earn their keep.');
  assert.deepEqual(
    home.process.steps.map((s) => [s.num, s.title, s.body]),
    [
      ['01', 'One', 'First.'],
      ['02', 'Two', 'Second.'],
      ['03', 'Three', 'Third.'],
      ['04', 'Four', 'Fourth.'],
    ],
  );
});

test('step numbers are counted from order, and extra rows beyond four are dropped', () => {
  const six = Array.from({ length: 6 }, (_, i) => ({ title: `T${i}`, body: `B${i}` }));
  const home = normalizeHome({ ...fallbackRaw, process_steps: six });
  assert.deepEqual(
    home.process.steps.map((s) => s.num),
    ['01', '02', '03', '04'],
  );
});

test('a blank step row is skipped and the next one takes its number', () => {
  const rowsIn = [
    { title: 'A', body: 'a' },
    { title: '  ', body: 'x' },
    { title: 'B', body: 'b' },
    { title: 'C', body: 'c' },
    { title: 'D', body: 'd' },
  ];
  const home = normalizeHome({ ...fallbackRaw, process_steps: rowsIn });
  assert.deepEqual(
    home.process.steps.map((s) => [s.num, s.title]),
    [
      ['01', 'A'],
      ['02', 'B'],
      ['03', 'C'],
      ['04', 'D'],
    ],
  );
});

test('the headline lead and accent stay separate values (the accent is its own span)', () => {
  const home = normalizeHome(fallbackRaw);
  assert.ok(!home.hero.heading.includes(home.hero.headingAccent));
  assert.ok(home.hero.heading.length <= 32 && home.hero.headingAccent.length <= 28);
});

// ── One read per request ─────────────────────────────────────────────────────

test('components on one request share a single read', async () => {
  let reads = 0;
  const counting: CmsReader = {
    ...reader({}),
    async getEntry() {
      reads += 1;
      return { data: fallbackRaw };
    },
  };
  const { d } = deps(counting);
  const request = new Request('https://example.test/');
  await Promise.all([
    getHomePage({ request }, { deps: d }),
    getHomePage({ request }, { deps: d }),
    getHomePage({ request }, { deps: d }),
  ]);
  assert.equal(reads, 1);
  await getHomePage({ request: new Request('https://example.test/') }, { deps: d });
  assert.equal(reads, 2, 'a different request reads again');
});

// ── Title ────────────────────────────────────────────────────────────────────

test('homeTitle keeps a title that names the studio and adds it back when an edit drops it', () => {
  assert.equal(
    homeTitle(
      'Nixon Creative Studio | Strategy-led design and photography',
      'Nixon Creative Studio',
    ),
    'Nixon Creative Studio | Strategy-led design and photography',
  );
  assert.equal(
    homeTitle('Websites that pull their weight', 'Nixon Creative Studio'),
    'Websites that pull their weight | Nixon Creative Studio',
  );
});
