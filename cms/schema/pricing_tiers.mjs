// Safe to edit.
/* ============================================================================
   pricing_tiers  (cms/schema)
   ============================================================================
   The three web design tiers (Launch, Signature, Flagship). One entry per tier,
   ordered by `sort_order`. Read by the homepage "What it costs" band
   (PricingTeaser.astro) and the /services pricing section through
   getPricingTiers() in src/lib/pricing.ts. Design: docs/CMS-DESIGN.md 1.5.

   Replaces src/data/pricing.ts `webTiers` (deleted in the same PR). Entries:
   `launch`, `signature`, `flagship`.

   Render rules (src/lib/pricing.ts): the first 3 published tiers only, in
   `sort_order`; the first tier with "highlighted" ticked gets the accent
   treatment and the badge, any others render plain.

   Editing note: a price here must also be checked against the FAQ answer
   "What does it cost?" on /services and the budget brackets on /contact, which
   are prose in code until CMS-DESIGN PRs 7 and 9.

   Repeater rows: EmDash keeps no per-row character limit, so the label states
   the number and the editing guide repeats it.
   ============================================================================ */

import { singletonSettings } from '../../scripts/lib/emdash-schema.mjs';

export const SLUG = 'pricing_tiers';

// A list collection, not a singleton, but it shares the same admin settings
// (drafts and revisions, not routable, no quick-create).
export const COLLECTION = singletonSettings({
  label: 'Pricing tiers',
  labelSingular: 'Pricing tier',
  description: 'The three website tiers on the homepage and the Services page.',
  group: 'Pricing & services',
  sortOrder: 10,
  titleField: 'name',
  admin: { quickCreate: false, listColumns: ['price_from', 'sort_order'] },
});

export const FIELDS = [
  {
    slug: 'name',
    type: 'string',
    label: 'Tier name (max 20)',
    required: true,
    validation: { maxLength: 20 },
  },
  {
    slug: 'price_from',
    type: 'integer',
    label: 'Starting price in whole dollars, for example 4000 (counts up on the page)',
    required: true,
    validation: { min: 0, max: 100000 },
  },
  {
    slug: 'price_suffix',
    type: 'string',
    label: 'Mark after the price, for example + (max 2)',
    validation: { maxLength: 2 },
  },
  {
    slug: 'who',
    type: 'string',
    label: 'Who it is for, a few words (max 40)',
    required: true,
    validation: { maxLength: 40 },
  },
  {
    slug: 'range',
    type: 'string',
    label: 'Typical range line (check it against the Services FAQ "What does it cost?"; max 60)',
    required: true,
    validation: { maxLength: 60 },
  },
  {
    slug: 'note',
    type: 'text',
    label: 'Paragraph describing the tier, shown on Services (max 320)',
    required: true,
    validation: { maxLength: 320 },
  },
  {
    slug: 'features',
    type: 'repeater',
    label: 'What is included (2 to 5 lines, keep each under 80 characters)',
    required: true,
    validation: {
      minItems: 2,
      maxItems: 5,
      subFields: [{ slug: 'text', label: 'Line', type: 'string', required: true }],
    },
  },
  {
    slug: 'highlighted',
    type: 'boolean',
    label: 'Recommended tier (tick on one tier only: it gets the accent treatment and the badge)',
  },
  {
    slug: 'badge',
    type: 'string',
    label: 'Badge on the recommended tier, for example "Where most projects land" (max 32)',
    validation: { maxLength: 32 },
  },
  {
    slug: 'sort_order',
    type: 'integer',
    label: 'Order on the page, 1 is first (only the first 3 tiers show)',
    required: true,
    indexed: true,
    validation: { min: 1, max: 99 },
  },
];
