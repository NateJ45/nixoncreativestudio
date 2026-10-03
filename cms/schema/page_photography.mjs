// Safe to edit.
/* ============================================================================
   page_photography  (cms/schema)
   ============================================================================
   The words on /photography, apart from the photos themselves (those are the
   Photos collection). A singleton: one entry (slug `photography`), read by
   getPhotographyPage() in src/lib/indexPages.ts. Design: docs/CMS-DESIGN.md 1.9.

   What it edits, in page order:
     Opening           the headline (plain part plus the amber accent phrase) and
                       the paragraph under it
     The three groups  the title and paragraph above the Events, Portraits and
                       Environments galleries (a group with no photos is hidden)
     "In progress"     the heading and text shown while there are NO photos yet
     Closing banner    title and text (empty uses the site default)

   Photos are added under Photography, Photos: one entry per picture, with a
   category, a year and a description for screen readers. The picture is left out
   of the page if that description is empty, so a photo can never ship without alt
   text.

   Not here, on purpose: the "In progress" label and its "See the work" link, the
   "Where these photos come from" note, and the section layout.
   ============================================================================ */

import { commonPageFields, singletonSettings } from '../../scripts/lib/emdash-schema.mjs';

export const SLUG = 'page_photography';

export const COLLECTION = singletonSettings({
  label: 'Photography page',
  labelSingular: 'Photography page',
  description: 'The words on the Photography page: headline and the text above each group.',
  group: 'Pages',
  // Where the admin's "live view" button goes. A fixed address is allowed (no {slug}).
  urlPattern: '/photography/',
  sortOrder: 6,
  titleField: 'seo_title',
});

export const FIELDS = [
  // Search and tab title (the studio name is added for you), search description, and
  // the closing banner's title and text.
  ...commonPageFields({ cta: true }),

  // ── Opening ───────────────────────────────────────────────────────────────
  {
    slug: 'heading',
    type: 'string',
    label: 'Headline, plain part (max 40). The accent phrase below follows it',
    required: true,
    validation: { maxLength: 40 },
  },
  {
    slug: 'heading_accent',
    type: 'string',
    label: 'Headline, accent phrase shown in amber (max 40)',
    required: true,
    validation: { maxLength: 40 },
  },
  {
    slug: 'intro',
    type: 'text',
    label: 'Paragraph under the headline (max 300)',
    required: true,
    validation: { maxLength: 300 },
  },

  // ── The three groups (the categories are fixed: they are the Photos "category" choices) ──
  {
    slug: 'events_title',
    type: 'string',
    label: 'Events group title (max 32)',
    required: true,
    validation: { maxLength: 32 },
  },
  {
    slug: 'events_intro',
    type: 'text',
    label: 'Events group paragraph (max 400)',
    required: true,
    validation: { maxLength: 400 },
  },
  {
    slug: 'portraits_title',
    type: 'string',
    label: 'Portraits group title (max 32)',
    required: true,
    validation: { maxLength: 32 },
  },
  {
    slug: 'portraits_intro',
    type: 'text',
    label: 'Portraits group paragraph (max 400)',
    required: true,
    validation: { maxLength: 400 },
  },
  {
    slug: 'environments_title',
    type: 'string',
    label: 'Environments group title (max 32)',
    required: true,
    validation: { maxLength: 32 },
  },
  {
    slug: 'environments_intro',
    type: 'text',
    label: 'Environments group paragraph (max 400)',
    required: true,
    validation: { maxLength: 400 },
  },

  // ── While there are no photos ─────────────────────────────────────────────
  {
    slug: 'empty_heading',
    type: 'string',
    label: '"In progress" heading, shown only while there are no photos (max 60)',
    required: true,
    validation: { maxLength: 60 },
  },
  {
    slug: 'empty_body',
    type: 'text',
    label: '"In progress" paragraph, shown only while there are no photos (max 300)',
    required: true,
    validation: { maxLength: 300 },
  },
];
