// Safe to edit.
/* ============================================================================
   photos  (cms/schema)
   ============================================================================
   The pictures on /photography: one entry per photo. A list collection, read by
   getPhotos() in src/lib/photos.ts and shown in the justified gallery with the
   full-screen viewer. Design: docs/CMS-DESIGN.md 1.11.

   The page shows a group (Events, Portraits, Environments) only when it has at
   least one photo, and the opening picture is the first Featured photo (else the
   first photo). While there are NO photos the page shows its honest "In progress"
   note, so adding the first photo is what switches the page over.

   Every photo needs a description for screen readers (the `alt` field). A photo
   without one is left out of the page rather than ship without alt text.

   Order inside a group: Order number first (smallest first, the ones without a
   number come after), then newest year first.

   The picture is not resized by hand. Upload the largest sensible version (at
   least 1600 px wide); the site serves small WebP copies from it.
   ============================================================================ */

export const SLUG = 'photos';

export const COLLECTION = {
  label: 'Photos',
  labelSingular: 'Photo',
  description: 'The pictures on the Photography page.',
  supports: ['drafts'],
  routable: false,
  group: 'Photography',
  // The admin's "live view" button opens this address (the photos show on Photography). A fixed address is allowed.
  urlPattern: '/photography/',
  // After Journal (14), as the sidebar plan in docs/CMS-DESIGN.md 4.3 has it.
  sortOrder: 15,
  titleField: 'title',
  commentsEnabled: false,
  admin: { listColumns: ['category', 'year'] },
};

export const FIELDS = [
  {
    slug: 'title',
    type: 'string',
    label: 'Title (max 80). Often the moment, not the subject, for example "Sunday morning"',
    required: true,
    validation: { maxLength: 80 },
  },
  {
    slug: 'image',
    type: 'image',
    label: 'Photo (at least 1600 px on the long side)',
    required: true,
  },
  {
    slug: 'alt',
    type: 'string',
    label:
      'Description for screen readers (max 160). Say what the photo shows. The photo is left out of the page without it',
    required: true,
    validation: { maxLength: 160 },
  },
  {
    slug: 'category',
    type: 'select',
    label: 'Group on the Photography page',
    required: true,
    indexed: true,
    validation: { options: ['events', 'portraits', 'environments'] },
  },
  {
    slug: 'caption',
    type: 'string',
    label: 'Caption in the full-screen viewer (max 140). Empty shows the title',
    validation: { maxLength: 140 },
  },
  {
    slug: 'location',
    type: 'string',
    label: 'Where it was taken (max 60). Not shown yet',
    validation: { maxLength: 60 },
  },
  {
    slug: 'year',
    type: 'integer',
    label: 'Year it was taken',
    required: true,
    validation: { min: 2000, max: 2100 },
  },
  {
    slug: 'featured',
    type: 'boolean',
    label: 'Use as the opening picture at the top of the page (the first one ticked wins)',
    indexed: true,
  },
  {
    slug: 'sort_order',
    type: 'integer',
    label: 'Order number inside its group, 1 is first (empty goes after the numbered ones)',
    validation: { min: 1, max: 999 },
  },
];
