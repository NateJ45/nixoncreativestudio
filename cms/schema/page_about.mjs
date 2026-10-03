// Safe to edit.
/* ============================================================================
   page_about  (cms/schema)
   ============================================================================
   The words and pictures on /about. A singleton: one entry (slug `about`), read
   by getAboutPage() in src/lib/aboutPage.ts. Design: docs/CMS-DESIGN.md 1.7.

   What it edits, in page order:
     Masthead     the headline (plain part and blue part), the intro, the headshot
     In short     the one-line thesis, split around its blue phrase
     Story        heading, sub, and the four-paragraph story (paragraphs, bold,
                  italic and links only; no headings or pictures)
     Outside      heading, sub, and 3 to 6 captioned photos
     How I work   heading, sub, and exactly three principles
     Currently    heading, sub, the "last updated" date (drives the freshness
                  pill), and the Working on / Booking / Reading / Learning lists:
                  the part Nathan rewrites every quarter
     Testimonials the heading and sub over the client-quote band (the quotes
                  themselves come from the case studies)
     Lighthouse   the four scores in the little panel under the terminal
     Person       the job title in the page's structured data

   Not here, on purpose: the typing Terminal (a timed animation, in code), the
   rail words (ABOUT, STORY, ...), the section order, and the quotes.

   Pictures: every image field has a text sibling. If a picture is set but its
   description is empty, the page leaves the picture out rather than ship it
   without alt text. While the CMS is empty the page shows the pictures bundled
   with the site (cms/content/page_about.json points at them).

   Field limits: `maxLength` on a plain string or text field IS enforced by the
   server. A repeater's own `minItems` / `maxItems` are enforced too, but EmDash
   keeps no limit on a repeater ROW field, so those labels state the number and
   the editing guide repeats it.
   ============================================================================ */

import { commonPageFields, singletonSettings } from '../../scripts/lib/emdash-schema.mjs';

export const SLUG = 'page_about';

