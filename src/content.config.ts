/* ============================================================================
   Content Collections
   ============================================================================
   Defines the schema for everything in src/content/. Astro reads this at
   build time and gives every collection entry typed access plus build-time
   validation: a typo in a frontmatter field fails the build instead of
   silently shipping a broken page.

   Astro 6 uses the content layer API: each collection declares a `loader`
   (here `glob()` over the matching folder) and a Zod `schema`. Adding a new
   collection means adding a new `defineCollection` call below and creating
   the matching folder in src/content/.
   ============================================================================ */

import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';


/* ----------------------------------------------------------------------------
   case-studies
   ----------------------------------------------------------------------------
   Long-form portfolio entries. Each entry is one .mdx file in
   src/content/case-studies/, named with the slug used in the URL
   (e.g. crestview-presbyterian.mdx → /work/crestview-presbyterian/).

   The schema mirrors the fields documented in the migration walkthrough.
   ---------------------------------------------------------------------------- */

const caseStudies = defineCollection({

  // Load every .mdx file in src/content/case-studies/. Adding a new entry
  // is as simple as dropping in a new .mdx file with matching frontmatter.
  loader: glob({ pattern: '**/*.mdx', base: './src/content/case-studies' }),

  // The image() helper resolves frontmatter image paths against the entry's
  // folder and gives them the same optimization pipeline as <Image /> in
  // .astro files. Without it, Astro would treat hero_image as a plain string.
  schema: ({ image }) => z.object({

    // Display title for the case study page and any listing cards.
    title: z.string(),

    // Client name. Often the same as title for one-org projects; can differ
    // when the project covered just one program inside a larger organization.
    client: z.string(),

    // High-level industry bucket. Constrained to four buckets so listing
    // pages can filter cleanly. Add more values here when the work expands
    // into new sectors.
    sector: z.enum(['church', 'preschool', 'nonprofit', 'small-business']),

    // List of services delivered on the project. Free-form strings so we can
    // phrase them however reads best in context, but typical values are
    // 'Strategy', 'Web Design', 'Photography'.
    services: z.array(z.string()),

    // One-sentence pitch shown on listing cards and meta descriptions. Capped
    // at 200 chars so it stays comfortably inside title tags and og:description.
    summary: z.string().max(200),

    // Hero image at the top of the case study page. Resolved via image() so
    // Astro processes it (WebP conversion, srcset, dimensions) at build time.
    hero_image: image(),

    // Project year. Number, not string, so listings can sort numerically.
    year: z.number().int(),

    // Featured flag. When true, the homepage Selected Work section can pull
    // this entry to the top. Defaults to false so new entries are off the
    // homepage until explicitly promoted.
    featured: z.boolean().default(false),

    // Publish date. Drives ordering on the work index (newest first).
    published: z.date(),

  }),
});


/* ----------------------------------------------------------------------------
   Export the collections map
   ----------------------------------------------------------------------------
   Astro requires a single named export called `collections` whose keys
   become the collection names used in getCollection() and getEntry() calls.
   ---------------------------------------------------------------------------- */

export const collections = {
  'case-studies': caseStudies,
};
