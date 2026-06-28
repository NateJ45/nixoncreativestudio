/* ============================================================================
   Pricing | Single source of truth for studio pricing
   ============================================================================
   Both the /services page (full tier cards + the "add to any project" strip)
   and the homepage PricingTeaser read their numbers from here, so the two can
   never drift apart. Change a price once, in this file, and every surface
   updates on the next build. Same single-source pattern as src/data/site.ts.

   The numbers reflect the 2026 market for an agency-grade solo studio:
   Launch from $4,000, Signature from $8,000 (where most projects land),
   Flagship from $18,000, plus the add-ons. If a number changes here, also
   update the matching /services FAQ answer (the FAQ is prose, so it can't
   import these values) and the strategy doc.
   ============================================================================ */

export interface WebTier {
  /** Tier name shown on both surfaces. */
  name: string;
  /** Numeric floor. Drives the services countup and both price displays. */
  priceFrom: number;
  /** Trailing glyph after the price, e.g. '+'. */
  priceSuffix: string;
  /** One-line "who it's for", used by the compact homepage teaser. */
  who: string;
  /** Typical-range line shown under the price on /services. */
  range: string;
  /** Paragraph describing the tier on /services. */
  note: string;
  /** "What's included" bullets on /services. */
  features: string[];
  /** The anchor tier (Signature): gets the accent border + badge. */
  highlighted: boolean;
  /** Badge text shown on the highlighted tier. */
  badge?: string;
}

// The three web design tiers. These map to the real range of work in the
// portfolio: a focused platform/lean build (Launch), a content-rich custom
// site (Signature, where most projects land), and a fully bespoke custom-coded
// build (Flagship). Order is intentional: ascending, with the anchor second.
export const webTiers: WebTier[] = [
  {
    name: 'Launch',
    priceFrom: 4000,
    priceSuffix: '+',
    who: 'Smaller organizations',
    range: 'Most land between $4,000 and $7,000',
    note: 'A focused site for a smaller organization, built on the platform that fits your team (often Squarespace) or custom-coded when that is the better call. Lean, but built to be run by whoever inherits it.',
    features: [
      'Strategy session and one-page brief',
      'A custom design, never a stock template',
      'Accessible and fast, set up and handed off',
    ],
    highlighted: false,
  },
  {
    name: 'Signature',
    priceFrom: 8000,
    priceSuffix: '+',
    who: 'Most projects',
    range: 'Most land between $8,000 and $16,000',
    note: 'The right fit for most projects: a content-rich custom site your team maintains itself, with the depth a serious church, school, or growing business actually needs.',
    features: [
      'Everything in Launch, built fully custom',
      'A content system your staff can run, no developer needed',
      'Deeper structure, integrations, and search-engine work',
    ],
    highlighted: true,
    badge: 'Where most projects land',
  },
  {
    name: 'Flagship',
    priceFrom: 18000,
    priceSuffix: '+',
    who: 'Bespoke builds',
    range: 'Typically $18,000 and up',
    note: 'A bespoke, custom-coded build for organizations that need real custom functionality: a headless content system, interactive tools, or a large, deep site. The kind of work an agency charges far more for.',
    features: [
      'Fully bespoke design and front-end build',
      'Custom features, tools, and integrations',
      'The fastest, most capable foundation I build',
    ],
    highlighted: false,
  },
];

export interface AddOn {
  name: string;
  /** Display price string (these are ranges/floors, not a single number). */
  price: string;
  note: string;
}

// Add to any project. Photography, standalone brand/strategy, and the optional
// care plan, each with its own honest floor. Used by the /services add-on strip.
export const addOns: AddOn[] = [
  {
    name: 'Photography',
    price: 'from $900',
    note: 'Headshots, brand, and environmental photos shot for your site by the person who designed it. From about $1,200 a day when folded into a build, or booked on its own across the Cincinnati region.',
  },
  {
    name: 'Brand & strategy',
    price: '$1,500 to $5,000',
    note: 'Standalone strategy or brand-identity work for when you need it on its own. Strategy is already built into every website project.',
  },
  {
    name: 'Care plan',
    price: 'from $75/mo',
    note: 'Optional. Updates, backups, security, and a monthly bucket of edits on the higher tiers. Skip it and the site is still yours to leave alone for years, with no lock-in.',
  },
];
