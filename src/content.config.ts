/* ============================================================================
   Content Collections
   ============================================================================
   Defines the schema for everything in src/content/. Astro reads this at
   build time and gives every collection entry typed access plus build-time
   validation: a typo in a frontmatter field fails the build instead of
   silently shipping a broken page.

   Astro 6 uses the content layer API: each collection declares a `loader`
   (here `glob()` over the matching folder) and a Zod `schema`. Adding a
   new collection means adding a new `defineCollection` call below and
   creating the matching folder in src/content/.
   ============================================================================ */

import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/* ----------------------------------------------------------------------------
   case studies are NOT here any more
   ----------------------------------------------------------------------------
   They live in EmDash (D1), not in src/content. See docs/EMDASH.md and
   src/lib/caseStudies.ts. The one-time MDX import scripts are in scripts/
   (migrate-case-studies.mjs); the MDX files themselves are in git history.
   ---------------------------------------------------------------------------- */

/* ----------------------------------------------------------------------------
   photos
   ----------------------------------------------------------------------------
   Lightweight catalogue for the photography page. Each entry is a small
   JSON file in src/content/photos/ describing one photograph: title,
   image asset, category, optional caption + location, year, and a
   featured flag.

   Why JSON rather than MDX: photos don't need a prose body, just
   metadata. JSON keeps each entry to a handful of lines and removes
   the temptation to write long descriptions next to a single image.
   The image file itself lives in src/assets/photography/, referenced
   by relative path from the JSON entry.

   NO LONGER READ (CMS-DESIGN PR 11): /photography reads the `photos` collection
   in EmDash (src/lib/photos.ts). This empty Astro collection stays only until
   PR 12 deletes it; do not add entries here.
   ---------------------------------------------------------------------- */

const photos = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/photos' }),

  schema: ({ image }) =>
    z.object({
      // Short display title for the photo (often the moment, not the
      // subject). Example: 'Sunday morning', 'Classroom light'.
      title: z.string(),

      // The image file itself. image() runs the asset through Astro's
      // optimization pipeline. The path in JSON is relative to the
      // entry's location: e.g. '../../assets/photography/events-01.jpg'.
      image: image(),

      // Optional caption shown in the lightbox.
      caption: z.string().optional(),

      // Category bucket. Matches the three sections on the photography
      // page so we can filter entries per section.
      category: z.enum(['events', 'portraits', 'environments']),

      // Optional location string for the lightbox caption or future
      // map-style listing. Example: 'Crestview Presbyterian, West Chester'.
      location: z.string().optional(),

      // Year the photo was taken.
      year: z.number().int(),

      // Featured flag for the homepage PhotoStrip's curated selection.
      featured: z.boolean().default(false),
    }),
});

/* ----------------------------------------------------------------------------
   Export the collections map
   ----------------------------------------------------------------------------
   Astro requires a single named export called `collections` whose keys
   become the collection names used in getCollection() and getEntry().
   ---------------------------------------------------------------------------- */

/* ----------------------------------------------------------------------------
   journal
   ----------------------------------------------------------------------------
   Short-form essays, process notes, and field reports. Lives at /journal/
   on the site. Lower-stakes than case studies: not every post needs a
   custom cover image or production-grade prose, but every post should
   land at /journal/{slug}/ as a real URL the reader can share.
   ---------------------------------------------------------------------- */

const journal = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/journal' }),

  schema: ({ image }) =>
    z.object({
      // Display title for the entry and its listing card.
      title: z.string(),

      // One-sentence pitch. Shown on the journal index card and used as
      // the meta description and og:description on the detail page.
      summary: z.string().max(200),

      // Publish date. Drives ordering on /journal (newest first).
      published: z.date(),

      // Optional last-updated date. Same pattern as case studies.
      updated: z.date().optional(),

      // Optional cover image. When present, drives the listing-card art
      // and the per-entry og:image. When absent, the listing card just
      // renders the title + summary block.
      cover: image().optional(),

      // Optional tags for filtering and topical grouping. Free-form
      // strings; light-touch taxonomy.
      tags: z.array(z.string()).optional(),

      // Draft flag. Entries with draft:true don't appear in production
      // builds (the listing page filters them out). Use to stage posts
      // without exposing them publicly.
      draft: z.boolean().default(false),
    }),
});

export const collections = {
  photos: photos,
  journal: journal,
};
