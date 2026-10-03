// Safe to edit.
/* ============================================================================
   page_home  (cms/schema)
   ============================================================================
   The homepage copy. A singleton: one entry (slug `home`), read by getHomePage()
   in src/lib/homePage.ts. Design: docs/CMS-DESIGN.md section 1.4.

   What it edits, in page order:
     Hero            headline (two fields, so the amber/blue accent phrase cannot
                     break), positioning line, the one-person proof line, both buttons
     Selected Work   heading, sub, tail link (the cards themselves come from the
                     case studies, not from here)
     What it costs   heading, sub, the "every build includes" list, reassurance, link
                     (the three tier cards come from Pricing tiers)
     How we work     heading, sub, the four steps, and the closing "Tell me what you
                     are building" block. The same steps and heading also show on
                     Services, so their labels say so.

   Not here, on purpose: section order (it IS the information architecture), the
   buttons' link targets (a typo would break the main conversion path), the hero
   device scene and the client-name marquee (derived from the case studies), and
   the numbers 01 to 04 on the steps (counted from order).

   SEO: the title and description are the two fields BaseLayout already reads, so
   there is one place to edit them (no EmDash SEO panel on a singleton). The
   homepage had no description of its own before this entry; it is seeded with the
   studio tagline (docs/CMS-DESIGN.md 1.1).

   Field limits: `maxLength` on a plain string or text field IS enforced by the
   server. A repeater's own `minItems` / `maxItems` are enforced too, but EmDash
   keeps no limit on a repeater ROW field, so those labels state the number and the
   editing guide repeats it.
   ============================================================================ */

import { commonPageFields, singletonSettings } from '../../scripts/lib/emdash-schema.mjs';

export const SLUG = 'page_home';

export const COLLECTION = singletonSettings({
  label: 'Home page',
  labelSingular: 'Home page',
  description: 'The words on the homepage: headline, section headings, the process steps.',
  group: 'Pages',
  sortOrder: 1,
  titleField: 'seo_title',
});

export const FIELDS = [
  // Search and tab title, plus the search description (no closing banner here).
  ...commonPageFields(),

  // ── Hero ──────────────────────────────────────────────────────────────────
  {
    slug: 'hero_heading',
    type: 'string',
    label:
      'Headline, the plain first part (max 32). It reads as one sentence with the coloured part next',
    required: true,
    validation: { maxLength: 32 },
  },
  {
    slug: 'hero_heading_accent',
    type: 'string',
    label: 'Headline, the coloured last part (max 28). Shows in amber on dark and blue on light',
    required: true,
    validation: { maxLength: 28 },
  },
  {
    slug: 'hero_positioning',
    type: 'text',
    label: 'Positioning line under the headline (max 110)',
    required: true,
    validation: { maxLength: 110 },
  },
  {
    slug: 'hero_proof_before',
    type: 'string',
    label: 'Proof line, words before the link (max 100)',
    required: true,
    validation: { maxLength: 100 },
  },
  {
    slug: 'hero_proof_link_text',
    type: 'string',
    label: 'Proof line, the linked words (max 24). They link to the About page',
    required: true,
    validation: { maxLength: 24 },
  },
  {
    slug: 'hero_proof_after',
    type: 'string',
    label: 'Proof line, words after the link (max 40)',
    required: true,
    validation: { maxLength: 40 },
  },
  {
    slug: 'hero_primary_label',
    type: 'string',
    label: 'Main button label (max 24). It always goes to the Contact page',
    required: true,
    validation: { maxLength: 24 },
  },
  {
    slug: 'hero_secondary_label',
    type: 'string',
    label: 'Second link label (max 24). It always goes to the Work page',
    required: true,
    validation: { maxLength: 24 },
  },

  // ── Selected Work ─────────────────────────────────────────────────────────
  {
    slug: 'work_heading',
    type: 'string',
    label: 'Selected work heading (max 40)',
    required: true,
    validation: { maxLength: 40 },
  },
  {
    slug: 'work_sub',
    type: 'text',
    label: 'Selected work text under the heading (max 200)',
    required: true,
    validation: { maxLength: 200 },
  },
  {
    slug: 'work_link_label',
    type: 'string',
    label: 'Selected work link label under the cards (max 40). It goes to the Work page',
    required: true,
    validation: { maxLength: 40 },
  },

  // ── What it costs ─────────────────────────────────────────────────────────
  {
    slug: 'pricing_heading',
    type: 'string',
    label: 'Pricing heading (max 40)',
    required: true,
    validation: { maxLength: 40 },
  },
  {
    slug: 'pricing_sub',
    type: 'text',
    label: 'Pricing text under the heading (max 220)',
    required: true,
    validation: { maxLength: 220 },
  },
  {
    slug: 'pricing_includes_lead',
    type: 'string',
    label: 'Lead-in to the list of what every build includes (max 80)',
    required: true,
    validation: { maxLength: 80 },
  },
  {
    slug: 'pricing_includes',
    type: 'repeater',
    label: 'What every build includes (exactly 4 lines, keep each under 48 characters)',
    required: true,
    validation: {
      minItems: 4,
      maxItems: 4,
      subFields: [{ slug: 'text', label: 'Line', type: 'string', required: true }],
    },
  },
  {
    slug: 'pricing_reassurance',
    type: 'text',
    label: 'Reassurance line under the tiers (max 260). Check it if your payment terms change',
    required: true,
    validation: { maxLength: 260 },
  },
  {
    slug: 'pricing_link_label',
    type: 'string',
    label: 'Pricing link label (max 48). It goes to the Services page',
    required: true,
    validation: { maxLength: 48 },
  },

  // ── How we work (also shown on Services) ──────────────────────────────────
  {
    slug: 'process_heading',
    type: 'string',
    label: 'Process heading (max 40). Also shown on the Services page',
    required: true,
    validation: { maxLength: 40 },
  },
  {
    slug: 'process_sub',
    type: 'text',
    label: 'Process text under the heading (max 160). Also shown on the Services page',
    required: true,
    validation: { maxLength: 160 },
  },
  {
    slug: 'process_steps',
    type: 'repeater',
    label:
      'The process steps (exactly 4; numbers 01 to 04 are added for you). Title under 32 characters, body under 300. Also shown on the Services page',
    required: true,
    validation: {
      minItems: 4,
      maxItems: 4,
      subFields: [
        { slug: 'title', label: 'Step title', type: 'string', required: true },
        { slug: 'body', label: 'Step text', type: 'text', required: true },
      ],
    },
  },
  {
    slug: 'process_cta_title',
    type: 'string',
    label: 'Closing block title (max 48). Homepage only',
    required: true,
    validation: { maxLength: 48 },
  },
  {
    slug: 'process_cta_sub',
    type: 'text',
    label: 'Closing block text (max 200). Homepage only',
    required: true,
    validation: { maxLength: 200 },
  },
  {
    slug: 'process_cta_label',
    type: 'string',
    label: 'Closing block button label (max 24). It always goes to the Contact page',
    required: true,
    validation: { maxLength: 24 },
  },
];
