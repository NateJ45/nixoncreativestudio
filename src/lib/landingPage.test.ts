import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CmsDeps, Raw } from './cms.ts';
import { fallbackFromFiles } from './cmsFallback.ts';
import type { PTNode } from './portableText.ts';
import {
  LANDING_LINKS,
  LANDING_SEGMENTS,
  LANDING_SLUGS,
  MIN_FAQ,
  buildLandingSchemas,
  contactHref,
  fillPrices,
  getLandingPage,
  isFaqSection,
  normalizeLandingPage,
} from './landingPage.ts';
import { buildBreadcrumbSchema, buildFaqPageSchema } from './structuredData.ts';

// ── Fixtures ─────────────────────────────────────────────────────────────────
const read = (name: string) =>
  JSON.parse(readFileSync(join(process.cwd(), 'cms/content', `${name}.json`), 'utf8'));
const fallback = fallbackFromFiles({ pages: read('pages') });
const raw = (slug: string) => (fallback.entry('pages', slug) ?? {}) as Raw;
const tiers = (read('pricing_tiers') as { data: { name: string; price_from: number } }[]).map(
  (t) => ({ name: t.data.name, priceFrom: t.data.price_from }),
);

const block = (text: string, extra: Partial<PTNode> = {}): PTNode => ({
  _type: 'block',
  _key: text,
  style: 'normal',
  markDefs: [],
  children: [{ _type: 'span', text, marks: [] }],
  ...extra,
});
const h2 = (t: string) => block(t, { style: 'h2' });
const h3 = (t: string) => block(t, { style: 'h3' });
const li = (t: string) => block(t, { listItem: 'bullet', level: 1 });

/** A minimal entry that makes a whole page. */
const minimal = (content: PTNode[]): Raw => ({
  title: 'T',
  heading: 'A heading here',
  summary: 'A summary that is long enough to be a description.',
  intro: [block('Intro.')],
  content,
});
const faq3 = [
  h2('Questions'),
  h3('Q1?'),
  block('A1.'),
  h3('Q2?'),
  block('A2.'),
  h3('Q3?'),
  block('A3.'),
];

// ── The committed fallback makes four whole pages ─────────────────────────────

for (const slug of LANDING_SLUGS) {
  test(`${slug}: the committed fallback makes a whole page`, () => {
    const page = normalizeLandingPage(slug, raw(slug));
    assert.ok(page.intro.length >= 1, 'intro');
    assert.ok(page.sections.length >= 1, 'a prose section');
    assert.ok(page.faq.items.length >= MIN_FAQ, 'questions');
    for (const item of page.faq.items) {
      assert.ok(item.question.endsWith('?'), `"${item.question}" is a question`);
      assert.ok(item.answerText.length > 20, `answer to "${item.question}"`);
    }
  });

  test(`${slug}: the words follow the house style (no dashes, no banned words, no "most projects land")`, () => {
    const all = JSON.stringify(raw(slug));
    assert.doesNotMatch(all, /[–—]/, 'en or em dash');
    assert.doesNotMatch(
      all,
      /\b(delve|leverage|robust|seamless|crafted|bespoke|meticulous|tapestry|realm|pivotal|crucial)\b/i,
    );
    assert.doesNotMatch(all, /most projects land/i);
    // Field limits from cms/schema/pages.mjs (enforced by the server).
    const r = raw(slug) as { title: string; heading: string; summary: string };
    assert.ok(r.title.length <= 60, 'title');
    assert.ok(r.heading.length <= 80, 'heading');
    assert.ok(r.summary.length >= 50 && r.summary.length <= 160, 'summary');
  });
}

test('the landing pages did not change the three prose pages in the same file', () => {
  const slugs = (read('pages') as { slug: string }[]).map((e) => e.slug);
  assert.deepEqual(slugs.slice(0, 3), ['privacy', 'accessibility', 'colophon']);
});

