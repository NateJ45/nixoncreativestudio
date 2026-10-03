// Safe to edit.
/* ============================================================================
   posts  (cms/schema)  -- the Journal
   ============================================================================
   The journal entries at /journal/<slug>/. NOT a singleton: it is the EmDash
   template's own `posts` collection (it already exists in production with
   Title, Featured image, Content and Excerpt and holds no entries), EXTENDED and
   relabelled "Journal" here. One entry per journal post, read by
   getJournalEntries() / getJournalEntry() in src/lib/journal.ts. Design:
   docs/CMS-DESIGN.md 1.11.

   What an entry carries:
     title           the headline (also the link text on the Journal page)
     excerpt         the one-sentence summary: the card text on /journal, the
                     search description and the share text. Required, 200 max
     featured_image  an optional cover, shown on the Journal page and at the top
                     of the entry
     content         the body. Heading 2 starts a section, Heading 3 a subsection.
                     Paragraphs, bold, italic, links, lists, quotes and code
                     blocks are supported
     updated         an optional "last updated" date
     Tags            the template's built-in Tags box in the sidebar (not a field)

   THE PUBLISH DATE is not a field: it is the moment the entry is published
   (EmDash records it). That is what orders the Journal page (newest first) and
   what the entry shows. A DRAFT is never visible: neither /journal nor the entry's
   own address shows it (the site reads published entries only).

   WHEN THE FIRST ENTRY IS PUBLISHED the "Journal" link appears in the header and
   footer menus, and the Journal page swaps its "first entry is coming" card for
   the list. While nothing is published the link stays hidden (a rule in code).

   WHAT THE BODY CAN HOLD (src/lib/journalBody.ts draws it): paragraphs, Heading 2
   and Heading 3, quotes, bullet and numbered lists, bold, italic, inline code,
   links and code blocks. Code blocks are plain monospace boxes with no syntax
   colouring (the old MDX journal used expressive-code; Portable Text has no such
   step). PICTURES IN THE BODY ARE NOT DRAWN YET (nor tables or embeds): they leave
   no trace on the page. The Cover image is the picture an entry has.

   `hidden: false` is deliberate: the design hid this collection until PR 12 so it
   would not invite writing into something nothing read. Applying this schema
   un-hides it.

   The `seo` support gives the sitemap its per-entry address list and a "do not
   index" checkbox, which the sitemap honours. The SEO panel's title and
   description boxes are NOT read by the page (the Summary is the description).
   ============================================================================ */

export const SLUG = 'posts';

export const COLLECTION = {
  label: 'Journal',
  labelSingular: 'Journal entry',
  description: 'Essays, process notes and field reports at /journal/.',
  supports: ['drafts', 'revisions', 'search', 'seo'],
  urlPattern: '/journal/{slug}/',
  hidden: false,
  sortOrder: 14,
  titleField: 'title',
  commentsEnabled: false,
};

export const FIELDS = [
  // title, featured_image, content and excerpt exist in the template; the label,
  // required flag and limit are what change here. `updated` is new.
  {
    slug: 'title',
    type: 'string',
    label: 'Title (max 100)',
    required: true,
    searchable: true,
    validation: { maxLength: 100 },
  },
  {
    slug: 'featured_image',
    type: 'image',
    label: 'Cover image (optional; shown on the Journal page and above the entry)',
  },
  {
    slug: 'content',
    type: 'portableText',
    label:
      'Body. "Heading 2" starts a section and "Heading 3" a subsection. Paragraphs, bold, italic, links, lists, quotes and code blocks are supported',
    searchable: true,
  },
  {
    slug: 'excerpt',
    type: 'text',
    label:
      'Summary (max 200). One sentence: the card text on the Journal page, the search description and the share text',
    required: true,
    validation: { maxLength: 200 },
  },
  {
    slug: 'updated',
    type: 'datetime',
    label: 'Last updated (optional; shows "Updated <date>" when it differs from the publish date)',
  },
];
