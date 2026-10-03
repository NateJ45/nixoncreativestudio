import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CmsDeps, CmsReader, Raw } from './cms.ts';
import { fallbackFromFiles } from './cmsFallback.ts';
import {
  getAddOns,
  getPricingTiers,
  normalizeAddOn,
  normalizeTier,
  normalizeTiers,
} from './pricing.ts';

// ── Fixtures ─────────────────────────────────────────────────────────────────
// The committed fallback, read the way the Worker bundles it.

const readJson = (name: string): unknown =>
  JSON.parse(readFileSync(join(process.cwd(), 'cms/content', `${name}.json`), 'utf8'));
const fallback = fallbackFromFiles({
  pricing_tiers: readJson('pricing_tiers'),
  pricing_addons: readJson('pricing_addons'),
});
const fallbackTiers = fallback.list('pricing_tiers') ?? [];
const fallbackAddOns = fallback.list('pricing_addons') ?? [];

/** A reader that serves the given list for one collection, or fails the way D1 would. */
function reader(opts: {
  tiers?: { id: string; data: Raw }[];
  addons?: { id: string; data: Raw }[];
  listError?: Error;
  throws?: boolean;
}): CmsReader {
  return {
    async getEntry() {
      return { data: null };
    },
    async getList(collection) {
      if (opts.throws) throw new Error('D1 is down');
      if (opts.listError) return { entries: [], error: opts.listError };
      return { entries: (collection === 'pricing_tiers' ? opts.tiers : opts.addons) ?? [] };
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

// ── The fallback IS today's src/data/pricing.ts ──────────────────────────────

test('the committed fallback reproduces the tiers src/data/pricing.ts used to hold', async () => {
  const { d } = deps(reader({}));
  const tiers = await getPricingTiers({}, { deps: d });
  assert.deepEqual(
    tiers.map((t) => [t.name, t.priceFrom, t.priceSuffix, t.highlighted]),
    [
      ['Launch', 4000, '+', false],
      ['Signature', 7000, '+', true],
      ['Flagship', 12000, '+', false],
    ],
  );
  assert.equal(tiers[0].who, 'Smaller organizations');
  assert.equal(tiers[0].range, 'Most land between $4,000 and $6,500');
  assert.equal(tiers[1].badge, 'Where most projects land');
  assert.equal(tiers[2].range, 'Typically $12,000 and up');
  assert.deepEqual(tiers[1].features, [
    'A larger site with deeper content sections',
    'Several content types your team manages itself',
    'Integrations and search-engine work built in',
  ]);
  // Only the anchor tier carries a badge.
  assert.equal(tiers[0].badge, undefined);
  assert.equal(tiers[2].badge, undefined);
});

test('the committed fallback reproduces the add-ons, with the care plan at $100 a month', async () => {
  const { d } = deps(reader({}));
  const addOns = await getAddOns({}, { deps: d });
  assert.deepEqual(
    addOns.map((a) => [a.name, a.price]),
    [
      ['Photography', 'from $900'],
      ['Brand & strategy', '$500 to $2,000'],
      ['Care plan', 'from $100/mo'],
    ],
  );
  assert.match(addOns[0].note, /half-day starts at \$900/);
});

// ── Fallback path ────────────────────────────────────────────────────────────

test('empty collections (production before its data is loaded) serve the fallback and log it', async () => {
  const { d, logs } = deps(reader({}));
  const tiers = await getPricingTiers({}, { deps: d });
  const addOns = await getAddOns({}, { deps: d });
  assert.equal(tiers.length, 3);
  assert.equal(addOns.length, 3);
  assert.ok(logs.some((l) => /pricing_tiers has no published entries/.test(l)));
  assert.ok(logs.some((l) => /pricing_addons has no published entries/.test(l)));
});

test('a D1 error or throw serves the fallback', async () => {
  for (const r of [reader({ listError: new Error('no such table') }), reader({ throws: true })]) {
    const { d, logs } = deps(r);
    const tiers = await getPricingTiers({}, { deps: d });
    assert.deepEqual(
      tiers.map((t) => t.priceFrom),
      [4000, 7000, 12000],
    );
    assert.ok(logs.length > 0);
  }
});

test('a half-filled tier (blank name) makes the whole table fall back, not render blank', async () => {
  const broken = asRows(fallbackTiers).map((r, i) =>
    i === 1 ? { ...r, data: { ...r.data, name: '  ' } } : r,
  );
  const { d, logs } = deps(reader({ tiers: broken }));
  const tiers = await getPricingTiers({}, { deps: d });
  assert.equal(tiers[1].name, 'Signature');
  assert.ok(logs.some((l) => /could not be read as the expected shape/.test(l)));
});

// ── CMS path ─────────────────────────────────────────────────────────────────

test('CMS values win over the fallback, and 0/1 booleans and numeric strings normalise', async () => {
  const cms = [
    {
      id: 'launch',
      data: {
        name: 'Starter',
        price_from: '4500', // D1 can hand back a numeric string
        price_suffix: null,
        who: 'Tiny teams',
        range: 'Most land between $4,500 and $6,500',
        note: 'A note.',
        features: [{ text: 'One' }, { text: 'Two' }, { text: '  ' }],
        highlighted: 0,
        badge: null,
        sort_order: 1,
      },
    },
  ];
  const { d, logs } = deps(reader({ tiers: cms }));
  const tiers = await getPricingTiers({}, { deps: d });
  assert.equal(logs.length, 0);
  assert.equal(tiers.length, 1);
  assert.equal(tiers[0].name, 'Starter');
  assert.equal(tiers[0].priceFrom, 4500);
  assert.equal(tiers[0].priceSuffix, '');
  assert.equal(tiers[0].highlighted, false);
  assert.equal(tiers[0].badge, undefined);
  assert.deepEqual(tiers[0].features, ['One', 'Two']); // blank row dropped
});

test('tiers sort on sort_order, not the order D1 returns them, and only 3 render', async () => {
  const mk = (name: string, order: number) => ({
    id: name.toLowerCase(),
    data: { ...fallbackTiers[0].data, name, sort_order: order },
  });
  const { d } = deps(reader({ tiers: [mk('D', 4), mk('B', 2), mk('A', 1), mk('C', 3)] }));
  const tiers = await getPricingTiers({}, { deps: d });
  assert.deepEqual(
    tiers.map((t) => t.name),
    ['A', 'B', 'C'],
  );
});

test('only the first highlighted tier keeps the accent treatment and its badge', () => {
  const base = normalizeTier(fallbackTiers[0].data);
  const out = normalizeTiers([
    { ...base, name: 'A' },
    { ...base, name: 'B', highlighted: true, badge: 'Pick me' },
    { ...base, name: 'C', highlighted: true, badge: 'Me too' },
  ]);
  assert.deepEqual(
    out.map((t) => [t.name, t.highlighted, t.badge]),
    [
      ['A', false, undefined],
      ['B', true, 'Pick me'],
      ['C', false, undefined],
    ],
  );
});

// ── Count-up: the static number IS the CMS number ────────────────────────────

test('every tier price is a whole number the page can print as its static text', async () => {
  const { d } = deps(reader({ tiers: asRows(fallbackTiers) }));
  const tiers = await getPricingTiers({}, { deps: d });
  for (const t of tiers) {
    assert.ok(Number.isInteger(t.priceFrom) && t.priceFrom > 0);
    // The templates print priceFrom.toLocaleString() inside the count-up span and
    // give priceFrom to data-countup-to, so the no-JS text and the animated target
    // are the same value by construction.
    assert.equal(Number(t.priceFrom.toLocaleString('en-US').replace(/,/g, '')), t.priceFrom);
  }
});

test('normalizeAddOn requires a name, a price and a note', () => {
  assert.throws(() => normalizeAddOn({ name: 'x', price: '', note: 'y' }), /price is empty/);
  assert.throws(() => normalizeTier({ ...fallbackAddOns[0].data }), /price_from/);
});