test('the church page never presents an unlaunched build as live', () => {
  const all = JSON.stringify(raw('church-websites'));
  assert.doesNotMatch(all, /Second Presbyterian/i);
  assert.doesNotMatch(all, /doubled/i, 'the Crestview figure has no source');
});

test('the school page claims no finished school work', () => {
  const page = normalizeLandingPage('school-websites', raw('school-websites'));
  const all = JSON.stringify(page);
  assert.match(all, /first school sites now/);
  assert.doesNotMatch(all, /Presbyterian Academy/, 'named only in code, with its status label');
});

// ── Normalising ───────────────────────────────────────────────────────────────

test('the FAQ is the section of Heading 3 questions; the rest are bands in order', () => {
  const page = normalizeLandingPage(
    'x',
    minimal([h2('First'), block('One.'), li('A'), li('B'), ...faq3, h2('Last'), block('Two.')]),
  );
  assert.deepEqual(
    page.sections.map((s) => s.heading),
    ['First', 'Last'],
  );
  assert.equal(page.sections[0].blocks[1].kind, 'list');
  assert.equal(page.faq.heading, 'Questions');
  assert.deepEqual(
    page.faq.items.map((i) => [i.question, i.answerText]),
    [
      ['Q1?', 'A1.'],
      ['Q2?', 'A2.'],
      ['Q3?', 'A3.'],
    ],
  );
});

test('an answer of two paragraphs keeps both, and the JSON-LD text joins them', () => {
  const page = normalizeLandingPage(
    'x',
    minimal([h2('S'), block('x.'), ...faq3, h3('Q4?'), block('Part one.'), block('Part two.')]),
  );
  const q4 = page.faq.items[3];
  assert.equal(q4.answerHtml.length, 2);
  assert.equal(q4.answerText, 'Part one. Part two.');
});

test('a section with a list under a Heading 3 is prose, not the FAQ', () => {
  assert.equal(isFaqSection([h3('Q?'), li('not an answer')]), false);
  assert.equal(isFaqSection([h3('Q?'), h3('Q2?'), block('A')]), false);
  assert.equal(isFaqSection([block('Lead.'), h3('Q?'), block('A')]), false);
  assert.equal(isFaqSection([h3('Q?'), block('A')]), true);
});

test('an entry that cannot make a whole page throws (the reader then falls back)', () => {
  assert.throws(() => normalizeLandingPage('x', minimal([h2('S'), block('x.')])), /questions/);
  assert.throws(
    () => normalizeLandingPage('x', minimal([...faq3.slice(0, 5), h2('S'), block('x.')])),
    /at least 3/,
  );
  assert.throws(() => normalizeLandingPage('x', minimal(faq3)), /no prose section/);
  assert.throws(
    () => normalizeLandingPage('x', { ...minimal([h2('S'), block('x.'), ...faq3]), intro: [] }),
    /intro/,
  );
  assert.throws(
    () => normalizeLandingPage('x', { ...minimal([h2('S'), block('x.'), ...faq3]), heading: '  ' }),
    /heading/,
  );
});

test('a missing production entry serves the committed fallback and says so', async () => {
  const logs: string[] = [];
  const deps: CmsDeps = {
    reader: {
      async getEntry() {
        return { data: null };
      },
      async getList() {
        return { entries: [] };
      },
      async getMenu() {
        return { items: null };
      },
    },
    fallback,
    log: (m) => logs.push(m),
  };
  const page = await getLandingPage('church-websites', {}, { deps });
  assert.equal(page.heading, (raw('church-websites') as { heading: string }).heading);
  assert.match(logs[0], /pages\/church-websites is missing/);
});

// ── Prices and links ──────────────────────────────────────────────────────────

