// Safe to edit.
/* ============================================================================
   page_work  (cms/schema)
   ============================================================================
   The words on /work (the portfolio index), apart from the case-study cards
   themselves. A singleton: one entry (slug `work`), read by getWorkPage() in
   src/lib/indexPages.ts. Design: docs/CMS-DESIGN.md 1.9.

   What it edits, in page order:
     Masthead          the small label, the headline and the paragraph under it
                       (the project count, "6 projects", is worked out from the
                       real case studies and printed in front of the paragraph)
     Filter            what the page says when a filter chip matches nothing
     "Open any of them"  the heading and paragraph above the list of live sites
     Closing banner    title and text (empty uses the site default)

   Not here, on purpose: the filter chip labels (they come from the case studies'
   sectors), every case-study card (the cards ARE the case studies, edited under
   Case studies), and the order of the sections.
   ============================================================================ */

import { commonPageFields, singletonSettings } from '../../scripts/lib/emdash-schema.mjs';

export const SLUG = 'page_work';

export const COLLECTION = singletonSettings({
  label: 'Work page',
  labelSingular: 'Work page',
  description: 'The words on the Work page: headline, the filter message and the live-sites list.',
  group: 'Pages',
  // Where the admin's "live view" button goes. A fixed address is allowed (no {slug}).
  urlPattern: '/work/',
  sortOrder: 5,
  titleField: 'seo_title',
});

export const FIELDS = [
  // Search and tab title (the studio name is added for you), search description, and
  // the closing banner's title and text.
  ...commonPageFields({ cta: true }),

  // ── Masthead ──────────────────────────────────────────────────────────────
  {
    slug: 'eyebrow',
    type: 'string',
    label: 'Small label above the headline (max 40)',
    validation: { maxLength: 40 },
  },
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
    label:
      'Paragraph under the headline (max 260). The number of projects, for example "6 projects", is added in front of it automatically, so start with "for churches..." and not with a number',
    required: true,
    validation: { maxLength: 260 },
  },

  // ── Filter ────────────────────────────────────────────────────────────────
  {
    slug: 'empty_filter_message',
    type: 'string',
    label: 'Message when a filter chip matches no project (max 120)',
    required: true,
    validation: { maxLength: 120 },
  },

  // ── "Open any of them" list of live sites ─────────────────────────────────
  {
    slug: 'live_heading',
    type: 'string',
    label: 'Live sites heading (max 40)',
    required: true,
    validation: { maxLength: 40 },
  },
  {
    slug: 'live_body',
    type: 'text',
    label: 'Live sites paragraph (max 300)',
    required: true,
    validation: { maxLength: 300 },
  },
];
