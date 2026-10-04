import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CmsDeps, CmsReader, Raw } from './cms.ts';
import { fallbackFromFiles } from './cmsFallback.ts';
import {
  buildServiceSchemas,
  getServiceOfferings,
  getServicesPage,
  normalizeOffering,
  normalizeServicesPage,
  servicesTitle,
} from './servicesPage.ts';

// ── Fixtures ─────────────────────────────────────────────────────────────────
// The committed fallback, read the way the Worker bundles it.

const readJson = (name: string): unknown =>
  JSON.parse(readFileSync(join(process.cwd(), 'cms/content', `${name}.json`), 'utf8'));
const fallback = fallbackFromFiles({
  page_services: readJson('page_services'),
  service_offerings: readJson('service_offerings'),
});
const pageRaw = (fallback.entry('page_services', 'services') ?? {}) as Raw;
const offeringEntries = fallback.list('service_offerings') ?? [];

// The origin the live page's JSON-LD carries (SITE_URL in src/data/site.ts), no www.
const SITE_URL = 'https://nixoncreativestudio.com';

/** A reader that serves the given page entry and offerings, or fails the way D1 would. */
function reader(opts: {
  page?: Raw | null;
  offerings?: { id: string; data: Raw }[];
  listError?: Error;
  throws?: boolean;
}): CmsReader {
  return {
    async getEntry() {
      if (opts.throws) throw new Error('D1 is down');
      return { data: opts.page ?? null };
    },
    async getList() {
      if (opts.throws) throw new Error('D1 is down');
      if (opts.listError) return { entries: [], error: opts.listError };
      return { entries: opts.offerings ?? [] };
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

const asRows = (list: { slug: string; data: Raw }[]) =>
  list.map((e) => ({ id: e.slug, data: e.data }));

// ── JSON-LD: byte-equal to what /services emitted before this PR ─────────────
// The golden file is the Service and FAQPage part of the structured data captured
// from the live page on `main` (the ncs-ci Worker) before the move. It is the
// acceptance gate for CMS-DESIGN PR 7: the structured data Google reads must not
// change when the words move into the CMS.
//
// Regenerated DELIBERATELY on 2026-10-04 (redesign 2026 copy pass, D-copy-positioning.md): the
// Strategy description now states its standalone price ($1,500, matching its minPrice), the cost
// FAQ no longer claims where most projects land, and the brand answer is first person.

const golden = JSON.parse(
  readFileSync(join(process.cwd(), 'src/lib/servicesPage.jsonld.golden.json'), 'utf8'),
);

test('the fallback builds JSON-LD byte-equal to the page before the move', async () => {
  const { d } = deps(reader({}));
  const [page, offerings] = await Promise.all([
    getServicesPage({}, { deps: d }),
    getServiceOfferings({}, { deps: d }),
  ]);
  // 4000 is the first Pricing tier's floor, which Web design's offer follows.
  const built = buildServiceSchemas(offerings, page.faq.items, SITE_URL, 4000);
  assert.equal(JSON.stringify(built), JSON.stringify(golden));
});

test('the CMS path builds the same JSON-LD from the same values', async () => {
  const { d, logs } = deps(reader({ page: pageRaw, offerings: asRows(offeringEntries) }));
  const [page, offerings] = await Promise.all([
    getServicesPage({}, { deps: d }),
    getServiceOfferings({}, { deps: d }),
  ]);
  assert.equal(logs.length, 0, 'no fallback line on the CMS path');
  const built = buildServiceSchemas(offerings, page.faq.items, SITE_URL, 4000);
  assert.equal(JSON.stringify(built), JSON.stringify(golden));
});

test('FAQPage and Service are built from the data: an edit changes what Google reads', async () => {
  const edited = {
    ...pageRaw,
    faq: [
      { question: 'One?', answer: 'Yes.' },
      { question: 'Two?', answer: 'No.' },
      { question: 'Three?', answer: 'Maybe.' },
    ],
  };
  const offeringsRaw = offeringEntries.map((e) =>
    e.slug === 'strategy'
      ? { id: e.slug, data: { ...e.data, price_from: 1800 } }
      : { id: e.slug, data: e.data },
  );
  const { d } = deps(reader({ page: edited, offerings: offeringsRaw }));
  const [page, offerings] = await Promise.all([
    getServicesPage({}, { deps: d }),
    getServiceOfferings({}, { deps: d }),
  ]);
  const schemas = buildServiceSchemas(offerings, page.faq.items, SITE_URL, 4200) as Record<
    string,
    any
  >[];
  const faq = schemas.find((s) => s['@type'] === 'FAQPage');
  assert.deepEqual(
    faq?.mainEntity.map((q: { name: string }) => q.name),
    ['One?', 'Two?', 'Three?'],
  );
  assert.equal(faq?.mainEntity[0].acceptedAnswer.text, 'Yes.');
  assert.equal(schemas[0].offers.priceSpecification.minPrice, 1800, 'Strategy floor from the data');
  assert.equal(schemas[1].offers.priceSpecification.minPrice, 4200, 'Web design follows the tier');
  assert.equal(
    schemas[2].offers.priceSpecification.minPrice,
    900,
    'Photography floor from the data',
  );
});

test('an offering with no price and no tier floor publishes no Offer', () => {
  const offerings = offeringEntries.map((e) => normalizeOffering(e.data, e.slug));
  const [, web] = buildServiceSchemas(offerings, [{ question: 'q', answer: 'a' }], SITE_URL);
  assert.equal('offers' in web, false);
});

test('area served follows the select: regional is the Cincinnati region only', () => {
  const regional = normalizeOffering({ ...offeringEntries[2].data, area_served: 'regional' });
  const anywhere = normalizeOffering({ ...offeringEntries[2].data, area_served: 'anywhere' });
  const [r, a] = buildServiceSchemas([regional, anywhere], [], SITE_URL);
  assert.equal(r.areaServed, 'Greater Cincinnati region');
  assert.deepEqual(a.areaServed, ['Greater Cincinnati region', 'United States']);
});

// ── The fallback IS today's hardcoded /services copy ─────────────────────────
// These literals were copied from services.astro on main before this PR. If one
// changes, the production page changes with it, so it should be a deliberate edit
// of cms/content/page_services.json.

test('the committed fallback reproduces the words /services used to hold', async () => {
  const { d } = deps(reader({}));
  const page = await getServicesPage({}, { deps: d });
  assert.equal(page.seoTitle, 'Services');
  assert.equal(
    page.seoDescription,
    'Strategy, web design, and brand work for clients anywhere, plus photography across the greater Cincinnati region. Based in Cincinnati.',
  );
  assert.equal(
    page.heading,
    'Strategy, web design and photography, built so your team can run the site for years.',
  );
  assert.equal(page.pricing.heading, 'What a website costs');
  assert.equal(page.addonsHeading, 'Add to any project');
  assert.equal(page.why.heading, 'Why it costs what it costs');
  assert.deepEqual(
    page.why.items.map((i) => i.title),
    [
      'One person, no handoffs',
      'Built to be handed off',
      'Accessible by default',
      'What a cheaper quote leaves out',
    ],
  );
  assert.equal(page.faq.heading, 'Common questions');
  assert.equal(page.faq.items.length, 6);
  assert.equal(page.faq.items[0].question, 'What does it cost?');
  assert.match(page.faq.items[0].answer, /^Websites start at \$4,000 for a focused Launch site\./);
  assert.equal(page.ctaTitle, 'Ready to scope a project?');
});

test('the committed fallback holds the three offerings in order', async () => {
  const { d } = deps(reader({}));
  const offerings = await getServiceOfferings({}, { deps: d });
  assert.deepEqual(
    offerings.map((o) => [o.slug, o.title, o.priceFrom, o.placeholderIcon, o.areaServed]),
    [
      ['strategy', 'Strategy', 1500, 'strategy', 'anywhere'],
      ['web-design', 'Web design', undefined, 'none', 'anywhere'],
      ['photography', 'Photography', 900, 'photography', 'regional'],
    ],
  );
  assert.equal(offerings[0].points.length, 4);
  assert.equal(offerings[1].points.length, 5);
  assert.equal(
    offerings[1].imageAlt,
    'The Foundation for Reformed Theology library page: Bibliographies, 48 entries, and John Calvin Studies, 95 entries, with their latest additions.',
  );
  // The picture description is capped at 160 characters in the admin.
  assert.ok((offerings[1].imageAlt ?? '').length <= 160);
  assert.equal(offerings[0].imageAlt, undefined);
});

// ── Fallback paths ───────────────────────────────────────────────────────────

test('a missing page entry serves the fallback and logs it', async () => {
  const { d, logs } = deps(reader({ page: null }));
  const page = await getServicesPage({}, { deps: d });
  assert.equal(page.heading, normalizeServicesPage(pageRaw).heading);
  assert.ok(logs.some((l) => /page_services\/services is missing or unpublished/.test(l)));
});

test('a D1 error on either read serves the committed copy', async () => {
  const { d, logs } = deps(reader({ throws: true }));
  const [page, offerings] = await Promise.all([
    getServicesPage({}, { deps: d }),
    getServiceOfferings({}, { deps: d }),
  ]);
  assert.equal(page.pricing.heading, 'What a website costs');
  assert.equal(offerings.length, 3);
  assert.ok(logs.length >= 2);

  const { d: d2 } = deps(reader({ listError: new Error('read failed') }));
  assert.equal((await getServiceOfferings({}, { deps: d2 })).length, 3);
});

test('an empty offerings collection serves the committed list whole', async () => {
  const { d, logs } = deps(reader({ offerings: [] }));
  const offerings = await getServiceOfferings({}, { deps: d });
  assert.equal(offerings.length, 3);
  assert.ok(logs.some((l) => /service_offerings has no published entries/.test(l)));
});

test('a blank required field, a short reasons list or a thin FAQ falls back', async () => {
  for (const patch of [
    { heading: '   ' },
    { why_items: (pageRaw.why_items as unknown[]).slice(0, 3) },
    { faq: (pageRaw.faq as unknown[]).slice(0, 2) },
    { faq: [{ question: 'Only one?', answer: '' }, ...(pageRaw.faq as unknown[]).slice(0, 2)] },
  ]) {
    const { d, logs } = deps(reader({ page: { ...pageRaw, ...patch } }));
    const page = await getServicesPage({}, { deps: d });
    assert.equal(page.why.items.length, 4);
    assert.equal(page.faq.items.length, 6, 'the fallback FAQ, not the half-edited one');
    assert.ok(logs.some((l) => /could not be read as the expected shape/.test(l)));
  }
});

test('an offering with no included lines or a blank title falls back to the whole list', async () => {
  const broken = offeringEntries.map((e) =>
    e.slug === 'photography'
      ? { id: e.slug, data: { ...e.data, points: [] } }
      : { id: e.slug, data: e.data },
  );
  const { d, logs } = deps(reader({ offerings: broken }));
  const offerings = await getServiceOfferings({}, { deps: d });
  assert.equal(offerings[2].points.length, 4);
  assert.ok(logs.some((l) => /could not be read as the expected shape/.test(l)));
});

// ── CMS path ─────────────────────────────────────────────────────────────────

test('CMS values win over the fallback and a published edit reads through', async () => {
  const edited = {
    ...pageRaw,
    heading: 'Websites, photos, and a plan.',
    faq_heading: 'Questions',
  };
  const offeringsRaw = offeringEntries.map((e) => ({ id: e.slug, data: { ...e.data } })).reverse();
  offeringsRaw[0].data.title = 'Pictures';
  const { d, logs } = deps(reader({ page: edited, offerings: offeringsRaw }));
  const page = await getServicesPage({}, { deps: d });
  const offerings = await getServiceOfferings({}, { deps: d });
  assert.equal(logs.length, 0);
  assert.equal(page.heading, 'Websites, photos, and a plan.');
  assert.equal(page.faq.heading, 'Questions');
  // Ordered by sort_order, not by the order the reader returned them in.
  assert.deepEqual(
    offerings.map((o) => o.slug),
    ['strategy', 'web-design', 'photography'],
  );
  assert.equal(offerings[2].title, 'Pictures');
});

test('lists longer than the layout are cut: three offerings, ten questions, four reasons', async () => {
  const faq = Array.from({ length: 14 }, (_, i) => ({ question: `Q${i}`, answer: `A${i}` }));
  const why = Array.from({ length: 6 }, (_, i) => ({ title: `T${i}`, body: `B${i}` }));
  const page = normalizeServicesPage({ ...pageRaw, faq, why_items: why });
  assert.equal(page.faq.items.length, 10);
  assert.equal(page.why.items.length, 4);
  const extra = [
    ...asRows(offeringEntries),
    { id: 'fourth', data: { ...offeringEntries[0].data, sort_order: 4 } },
  ];
  const { d } = deps(reader({ offerings: extra }));
  assert.equal((await getServiceOfferings({}, { deps: d })).length, 3);
});

test('select values outside the options degrade safely, a zero or blank price means none', () => {
  const o = normalizeOffering({
    ...offeringEntries[0].data,
    placeholder_icon: 'sparkles',
    area_served: 'mars',
    price_from: 0,
  });
  assert.equal(o.placeholderIcon, 'none');
  assert.equal(o.areaServed, 'anywhere');
  assert.equal(o.priceFrom, undefined);
  assert.equal(
    normalizeOffering({ ...offeringEntries[0].data, price_from: '2500' }).priceFrom,
    2500,
  );
});

test('an empty closing banner override means the site default', () => {
  const page = normalizeServicesPage({ ...pageRaw, cta_title: '', cta_sub: '  ' });
  assert.equal(page.ctaTitle, undefined);
  assert.equal(page.ctaSub, undefined);
});

// ── Title ────────────────────────────────────────────────────────────────────

test('servicesTitle adds the studio name once', () => {
  assert.equal(
    servicesTitle('Services', 'Nixon Creative Studio'),
    'Services | Nixon Creative Studio',
  );
  assert.equal(
    servicesTitle('Services | Nixon Creative Studio', 'Nixon Creative Studio'),
    'Services | Nixon Creative Studio',
  );
});
