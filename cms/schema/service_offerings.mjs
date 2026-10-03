// Safe to edit.
/* ============================================================================
   service_offerings  (cms/schema)
   ============================================================================
   The three service chapters on /services: Strategy, Web design, Photography.
   One entry per chapter, ordered by `sort_order`, first 3 shown. Read through
   getServiceOfferings() in src/lib/servicesPage.ts. Design: docs/CMS-DESIGN.md 1.6.

   Entries: `strategy`, `web-design`, `photography`.

   Each entry also feeds the Service structured data (JSON-LD) on /services: its
   title, body, area served and starting price, so a price or wording change
   here changes what Google reads, with no code edit.

   Starting price: Strategy ($1,500) and Photography ($900) carry theirs here.
   Web design's floor follows the first Pricing tier, so leave it empty (a number
   typed here would win over the tier).

   Picture: the Web design chapter shows a real shipped-site screenshot that is
   an image file in the code (src/assets/case-studies/), not a CMS upload yet
   (CMS-DESIGN deviation noted in PR 7). Its description sits in `image_alt`; an
   empty description hides the picture and shows the placeholder panel, so a
   picture can never ship without alt text.

   Repeater rows: EmDash keeps no per-row character limit, so the label states
   the number and the editing guide repeats it.
   ============================================================================ */

import { singletonSettings } from '../../scripts/lib/emdash-schema.mjs';

export const SLUG = 'service_offerings';

// A list collection, not a singleton, but it shares the same admin settings
// (drafts and revisions, not routable, no quick-create).
export const COLLECTION = singletonSettings({
  label: 'Service offerings',
  labelSingular: 'Service offering',
  description: 'The Strategy, Web design and Photography chapters on the Services page.',
  group: 'Pricing & services',
  // The admin's "live view" button opens this address (the offerings show on Services). A fixed address is allowed.
  urlPattern: '/services/',
  sortOrder: 12,
  titleField: 'title',
  admin: { quickCreate: false, listColumns: ['price_from', 'sort_order'] },
});

export const FIELDS = [
  {
    slug: 'title',
    type: 'string',
    label: 'Service name (max 32)',
    required: true,
    validation: { maxLength: 32 },
  },
  {
    slug: 'lede',
    type: 'text',
    label: 'One-sentence summary in bold (max 180)',
    required: true,
    validation: { maxLength: 180 },
  },
  {
    slug: 'body',
    type: 'text',
    label: 'Paragraph under the summary (max 500). Also the description Google reads',
    required: true,
    validation: { maxLength: 500 },
  },
  {
    slug: 'price_from',
    type: 'integer',
    label:
      'Standalone starting price in whole dollars, for example 1500 (read by Google, not shown on the page). Leave empty for Web design: it follows the first Pricing tier',
    validation: { min: 0, max: 100000 },
  },
  {
    slug: 'image_alt',
    type: 'string',
    label:
      'Describe the picture (max 160). Only Web design has a picture; empty shows the placeholder panel instead',
    validation: { maxLength: 160 },
  },
  {
    slug: 'placeholder_icon',
    type: 'select',
    label: 'Icon on the placeholder panel (used when there is no picture)',
    required: true,
    validation: { options: ['strategy', 'photography', 'none'] },
  },
  {
    slug: 'points',
    type: 'repeater',
    label: 'What is included (3 to 5 lines, keep each under 90 characters)',
    required: true,
    validation: {
      minItems: 3,
      maxItems: 5,
      subFields: [{ slug: 'text', label: 'Line', type: 'string', required: true }],
    },
  },
  {
    slug: 'area_served',
    type: 'select',
    label:
      'Where you offer it, for Google: "regional" is the greater Cincinnati region only, "anywhere" adds the whole United States',
    required: true,
    validation: { options: ['regional', 'anywhere'] },
  },
  {
    slug: 'sort_order',
    type: 'integer',
    label: 'Order on the page, 1 is first (only the first 3 show)',
    required: true,
    indexed: true,
    validation: { min: 1, max: 99 },
  },
];
