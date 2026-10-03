// Safe to edit.
/* ============================================================================
   pricing_addons  (cms/schema)
   ============================================================================
   The "Add to any project" cards on /services: photography, standalone brand and
   strategy, and the optional care plan. One entry per card, ordered by
   `sort_order`, first 3 shown. Read through getAddOns() in src/lib/pricing.ts.
   Design: docs/CMS-DESIGN.md 1.5.

   Replaces src/data/pricing.ts `addOns` (deleted in the same PR). Entries:
   `photography`, `brand-strategy`, `care-plan`.

   The price is a display string on purpose ("from $900", "$500 to $2,000",
   "from $100/mo"): these are floors and ranges, not one number, so nothing
   counts them up.

   Editing note: the care plan price is also quoted in the Services FAQ answer
   "Do you offer maintenance?" and the photography price in the Photography page
   copy. Both are prose in code until their pages move to the CMS.
   ============================================================================ */

import { singletonSettings } from '../../scripts/lib/emdash-schema.mjs';

export const SLUG = 'pricing_addons';

export const COLLECTION = singletonSettings({
  label: 'Add-ons',
  labelSingular: 'Add-on',
  description: 'The "Add to any project" cards on the Services page.',
  group: 'Pricing & services',
  sortOrder: 11,
  titleField: 'name',
  admin: { quickCreate: false, listColumns: ['price', 'sort_order'] },
});

export const FIELDS = [
  {
    slug: 'name',
    type: 'string',
    label: 'Add-on name (max 32)',
    required: true,
    validation: { maxLength: 32 },
  },
  {
    slug: 'price',
    type: 'string',
    label: 'Price as it should read, for example "from $900" or "$500 to $2,000" (max 24)',
    required: true,
    validation: { maxLength: 24 },
  },
  {
    slug: 'note',
    type: 'text',
    label: 'What it covers (max 400)',
    required: true,
    validation: { maxLength: 400 },
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
