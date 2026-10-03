// Safe to edit.
/* ============================================================================
   page_journal  (cms/schema)
   ============================================================================
   The words on /journal (the index), apart from the entries themselves. A
   singleton: one entry (slug `journal`), read by getJournalPage() in
   src/lib/indexPages.ts. Design: docs/CMS-DESIGN.md 1.9.

   What it edits, in page order:
     Masthead          the headline and the paragraph under it
     Empty state       the small line, heading and paragraph of the "first entry
                       is coming" card, shown only while nothing is published
     Closing banner    title and text (empty uses the site default)

   Journal entries themselves still come from the files in the code until the
   journal moves into EmDash (CMS-DESIGN PR 12); this entry only owns the words
   around them.

   Not here, on purpose: the card's studio mark and its two buttons.
   ============================================================================ */

import { commonPageFields, singletonSettings } from '../../scripts/lib/emdash-schema.mjs';

export const SLUG = 'page_journal';

export const COLLECTION = singletonSettings({
  label: 'Journal page',
  labelSingular: 'Journal page',
  description: 'The words on the Journal page: headline and the "first entry is coming" card.',
  group: 'Pages',
  // Where the admin's "live view" button goes. A fixed address is allowed (no {slug}).
  urlPattern: '/journal/',
  sortOrder: 7,
  titleField: 'seo_title',
});

export const FIELDS = [
  // Search and tab title (the studio name is added for you), search description, and
  // the closing banner's title and text.
  ...commonPageFields({ cta: true }),

  // ── Masthead ──────────────────────────────────────────────────────────────
  {
    slug: 'heading',
    type: 'string',
    label: 'Headline (max 40)',
    required: true,
    validation: { maxLength: 40 },
  },
  {
    slug: 'intro',
    type: 'text',
    label: 'Paragraph under the headline (max 260)',
    required: true,
    validation: { maxLength: 260 },
  },

  // ── While nothing is published ────────────────────────────────────────────
  {
    slug: 'empty_kicker',
    type: 'string',
    label:
      'Small line on the "first entry is coming" card, shown only while nothing is published (max 40)',
    required: true,
    validation: { maxLength: 40 },
  },
  {
    slug: 'empty_heading',
    type: 'string',
    label: 'Heading on that card (max 60)',
    required: true,
    validation: { maxLength: 60 },
  },
  {
    slug: 'empty_body',
    type: 'text',
    label: 'Paragraph on that card (max 300)',
    required: true,
    validation: { maxLength: 300 },
  },
];
