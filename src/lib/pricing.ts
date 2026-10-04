/* ============================================================================
   Pricing | Studio pricing, read from the CMS
   ============================================================================
   Foundation, edit with care.

   Both the /services page (the PriceTiers price sheet, the price list slip, the
   Care plan and the photography rate) and the homepage PricingTeaser read their
   numbers through here, so the two can
   never drift apart. The values live in the EmDash admin, under "Pricing &
   services" (the `pricing_tiers` and `pricing_addons` collections, schemas in
   cms/schema/). If the collections are empty, unpublished or unreadable, the
   same values are read from the committed copies in cms/content/pricing_tiers.json
   and pricing_addons.json (the literal values the old src/data/pricing.ts held)
   and a `[cms]` line is logged, so a broken edit never blanks the price table.
   That fallback is also what production serves until its data is loaded
   (docs/LAUNCH-RUNBOOK.md).

   Usage in an .astro file:
     const tiers = await getPricingTiers(Astro);
     const addOns = await getAddOns(Astro);

   Render rules (docs/CMS-DESIGN.md 1.5): the first 3 published tiers and the
   first 3 add-ons, in `sort_order`; the first tier with "Recommended" ticked is
   the highlighted one and the only one that shows a badge.

   If a price changes, also check the /services FAQ answer "What does it cost?"
   and the /contact budget brackets: both are prose in code until their pages
   move to the CMS (CMS-DESIGN PRs 7 and 9).
   ============================================================================ */

import { bool, getOrdered, int, text, texts, type Raw } from './cms.ts';
import type { RouteCache } from './routeCache.ts';

export interface WebTier {
  /** Tier name shown on both surfaces. */
  name: string;
  /** Numeric floor. Drives the count-up and the static price on both surfaces. */
  priceFrom: number;
  /** Trailing glyph after the price, e.g. '+'. Empty string when none. */
  priceSuffix: string;
  /** One-line "who it is for", used by the compact homepage teaser. */
  who: string;
  /** Typical-range line shown under the price. */
  range: string;
  /** Paragraph describing the tier on /services. */
  note: string;
  /** "What is included" bullets. */
  features: string[];
  /** The anchor tier: gets the accent treatment and the badge. */
  highlighted: boolean;
  /** Badge text, only ever set on the highlighted tier. */
  badge?: string;
}

export interface AddOn {
  name: string;
  /** Display price string (these are ranges and floors, not a single number). */
  price: string;
  note: string;
}

/** A required string; a blank one makes the entry unusable (the reader then falls back). */
function must(raw: Raw, key: string, where: string): string {
  const v = text(raw[key]);
  if (v === undefined) throw new Error(`${where}.${key} is empty`);
  return v;
}

/**
 * Build one tier from a raw `pricing_tiers` entry (or the fallback JSON).
 * Throws when the name, price or a required line is missing, which makes the
 * reader serve the committed fallback instead of a half-empty table. The
 * highlighted flag is returned as ticked; normalizeTiers() keeps only the first.
 */
export function normalizeTier(raw: Raw): WebTier {
  const priceFrom = int(raw.price_from);
  if (priceFrom === undefined || priceFrom < 0)
    throw new Error('pricing_tiers.price_from is not a number');
  const features = texts(raw.features);
  if (features.length === 0) throw new Error('pricing_tiers.features is empty');
  return {
    name: must(raw, 'name', 'pricing_tiers'),
    priceFrom,
    priceSuffix: text(raw.price_suffix) ?? '',
    who: must(raw, 'who', 'pricing_tiers'),
    range: must(raw, 'range', 'pricing_tiers'),
    note: must(raw, 'note', 'pricing_tiers'),
    features,
    highlighted: bool(raw.highlighted),
    badge: text(raw.badge),
  };
}

/**
 * Apply the render rules to an ordered list of tiers: only the FIRST highlighted
 * tier keeps the accent treatment (and its badge); any others render plain.
 */
export function normalizeTiers(tiers: WebTier[]): WebTier[] {
  const anchor = tiers.findIndex((t) => t.highlighted);
  return tiers.map((t, i) => (i === anchor ? t : { ...t, highlighted: false, badge: undefined }));
}

/** Build one add-on from a raw `pricing_addons` entry (or the fallback JSON). */
export function normalizeAddOn(raw: Raw): AddOn {
  return {
    name: must(raw, 'name', 'pricing_addons'),
    price: must(raw, 'price', 'pricing_addons'),
    note: must(raw, 'note', 'pricing_addons'),
  };
}

/** The layout has three columns, so three is the most that ever renders. */
export const TIER_SLOTS = 3;
export const ADDON_SLOTS = 3;

/** What the readers need from the caller: `Astro` in a page. */
export interface PricingContext {
  /** Route cache; the read adds its tag so publishing a tier purges the page. */
  cache?: RouteCache;
}

/** The web design tiers, in order, ready to render. Falls back to the committed JSON. */
export async function getPricingTiers(
  ctx: PricingContext = {},
  opts: Pick<NonNullable<Parameters<typeof getOrdered>[2]>, 'deps'> = {},
): Promise<WebTier[]> {
  const entries = await getOrdered('pricing_tiers', normalizeTier, {
    cache: ctx.cache,
    limit: TIER_SLOTS,
    ...opts,
  });
  return normalizeTiers(entries.map((e) => e.data));
}

/** The "add to any project" cards, in order. Falls back to the committed JSON. */
export async function getAddOns(
  ctx: PricingContext = {},
  opts: Pick<NonNullable<Parameters<typeof getOrdered>[2]>, 'deps'> = {},
): Promise<AddOn[]> {
  const entries = await getOrdered('pricing_addons', normalizeAddOn, {
    cache: ctx.cache,
    limit: ADDON_SLOTS,
    ...opts,
  });
  return entries.map((e) => e.data);
}
