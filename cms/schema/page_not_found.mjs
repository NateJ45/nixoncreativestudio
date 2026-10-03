// Safe to edit.
/* ============================================================================
   page_not_found  (cms/schema)
   ============================================================================
   The words on the "page not found" page that a visitor sees at a broken or old
   address. A singleton: one entry (slug `not-found`), read by getNotFoundPage()
   in src/lib/indexPages.ts. Design: docs/CMS-DESIGN.md 1.9.

   What it edits, in page order:
     Page words        the small status line, the headline and the paragraph
     Links             one to three ways back into the site. The FIRST is shown
                       as the blue button, the others as plain links. Each
                       address must start with a slash, for example /work/

   The page always answers with a real "not found" (404) status, whatever is
   written here, so search engines never index it. Not here, on purpose: the big
   decorative "404" and the page layout.

   Link limits: EmDash keeps no limit on a repeater ROW field, so the label states
   the length (button words under 24 characters, address under 80) and the editing
   guide repeats it. The site ignores a link whose address does not start with a
   single slash, so a typo can never send a visitor off-site.
   ============================================================================ */

import { singletonSettings } from '../../scripts/lib/emdash-schema.mjs';

export const SLUG = 'page_not_found';

export const COLLECTION = singletonSettings({
  label: 'Not-found page',
  labelSingular: 'Not-found page',
  description: 'The words on the page shown at a broken or old address.',
  group: 'Pages',
  sortOrder: 8,
  titleField: 'seo_title',
});

export const FIELDS = [
  {
    slug: 'seo_title',
    type: 'string',
    label: 'Search and tab title (max 60 characters)',
    required: true,
    validation: { maxLength: 60 },
  },
  {
    slug: 'seo_description',
    type: 'text',
    label: 'Search description (50 to 160 characters)',
    required: true,
    validation: { minLength: 50, maxLength: 160 },
  },
  {
    slug: 'label',
    type: 'string',
    label: 'Small status line above the headline (max 32)',
    required: true,
    validation: { maxLength: 32 },
  },
  {
    slug: 'heading',
    type: 'string',
    label: 'Headline (max 40)',
    required: true,
    validation: { maxLength: 40 },
  },
  {
    slug: 'body',
    type: 'text',
    label: 'Paragraph under the headline (max 220)',
    required: true,
    validation: { maxLength: 220 },
  },
  {
    slug: 'links',
    type: 'repeater',
    label:
      'Ways back into the site (1 to 3; the first is the blue button, the others plain links). Button words under 24 characters; the address must start with a slash, under 80 characters, for example /work/',
    required: true,
    validation: {
      minItems: 1,
      maxItems: 3,
      subFields: [
        { slug: 'label', label: 'Button or link words', type: 'string', required: true },
        { slug: 'href', label: 'Address (starts with /)', type: 'string', required: true },
      ],
    },
  },
];
