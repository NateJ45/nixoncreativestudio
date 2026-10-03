// Safe to edit.
/* ============================================================================
   pages  (cms/schema)
   ============================================================================
   The long-form text pages: Privacy, Accessibility and Colophon. NOT a singleton
   like the page_* collections: it is the EmDash template's own `pages`
   collection (it already exists in production with just Title and Content),
   EXTENDED here with the fields the three pages need. One entry per page, found
   by its slug (`privacy`, `accessibility`, `colophon`), read by getProsePage()
   in src/lib/prosePage.ts and shown by src/components/ProsePage.astro. Design:
   docs/CMS-DESIGN.md 1.10.

   Each entry carries:
     title          the page name ("Privacy"). The tab reads "Privacy | <studio>".
     heading        the big headline on the page ("What this site collects.")
     eyebrow        the small label above the headline ("Privacy notice")
     summary        the search description
     intro          the lead paragraph under the headline (links allowed)
     content        the body. Every "Heading 2" starts a new section and becomes
                    an entry in the "On this page" list on the left. Paragraphs,
                    bold, italic, links, inline code and bullet lists are kept;
                    pictures, tables and other headings are not.
     rows           (Colophon only) the label and detail rows
     show_toc       on: the document layout (label, "last updated" badge, "On this
                    page" list and sections). Off: the ledger layout (rows)
     last_updated   the date shown as "Last updated ..." (document layout only)

   TWO THINGS ONLY A DEVELOPER CAN CHANGE. The Colophon's facts about how the
   site is built (the tools, the type, the hosting) are plain text you can edit
   here, but they must stay TRUE: if the code or the hosting changes, a developer
   has to check them. The same goes for the Privacy and Accessibility claims about
   what the site collects and does. The email address in the links is typed into
   the text, so if you change it in Site settings, change it here too.

   Section links. The "On this page" links and the anchors other pages point at
   come from the heading text ("Contact form" becomes #contact-form). Three
   Accessibility headings keep their older anchors (#how-its-checked,
   #where-it-stops, #report) as long as the heading text is unchanged; reword a
   heading and its anchor changes with it.

   Field limits: `maxLength` on a plain string or text field IS enforced by the
   server. A repeater's own `maxItems` is enforced too, but EmDash keeps no limit
   on a repeater ROW field, so the labels state the length.
   ============================================================================ */

export const SLUG = 'pages';

export const COLLECTION = {
  label: 'Other pages',
  labelSingular: 'Page',
  description: 'Privacy, Accessibility and Colophon: the long text pages.',
  supports: ['drafts', 'revisions', 'search'],
  urlPattern: '/{slug}/',
  group: 'Pages',
  sortOrder: 9,
  titleField: 'title',
  commentsEnabled: false,
};

export const FIELDS = [
  // Both of these exist in the template; the label and limit are the only change.
  {
    slug: 'title',
    type: 'string',
    label: 'Page name (max 60). The tab reads "<name> | your studio name"',
    required: true,
    searchable: true,
    validation: { maxLength: 60 },
  },
  {
    slug: 'content',
    type: 'portableText',
    label:
      'Body. Each "Heading 2" starts a section and appears in the "On this page" list. Paragraphs, bold, italic, links, code and bullet lists only (Privacy and Accessibility)',
    searchable: true,
  },

  {
    slug: 'heading',
    type: 'string',
    label: 'Headline at the top of the page (max 80)',
    required: true,
    validation: { maxLength: 80 },
  },
  {
    slug: 'eyebrow',
    type: 'string',
    label: 'Small label above the headline (max 40; leave empty on the Colophon)',
    validation: { maxLength: 40 },
  },
  {
    slug: 'summary',
    type: 'text',
    label: 'Search description (50 to 160 characters)',
    required: true,
    validation: { minLength: 50, maxLength: 160 },
  },
  {
    slug: 'intro',
    type: 'portableText',
    label: 'Lead paragraph under the headline (paragraphs, bold, italic and links)',
  },
  {
    slug: 'rows',
    type: 'repeater',
    label:
      'Label and detail rows (Colophon only, up to 12; label under 32 characters, detail under 400). These are facts about how the site is built: they must stay true, so ask a developer before changing the tools, type or hosting',
    validation: {
      maxItems: 12,
      subFields: [
        { slug: 'label', label: 'Label', type: 'string', required: true },
        { slug: 'detail', label: 'Detail', type: 'text', required: true },
      ],
    },
  },
  {
    slug: 'show_toc',
    type: 'boolean',
    label:
      'Document layout with an "On this page" list (on for Privacy and Accessibility, off for the Colophon, which shows the rows instead)',
  },
  {
    slug: 'last_updated',
    type: 'datetime',
    label: 'Last updated (document layout only; set this to today when the text changes)',
  },
];