export const COLLECTION = singletonSettings({
  label: 'About page',
  labelSingular: 'About page',
  description:
    'The words and photos on the About page, including the Currently list you refresh each quarter.',
  group: 'Pages',
  // Where the admin's "live view" button goes. A fixed address is allowed (no {slug}).
  urlPattern: '/about/',
  sortOrder: 3,
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
    label: 'Headline, the plain first part (max 40)',
    required: true,
    validation: { maxLength: 40 },
  },
  {
    slug: 'heading_accent',
    type: 'string',
    label: 'Headline, the blue last part (max 60)',
    required: true,
    validation: { maxLength: 60 },
  },
  {
    slug: 'intro',
    type: 'text',
    label: 'Intro paragraph beside the headshot (max 520)',
    required: true,
    validation: { maxLength: 520 },
  },
  {
    slug: 'headshot',
    type: 'image',
    label: 'Headshot (a square or 4:5 photo, at least 864 px wide)',
    required: true,
  },
  {
    slug: 'headshot_alt',
    type: 'string',
    label: 'Headshot description for screen readers (max 120). The photo is left out without it',
    required: true,
    validation: { maxLength: 120 },
  },

  // ── In short ──────────────────────────────────────────────────────────────
  {
    slug: 'thesis_before',
    type: 'text',
    label: 'One-line thesis, the part before the blue phrase (max 140)',
    required: true,
    validation: { maxLength: 140 },
  },
  {
    slug: 'thesis_accent',
    type: 'string',
    label: 'One-line thesis, the blue phrase (max 80)',
    required: true,
    validation: { maxLength: 80 },
  },
  {
    slug: 'thesis_after',
    type: 'text',
    label: 'One-line thesis, the part after the blue phrase (max 140)',
    required: true,
    validation: { maxLength: 140 },
  },

  // ── Story ─────────────────────────────────────────────────────────────────
  {
    slug: 'story_heading',
    type: 'string',
    label: 'Story heading (max 40)',
    required: true,
    validation: { maxLength: 40 },
  },
  {
    slug: 'story_sub',
    type: 'text',
    label: 'Story paragraph under the heading (max 160)',
    required: true,
    validation: { maxLength: 160 },
  },
  {
    slug: 'story_body',
    type: 'portableText',
    label:
      'The story (paragraphs only: bold, italic and links work; headings, lists and pictures are ignored)',
    required: true,
  },

  // ── Outside the studio ────────────────────────────────────────────────────
  {
    slug: 'outside_heading',
    type: 'string',
    label: 'Photos heading (max 40)',
    required: true,
    validation: { maxLength: 40 },
  },
  {
    slug: 'outside_sub',
    type: 'text',
    label: 'Photos paragraph under the heading (max 160)',
    required: true,
    validation: { maxLength: 160 },
  },
  {
    slug: 'photos',
    type: 'repeater',
    label:
      'Photos (3 to 6, shown in this order). Caption under 40 characters, description under 160. A photo without a description is left out',
    required: true,
    validation: {
      minItems: 3,
      maxItems: 6,
      subFields: [
        { slug: 'image', label: 'Photo', type: 'image', required: true },
        { slug: 'caption', label: 'Caption', type: 'string', required: true },
        { slug: 'alt', label: 'Description for screen readers', type: 'string', required: true },
      ],
    },
  },

  // ── How I work ────────────────────────────────────────────────────────────
  {
    slug: 'principles_heading',
    type: 'string',
    label: 'Principles heading (max 40)',
    required: true,
    validation: { maxLength: 40 },
  },
  {
    slug: 'principles_sub',
    type: 'text',
    label: 'Principles paragraph under the heading (max 160)',
    required: true,
    validation: { maxLength: 160 },
  },
  {
    slug: 'principles',
    type: 'repeater',
    label: 'The three principles (exactly 3). Title under 48 characters, text under 360',
    required: true,
    validation: {
      minItems: 3,
      maxItems: 3,
      subFields: [
        { slug: 'title', label: 'Principle title', type: 'string', required: true },
        { slug: 'body', label: 'Principle text', type: 'text', required: true },
      ],
    },
  },

  // ── Currently ─────────────────────────────────────────────────────────────
  {
    slug: 'currently_heading',
    type: 'string',
    label: 'Currently heading (max 40)',
    required: true,
    validation: { maxLength: 40 },
  },
  {
    slug: 'currently_sub',
    type: 'text',
    label: 'Currently paragraph under the heading (max 160)',
    required: true,
    validation: { maxLength: 160 },
  },
  {
    slug: 'currently_updated',
    type: 'datetime',
    label: 'Currently last updated (set this to today whenever you change the lists below)',
    required: true,
  },
  {
    slug: 'working_on',
    type: 'repeater',
    label: 'Working on (1 to 3 lines, each under 140 characters)',
    required: true,
    validation: {
      minItems: 1,
      maxItems: 3,
      subFields: [{ slug: 'text', label: 'Line', type: 'string', required: true }],
    },
  },
  {
    slug: 'booking',
    type: 'repeater',
    label:
      'Booking (1 to 3 rows). Label under 24 characters, details under 220. Status: Open shows green, Limited shows amber, and the word is always printed too',
    required: true,
    validation: {
      minItems: 1,
      maxItems: 3,
      subFields: [
        { slug: 'label', label: 'What you offer', type: 'string', required: true },
        {
          slug: 'status',
          label: 'Status',
          type: 'select',
          required: true,
          options: ['open', 'limited'],
        },
        { slug: 'detail', label: 'Details', type: 'text', required: true },
      ],
    },
  },
  {
    slug: 'reading',
    type: 'repeater',
    label:
      'Reading (1 to 4 books). Title under 60 characters, author under 40, note under 24 (optional, for example "re-reading")',
    required: true,
    validation: {
      minItems: 1,
      maxItems: 4,
      subFields: [
        { slug: 'title', label: 'Title', type: 'string', required: true },
        { slug: 'author', label: 'Author', type: 'string', required: true },
        { slug: 'note', label: 'Note (optional)', type: 'string' },
      ],
    },
  },
  {
    slug: 'learning',
    type: 'repeater',
    label: 'Learning (1 to 4 lines, each under 100 characters)',
    required: true,
    validation: {
      minItems: 1,
      maxItems: 4,
      subFields: [{ slug: 'text', label: 'Line', type: 'string', required: true }],
    },
  },

  // ── Testimonials band ─────────────────────────────────────────────────────
  {
    slug: 'testimonials_heading',
    type: 'string',
    label: 'Client quotes heading (max 40). The quotes come from the case studies',
    required: true,
    validation: { maxLength: 40 },
  },
  {
    slug: 'testimonials_sub',
    type: 'text',
    label: 'Client quotes paragraph (max 160)',
    required: true,
    validation: { maxLength: 160 },
  },

  // ── Lighthouse panel ──────────────────────────────────────────────────────
  // Measured facts: only change these after a real re-measure of the page.
  {
    slug: 'lighthouse_performance',
    type: 'integer',
    label: 'Lighthouse Performance (0 to 100). Measured fact: only change after a real re-measure',
    required: true,
    validation: { min: 0, max: 100 },
  },
  {
    slug: 'lighthouse_accessibility',
    type: 'integer',
    label:
      'Lighthouse Accessibility (0 to 100). Measured fact: only change after a real re-measure',
    required: true,
    validation: { min: 0, max: 100 },
  },
  {
    slug: 'lighthouse_best_practices',
    type: 'integer',
    label:
      'Lighthouse Best Practices (0 to 100). Measured fact: only change after a real re-measure',
    required: true,
    validation: { min: 0, max: 100 },
  },
  {
    slug: 'lighthouse_seo',
    type: 'integer',
    label: 'Lighthouse SEO (0 to 100). Measured fact: only change after a real re-measure',
    required: true,
    validation: { min: 0, max: 100 },
  },

  // ── Structured data ───────────────────────────────────────────────────────
  {
    slug: 'job_title',
    type: 'string',
    label: 'Job title for search engines (max 80). Not shown on the page',
    required: true,
    validation: { maxLength: 80 },
  },
];
