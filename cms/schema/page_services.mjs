// Safe to edit.
/* ============================================================================
   page_services  (cms/schema)
   ============================================================================
   The words on /services, apart from the three service chapters (those are the
   `service_offerings` collection) and the price tiers and add-on cards (Pricing
   tiers and Add-ons). A singleton: one entry (slug `services`), read by
   getServicesPage() in src/lib/servicesPage.ts. Design: docs/CMS-DESIGN.md 1.6.

   What it edits, in page order:
     Hero                 the h1 and the paragraph under it
     What a website costs heading, sub, and the note under the tier cards
     Add to any project   the heading over the add-on cards
     Why it costs         heading, sub, four reasons, the tooling paragraph
     FAQ                  heading, sub, and every question and answer (the FAQPage
                          structured data that Google reads is built from these
                          rows, so an edit here updates it too)
     Closing banner       title and text (empty uses the site default)

   Not here, on purpose: section order, the three-service flow card in the hero
   (decorative), the "What's included" label, every button, and the process steps
   (they are the homepage's, edited under Home page).

   Editing note: the FAQ answer "What does it cost?" and "Do you offer
   maintenance?" quote prices that live in Pricing tiers and Add-ons. After a
   price change, read those answers and update them here.

   Field limits: `maxLength` on a plain string or text field IS enforced by the
   server. A repeater's own `minItems` / `maxItems` are enforced too, but EmDash
   keeps no limit on a repeater ROW field, so those labels state the number and
   the editing guide repeats it.
   ============================================================================ */

import { commonPageFields, singletonSettings } from '../../scripts/lib/emdash-schema.mjs';

export const SLUG = 'page_services';

export const COLLECTION = singletonSettings({
  label: 'Services page',
  labelSingular: 'Services page',
  description: 'The words on the Services page: headline, cost and FAQ sections.',
  group: 'Pages',
  // Where the admin's "live view" button goes. A fixed address is allowed (no {slug}).
  urlPattern: '/services/',
  sortOrder: 2,
  titleField: 'seo_title',
});

export const FIELDS = [
  // Search and tab title (the studio name is added for you), search description, and
  // the closing banner's title and text.
  ...commonPageFields({ cta: true }),

  // ── Hero ──────────────────────────────────────────────────────────────────
  {
    slug: 'heading',
    type: 'string',
    label: 'Page headline (max 110)',
    required: true,
    validation: { maxLength: 110 },
  },
  {
    slug: 'intro',
    type: 'text',
    label: 'Paragraph under the headline (max 260)',
    required: true,
    validation: { maxLength: 260 },
  },

  // ── What a website costs ──────────────────────────────────────────────────
  {
    slug: 'pricing_heading',
    type: 'string',
    label: 'Cost section heading (max 40)',
    required: true,
    validation: { maxLength: 40 },
  },
  {
    slug: 'pricing_sub',
    type: 'text',
    label:
      'Cost section paragraph, above the tier cards (max 400). The prices themselves are under Pricing tiers',
    required: true,
    validation: { maxLength: 400 },
  },
  {
    slug: 'pricing_footnote',
    type: 'text',
    label: 'Note under the tier cards (max 200)',
    required: true,
    validation: { maxLength: 200 },
  },
  {
    slug: 'addons_heading',
    type: 'string',
    label: 'Heading over the add-on cards (max 32). The cards are under Add-ons',
    required: true,
    validation: { maxLength: 32 },
  },

  // ── Why it costs what it costs ────────────────────────────────────────────
  {
    slug: 'why_heading',
    type: 'string',
    label: 'Why-it-costs heading (max 40)',
    required: true,
    validation: { maxLength: 40 },
  },
  {
    slug: 'why_sub',
    type: 'text',
    label: 'Why-it-costs paragraph (max 200)',
    required: true,
    validation: { maxLength: 200 },
  },
  {
    slug: 'why_items',
    type: 'repeater',
    label: 'The reasons (exactly 4, in two columns). Title under 40 characters, text under 360',
    required: true,
    validation: {
      minItems: 4,
      maxItems: 4,
      subFields: [
        { slug: 'title', label: 'Reason title', type: 'string', required: true },
        { slug: 'body', label: 'Reason text', type: 'text', required: true },
      ],
    },
  },
  {
    slug: 'why_closing',
    type: 'text',
    label: 'Closing paragraph under the reasons, about the tools you use (max 420)',
    required: true,
    validation: { maxLength: 420 },
  },

  // ── FAQ ───────────────────────────────────────────────────────────────────
  {
    slug: 'faq_heading',
    type: 'string',
    label: 'FAQ heading (max 40)',
    required: true,
    validation: { maxLength: 40 },
  },
  {
    slug: 'faq_sub',
    type: 'text',
    label: 'FAQ paragraph (max 200)',
    required: true,
    validation: { maxLength: 200 },
  },
  {
    slug: 'faq',
    type: 'repeater',
    label:
      'Questions and answers (3 to 10; question under 140 characters, answer under 900). Google shows these in search, so keep them true. If an answer quotes a price, check it against Pricing tiers',
    required: true,
    validation: {
      minItems: 3,
      maxItems: 10,
      subFields: [
        { slug: 'question', label: 'Question', type: 'string', required: true },
        { slug: 'answer', label: 'Answer', type: 'text', required: true },
      ],
    },
  },
];
