/* ============================================================================
   Pricing | Single source of truth for studio pricing
   ============================================================================
   Both the /services page (full tier cards + the "add to any project" strip)
   and the homepage PricingTeaser read their numbers from here, so the two can
   never drift apart. Change a price once, in this file, and every surface
   updates on the next build. Same single-source pattern as src/data/site.ts.

   The numbers reflect the 2026 market for an agency-grade solo studio:
   Launch from $4,000, Signature from $7,000 (where most projects land),
   Flagship from $12,000, plus the add-ons. If a number changes here, also
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

// The three web design tiers. Every build is custom-designed and ships with a
// content system the client can run themselves after launch, so the tiers do
// NOT differ in whether the work is custom or whether there is a CMS (both are
// baseline). They differ in SCOPE and how much bespoke functionality the site
// needs: Launch is a focused site; Signature (the anchor, where most projects
// land) is a larger, content-rich site; Flagship adds real custom functionality
// (tools, advanced integrations, headless). Order is ascending, anchor second.
export const webTiers: WebTier[] = [
  {
    name: 'Launch',
    priceFrom: 4000,
    priceSuffix: '+',
    who: 'Smaller organizations',
    range: 'Most land between $4,000 and $6,500',
    note: 'A focused custom site for a smaller organization: the essential pages done well, with content you can keep current yourself. The right fit when you want a clear, strong presence without a lot of moving parts.',
    features: [
      'A focused set of core pages, designed around your goals',
      'Content you can keep current yourself',
      'Accessible and fast, set up and handed off',
    ],
    highlighted: false,
  },
  {
    name: 'Signature',
    priceFrom: 7000,
    priceSuffix: '+',
    who: 'Most projects',
    range: 'Most land between $7,000 and $11,000',
    note: 'The right fit for most projects: a larger custom site with real content depth, several content types your team manages itself, and the integrations a serious church, school, or growing business needs.',
    features: [
      'A larger site with deeper content sections',
      'Several content types your team manages itself',
      'Integrations and search-engine work built in',
    ],
    highlighted: true,
    badge: 'Where most projects land',
  },
  {
    name: 'Flagship',
    priceFrom: 12000,
    priceSuffix: '+',
    who: 'Bespoke builds',
    range: 'Typically $12,000 and up',
    note: 'For organizations that need the site to do real work, not just present it: custom interactive tools, advanced integrations, or a headless build for a large, complex site. The kind of work an agency charges far more for.',
    features: [
      'Custom interactive tools and features',
      'Advanced and third-party integrations',
      'A headless build for a large, deep site',
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
    note: 'Headshots, brand, and environmental photos shot for your site by the person who designed it. A half-day starts at $900 and a full day runs about $1,200, often folded into a build or booked on its own across the Cincinnati region.',
  },
  {
    name: 'Brand & strategy',
    price: '$1,500 to $2,000',
    note: 'Standalone strategy or brand-identity work for when you need it on its own. Strategy is already built into every website project.',
  },
  {
    name: 'Care plan',
    price: 'from $75/mo',
    note: 'Optional. Updates, backups, security, and, on the higher tiers, a monthly bucket of small content edits. It does not cover major revisions or new features, which are quoted separately. Skip it and the site is still yours to leave alone for years, with no lock-in.',
  },
];