test("fillPrices puts each tier's published floor in, and drops a sentence whose tier is gone", () => {
  assert.equal(
    fillPrices('Launch, {Launch}, fits. Flagship, {Flagship}, too.', tiers),
    'Launch, from $4,000, fits. Flagship, from $12,000, too.',
  );
  assert.equal(
    fillPrices('Launch, {Launch}, fits. Gone, {Gone}, here.', tiers),
    'Launch, from $4,000, fits.',
  );
  for (const slug of LANDING_SLUGS) {
    assert.doesNotMatch(fillPrices(LANDING_SEGMENTS[slug].tierNote, tiers), /\{/, slug);
  }
});

test('every call to action goes to the contact form with its trailing slash and the right preset', () => {
  assert.equal(contactHref('church'), '/contact/?org_type=church');
  assert.equal(contactHref(), '/contact/');
  // The presets are values the contact form offers (src/pages/contact.astro orgTypes).
  const contact = readFileSync(join(process.cwd(), 'src/pages/contact.astro'), 'utf8');
  for (const slug of LANDING_SLUGS) {
    const s = LANDING_SEGMENTS[slug];
    assert.ok(s.path.endsWith('/') && s.path === `/${slug}/`, `${slug} path`);
    if (s.sector) assert.match(contact, new RegExp(`value: '${s.sector}'`), `${slug} preset`);
  }
  assert.deepEqual(
    LANDING_LINKS.map((l) => l.href),
    LANDING_SLUGS.map((s) => `/${s}/`),
  );
});

// ── JSON-LD ───────────────────────────────────────────────────────────────────

test('the JSON-LD is a Service, the visible FAQ and a two-step breadcrumb', () => {
  const page = normalizeLandingPage('church-websites', raw('church-websites'));
  const [service, faq, crumbs] = buildLandingSchemas({
    segment: LANDING_SEGMENTS['church-websites'],
    page,
    siteUrl: 'https://nixoncreativestudio.com',
    minPrice: 4000,
  });
  assert.equal(service['@type'], 'Service');
  assert.equal(service.name, 'Church website design');
  assert.deepEqual(service.provider, { '@id': 'https://nixoncreativestudio.com#organization' });
  assert.equal(service.url, 'https://nixoncreativestudio.com/church-websites/');
  assert.deepEqual(service.audience, { '@type': 'Audience', audienceType: 'Churches' });
  assert.deepEqual(service.areaServed, ['Greater Cincinnati region', 'United States']);
  assert.equal(
    (service.offers as { priceSpecification: { minPrice: number } }).priceSpecification.minPrice,
    4000,
  );
  assert.deepEqual(
    faq,
    buildFaqPageSchema(page.faq.items.map((i) => ({ question: i.question, answer: i.answerText }))),
  );
  assert.equal((faq.mainEntity as unknown[]).length, page.faq.items.length);
  assert.deepEqual(
    crumbs,
    buildBreadcrumbSchema([
      { name: 'Home', url: 'https://nixoncreativestudio.com/' },
      { name: 'Church websites', url: 'https://nixoncreativestudio.com/church-websites/' },
    ]),
  );
  // It survives the trip through JSON (what the page prints).
  assert.deepEqual(JSON.parse(JSON.stringify(service)), service);
});

test('photography is regional, has no audience, and leaves the price out when there is none', () => {
  const page = normalizeLandingPage(
    'cincinnati-event-photography',
    raw('cincinnati-event-photography'),
  );
  const [service] = buildLandingSchemas({
    segment: LANDING_SEGMENTS['cincinnati-event-photography'],
    page,
    siteUrl: 'https://nixoncreativestudio.com',
  });
  assert.equal(service.areaServed, 'Greater Cincinnati region');
  assert.equal('audience' in service, false);
  assert.equal('offers' in service, false);
});

test('the breadcrumb numbers its steps from 1', () => {
  const b = buildBreadcrumbSchema([
    { name: 'Home', url: 'https://x/' },
    { name: 'Page', url: 'https://x/p/' },
  ]);
  assert.deepEqual(
    (b.itemListElement as { position: number }[]).map((i) => i.position),
    [1, 2],
  );
});
