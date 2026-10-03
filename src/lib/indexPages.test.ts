import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CmsDeps, CmsReader, Raw } from './cms.ts';
import { fallbackFromFiles } from './cmsFallback.ts';
import {
  getJournalPage,
  getNotFoundPage,
  getPhotographyPage,
  getWorkPage,
  indexTitle,
  isInternalPath,
  normalizeNotFoundPage,
  normalizeWorkPage,
} from './indexPages.ts';

// ── Fixtures ─────────────────────────────────────────────────────────────────
// The committed fallback, read the way the Worker bundles it.

const file = (name: string) =>
  JSON.parse(readFileSync(join(process.cwd(), `cms/content/${name}.json`), 'utf8'));

const fallback = fallbackFromFiles({
  page_work: file('page_work'),
  page_photography: file('page_photography'),
  page_journal: file('page_journal'),
  page_not_found: file('page_not_found'),
});
const raw = (collection: string, slug: string) => (fallback.entry(collection, slug) ?? {}) as Raw;

/** A reader that serves the given entry for any collection, or fails the way D1 would. */
function reader(opts: { page?: Raw | null; throws?: boolean }): CmsReader {
  return {
    async getEntry() {
      if (opts.throws) throw new Error('D1 is down');
      return { data: opts.page ?? null };
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

// ── The fallback IS today's hardcoded copy ───────────────────────────────────
// These literals were copied from work/index.astro, photography.astro,
// journal/index.astro and 404.astro on main before this PR. If one changes, the
// production page changes with it, so it should be a deliberate edit of the JSON.

test('the Work fallback reproduces the words /work used to hold', async () => {
  const { d, logs } = deps(reader({ page: null }));
  const page = await getWorkPage({}, { deps: d });
  assert.equal(page.seoTitle, 'Selected work');
  assert.equal(
    page.seoDescription,
    'A list of recent web design, brand, and photography projects from Nixon Creative Studio.',
  );
  assert.equal(page.eyebrow, 'Portfolio');
  assert.equal(page.heading, 'Selected work');
  // The count ("3 projects") is printed in front of this by the page.
  assert.equal(
    page.intro,
    'for churches, schools, nonprofits, and small businesses around Cincinnati. Each one started with a conversation about what the organization actually needed.',
  );
  assert.equal(
    page.emptyFilterMessage,
    'Nothing matches that filter yet. Try clearing one of the chips above.',
  );
  assert.equal(page.liveHeading, 'Open any of them');
  assert.equal(
    page.liveBody,
    'Every project here is a real, shipped site. Do not take my word for it, click through and look around.',
  );
  // The page used the site default for its closing banner.
  assert.equal(page.ctaTitle, undefined);
  assert.equal(page.ctaSub, undefined);
  assert.equal(logs.length, 1);
  assert.match(logs[0], /page_work\/work is missing or unpublished/);
});

test('the Photography fallback reproduces the words /photography used to hold', async () => {
  const { d } = deps(reader({ page: null }));
  const page = await getPhotographyPage({}, { deps: d });
  assert.equal(page.seoTitle, 'Photography');
  assert.equal(
    page.seoDescription,
    'Events, portraits, and environmental photography for organizations in the Cincinnati region.',
  );
  assert.equal(page.heading, 'Photography that matches the');
  assert.equal(page.headingAccent, 'website it lives on.');
  assert.equal(
    page.intro,
    'Events, portraits, and environments for organizations across the Cincinnati region. Most of these photos came from the same projects as the web work. Same person designed the site and showed up with the camera, so the photos and the site look like one piece of work.',
  );
  assert.equal(page.categories.events.title, 'Events');
  assert.equal(
    page.categories.events.body,
    'Sunday mornings, school assemblies, fundraisers, ribbon cuttings. Coverage that tells the story without making the room perform for the camera.',
  );
  assert.equal(page.categories.portraits.title, 'Portraits');
  assert.equal(
    page.categories.portraits.body,
    'Team headshots, staff portraits, leadership pages. Comfortable lighting, consistent treatment, edited for web so the file size stays sane.',
  );
  assert.equal(page.categories.environments.title, 'Environments');
  assert.equal(
    page.categories.environments.body,
    'Lobbies, classrooms, sanctuaries, storefronts. The spaces visitors actually walk into, photographed in the light they actually see.',
  );
  assert.equal(page.emptyHeading, 'The photography portfolio is coming together.');
  assert.equal(
    page.emptyBody,
    "I'm pulling the strongest frames from recent church, school, and small-business projects. In the meantime, the work pages show the photography in context, paired with the sites it was shot for.",
  );
  assert.equal(page.ctaTitle, 'Need photography for your project?');
  assert.equal(
    page.ctaSub,
    'Day-of coverage, headshots, environments. Often paired with web work, sometimes booked on its own.',
  );
});

test('the Journal fallback reproduces the words /journal used to hold', async () => {
  const { d } = deps(reader({ page: null }));
  const page = await getJournalPage({}, { deps: d });
  assert.equal(page.seoTitle, 'Journal');
  assert.equal(
    page.seoDescription,
    'Short essays, process notes, and field reports from the studio.',
  );
  assert.equal(page.heading, 'Journal');
  assert.equal(
    page.intro,
    "Short notes from the studio: process, opinions, the occasional field report. Updated whenever there's something worth writing down.",
  );
  assert.equal(page.emptyKicker, 'First dispatch is coming.');
  assert.equal(page.emptyHeading, 'The first entry is being drafted.');
  assert.equal(
    page.emptyBody,
    "This is where I'll write down how the studio works: the thinking behind a build, notes from a shoot, the small decisions that add up. Nothing's published yet. While you wait, two good places to land.",
  );
  assert.equal(page.ctaTitle, undefined);
});

test('the Not-found fallback reproduces the words the 404 page used to hold', async () => {
  const { d } = deps(reader({ page: null }));
  const page = await getNotFoundPage({}, { deps: d });
  assert.equal(page.seoTitle, 'Page not found');
  assert.equal(page.seoDescription, "That page wandered off. Here's how to get back on track.");
  assert.equal(page.label, 'Page not found');
  assert.equal(page.heading, 'That page wandered off.');
  assert.equal(
    page.body,
    "The link you followed might be old, or the address might be a typo. Nothing's broken on this end. Here are a few places to try instead.",
  );
  assert.deepEqual(page.links, [
    { label: 'Back to home', href: '/' },
    { label: 'See selected work', href: '/work/' },
    { label: 'Get in touch', href: '/contact' },
  ]);
});

// ── The CMS path equals the fallback path ────────────────────────────────────

test('an entry built from the same JSON reads the same as the fallback', async () => {
  const cases: [string, string, () => Promise<unknown>, () => Promise<unknown>][] = [
    [
      'page_work',
      'work',
      () => getWorkPage({}, { deps: deps(reader({ page: raw('page_work', 'work') })).d }),
      () => getWorkPage({}, { deps: deps(reader({ page: null })).d }),
    ],
    [
      'page_photography',
      'photography',
      () =>
        getPhotographyPage(
          {},
          { deps: deps(reader({ page: raw('page_photography', 'photography') })).d },
        ),
      () => getPhotographyPage({}, { deps: deps(reader({ page: null })).d }),
    ],
    [
      'page_journal',
      'journal',
      () => getJournalPage({}, { deps: deps(reader({ page: raw('page_journal', 'journal') })).d }),
      () => getJournalPage({}, { deps: deps(reader({ page: null })).d }),
    ],
    [
      'page_not_found',
      'not-found',
      () =>
        getNotFoundPage({}, { deps: deps(reader({ page: raw('page_not_found', 'not-found') })).d }),
      () => getNotFoundPage({}, { deps: deps(reader({ page: null })).d }),
    ],
  ];
  for (const [name, , viaCms, viaFallback] of cases) {
    assert.deepEqual(
      await viaCms(),
      await viaFallback(),
      `${name}: CMS path differs from fallback`,
    );
  }
});

// ── Failure modes fall back, and say so ──────────────────────────────────────

test('a D1 error serves the fallback and logs it', async () => {
  const { d, logs } = deps(reader({ throws: true }));
  const page = await getNotFoundPage({}, { deps: d });
  assert.equal(page.heading, 'That page wandered off.');
  assert.ok(logs.some((l) => /read of page_not_found\/not-found threw/.test(l)));
});

test('a half-filled entry (blank headline) serves the fallback', async () => {
  const half = { ...raw('page_work', 'work'), heading: '   ' };
  const { d, logs } = deps(reader({ page: half }));
  const page = await getWorkPage({}, { deps: d });
  assert.equal(page.heading, 'Selected work');
  assert.ok(logs.some((l) => /could not be read as the expected shape/.test(l)));
});

test('an edited entry shows the edit', async () => {
  const edited = {
    ...raw('page_photography', 'photography'),
    heading_accent: 'one piece of work.',
    cta_title: 'Book a shoot',
  };
  const { d } = deps(reader({ page: edited }));
  const page = await getPhotographyPage({}, { deps: d });
  assert.equal(page.headingAccent, 'one piece of work.');
  assert.equal(page.ctaTitle, 'Book a shoot');
  // Untouched fields keep today's text.
  assert.equal(page.categories.events.title, 'Events');
});

test('an empty Work label hides the eyebrow instead of failing the entry', () => {
  const page = normalizeWorkPage({ ...raw('page_work', 'work'), eyebrow: '' });
  assert.equal(page.eyebrow, undefined);
});

test('a missing group title makes the Photography entry fall back', async () => {
  const bad = { ...raw('page_photography', 'photography'), portraits_title: '' };
  const { d, logs } = deps(reader({ page: bad }));
  const page = await getPhotographyPage({}, { deps: d });
  assert.equal(page.categories.portraits.title, 'Portraits');
  assert.equal(logs.length, 1);
});

// ── The not-found links: internal paths only ─────────────────────────────────

test('isInternalPath accepts one leading slash and nothing that can leave the site', () => {
  for (const ok of ['/', '/work/', '/contact', '/work/second-presbyterian-chicago/?x=1#a']) {
    assert.equal(isInternalPath(ok), true, ok);
  }
  for (const bad of [
    '',
    'work/',
    '//evil.example',
    'https://example.com',
    'http://example.com/x',
    'javascript:alert(1)',
    '/has space',
    '\\\\evil',
  ]) {
    assert.equal(isInternalPath(bad), false, bad);
  }
});

test('the not-found reader drops bad links, keeps order and caps at three', () => {
  const page = normalizeNotFoundPage({
    ...raw('page_not_found', 'not-found'),
    links: [
      { label: 'Home', href: '/' },
      { label: 'Elsewhere', href: 'https://example.com' },
      { label: '', href: '/blank-label' },
      { label: 'Work', href: '/work/' },
      { label: 'Contact', href: '/contact' },
      { label: 'Fourth', href: '/fourth' },
    ],
  });
  assert.deepEqual(
    page.links.map((l) => l.href),
    ['/', '/work/', '/contact'],
  );
});

test('a not-found entry with no usable link falls back (a dead end is worse than old words)', async () => {
  const dead = {
    ...raw('page_not_found', 'not-found'),
    links: [{ label: 'Out', href: 'https://example.com' }],
  };
  const { d, logs } = deps(reader({ page: dead }));
  const page = await getNotFoundPage({}, { deps: d });
  assert.equal(page.links[0].href, '/');
  assert.ok(logs.some((l) => /could not be read as the expected shape/.test(l)));
});

// ── Titles ───────────────────────────────────────────────────────────────────

test('indexTitle adds the studio name once', () => {
  assert.equal(
    indexTitle('Photography', 'Nixon Creative Studio'),
    'Photography | Nixon Creative Studio',
  );
  assert.equal(
    indexTitle('Page not found', 'Nixon Creative Studio'),
    'Page not found | Nixon Creative Studio',
  );
  assert.equal(
    indexTitle('Journal | Nixon Creative Studio', 'Nixon Creative Studio'),
    'Journal | Nixon Creative Studio',
  );
});
