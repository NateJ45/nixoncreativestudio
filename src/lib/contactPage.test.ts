import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CmsDeps, CmsReader, Raw } from './cms.ts';
import { fallbackFromFiles } from './cmsFallback.ts';
import { contactTitle, getContactPage, normalizeContactPage } from './contactPage.ts';

// ── Fixtures ─────────────────────────────────────────────────────────────────
// The committed fallback, read the way the Worker bundles it.

const fallback = fallbackFromFiles({
  page_contact: JSON.parse(
    readFileSync(join(process.cwd(), 'cms/content/page_contact.json'), 'utf8'),
  ),
});
const pageRaw = (fallback.entry('page_contact', 'contact') ?? {}) as Raw;

/** A reader that serves the given page entry, or fails the way D1 would. */
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

// ── The fallback IS today's hardcoded /contact copy ──────────────────────────
// These literals were copied from contact.astro on main before this PR. If one
// changes, the production page (and the inquiry emails) change with it, so it
// should be a deliberate edit of cms/content/page_contact.json.

test('the committed fallback reproduces the words /contact used to hold', async () => {
  const { d, logs } = deps(reader({ page: null }));
  const page = await getContactPage({}, { deps: d });
  assert.equal(page.seoTitle, 'Contact');
  assert.equal(
    page.seoDescription,
    'Get in touch about a web design, brand, or photography project.',
  );
  assert.equal(page.heading, 'Start a project, or just');
  assert.equal(page.headingAccent, 'say hello.');
  assert.equal(
    page.intro,
    "The form sends straight to my inbox. If you'd rather email or call, those work just as well.",
  );
  assert.equal(page.ctaTitle, 'Rather skip the form?');
  assert.equal(page.ctaLabel, 'Email me');
  assert.deepEqual(page.nextSteps, [
    'You send the form.',
    'I read it myself and reply within one or two business days.',
    "If we're a fit, a half-hour call to talk it through.",
  ]);
  assert.match(page.whereText, /^In-person work and photography across the greater Cincinnati/);
  assert.ok(logs.length > 0, 'the fallback is logged');
});

test('the option lists are the visible labels the form used to show', async () => {
  const { d } = deps(reader({ page: null }));
  const page = await getContactPage({}, { deps: d });
  assert.deepEqual(page.budgets, [
    'Under $4,000',
    '$4,000 to $7,000',
    '$7,000 to $12,000',
    '$12,000 or more',
    'Not sure yet',
  ]);
  assert.deepEqual(page.timelines, [
    'Right away',
    'In the next 1 to 3 months',
    '3 to 6 months from now',
    'More than 6 months out',
    'Flexible, no fixed deadline',
  ]);
  assert.equal(page.heardFrom.length, 6);
  assert.equal(page.heardFrom[0], 'A referral from someone I know');
  assert.equal(page.heardFrom[3], "I've worked with Nathan before");
});

test('the budget brackets still start at the lowest pricing tier', async () => {
  // Launch starts at $4,000 (cms/content/pricing_tiers.json); the first bracket
  // must not invite work below it, and the brackets must name every tier floor.
  const tiers = JSON.parse(
    readFileSync(join(process.cwd(), 'cms/content/pricing_tiers.json'), 'utf8'),
  ) as { data: { price_from: number } }[];
  const floors = tiers.map((t) => t.data.price_from).sort((a, b) => a - b);
  const { d } = deps(reader({ page: null }));
  const { budgets } = await getContactPage({}, { deps: d });
  const dollars = (n: number) => `$${n.toLocaleString('en-US')}`;
  assert.equal(budgets[0], `Under ${dollars(floors[0])}`);
  for (const f of floors) {
    assert.ok(
      budgets.some((b) => b.includes(dollars(f))),
      `a budget bracket mentions ${dollars(f)}`,
    );
  }
});

// ── CMS path ─────────────────────────────────────────────────────────────────

test('CMS values win over the fallback and a published edit reads through', async () => {
  const edited: Raw = {
    ...pageRaw,
    heading: 'Tell me about it, or',
    budgets: [{ label: 'Under $5,000' }, { label: '$5,000 or more' }],
    heard_from: [{ label: 'A friend' }, { label: 'Search' }],
  };
  const { d, logs } = deps(reader({ page: edited }));
  const page = await getContactPage({}, { deps: d });
  assert.equal(logs.length, 0, 'no fallback line on the CMS path');
  assert.equal(page.heading, 'Tell me about it, or');
  assert.deepEqual(page.budgets, ['Under $5,000', '$5,000 or more']);
  assert.deepEqual(page.heardFrom, ['A friend', 'Search']);
  // Untouched lists keep the entry's own values.
  assert.equal(page.timelines.length, 5);
});

test('the same data through the CMS path equals the fallback path', async () => {
  const viaFallback = await getContactPage({}, { deps: deps(reader({ page: null })).d });
  const viaCms = await getContactPage({}, { deps: deps(reader({ page: pageRaw })).d });
  assert.deepEqual(viaCms, viaFallback);
});

test('blank rows are dropped, repeats are removed and over-long lists are cut', () => {
  const page = normalizeContactPage({
    ...pageRaw,
    budgets: [
      { label: ' A ' },
      { label: '' },
      { label: 'A' },
      { label: 'B' },
      ...['C', 'D', 'E', 'F', 'G'].map((label) => ({ label })),
    ],
  });
  assert.deepEqual(page.budgets, ['A', 'B', 'C', 'D', 'E', 'F']);
});

test('an empty closing banner override means the site default', () => {
  const page = normalizeContactPage({ ...pageRaw, cta_title: '', cta_sub: '  ' });
  assert.equal(page.ctaTitle, undefined);
  assert.equal(page.ctaSub, undefined);
});

// ── Fallback paths ───────────────────────────────────────────────────────────

test('a missing page entry serves the fallback and logs it', async () => {
  const { d, logs } = deps(reader({ page: null }));
  const page = await getContactPage({}, { deps: d });
  assert.equal(page.heading, normalizeContactPage(pageRaw).heading);
  assert.ok(logs.some((l) => /page_contact\/contact is missing or unpublished/.test(l)));
});

test('a D1 error serves the committed copy', async () => {
  const { d, logs } = deps(reader({ throws: true }));
  const page = await getContactPage({}, { deps: d });
  assert.equal(page.budgets.length, 5);
  assert.ok(logs.length >= 1);
});

test('a blank required field or a one-choice list falls back whole', async () => {
  for (const patch of [
    { heading: '   ' },
    { where_text: '' },
    { budgets: [{ label: 'Only one' }] },
    { timelines: [] },
    { heard_from: [{ label: 'Same' }, { label: 'Same' }] },
    { next_steps: 'not a list' },
  ]) {
    const { d, logs } = deps(reader({ page: { ...pageRaw, ...patch } }));
    const page = await getContactPage({}, { deps: d });
    assert.equal(page.heading, 'Start a project, or just', 'the fallback, not the half-edit');
    assert.equal(page.budgets.length, 5);
    assert.ok(logs.some((l) => /could not be read as the expected shape/.test(l)));
  }
});

// ── Title ────────────────────────────────────────────────────────────────────

test('contactTitle adds the studio name once', () => {
  assert.equal(contactTitle('Contact', 'Nixon Creative Studio'), 'Contact | Nixon Creative Studio');
  assert.equal(
    contactTitle('Contact | Nixon Creative Studio', 'Nixon Creative Studio'),
    'Contact | Nixon Creative Studio',
  );
});
