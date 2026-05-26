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
   case-studies
   ----------------------------------------------------------------------------
   Long-form portfolio entries. Each entry is one .mdx file in
   src/content/case-studies/, named with the slug used in the URL
   (e.g. crestview-presbyterian.mdx -> /work/crestview-presbyterian/).
   ---------------------------------------------------------------------------- */

const caseStudies = defineCollection({

  // Load every .mdx file in src/content/case-studies/. Adding a new entry
  // is as simple as dropping in a new .mdx file with matching frontmatter.
  loader: glob({ pattern: '**/*.mdx', base: './src/content/case-studies' }),

  // image() resolves frontmatter image paths against the entry's folder
  // and gives them the same optimization pipeline as <Image /> in .astro
  // files. Without it, Astro would treat the field as a plain string.
  schema: ({ image }) => z.object({

    // Display title for the case study page and any listing cards.
    title: z.string(),

    // Client name. Often the same as title for one-org projects; can
    // differ when the project covered just one program inside a larger
    // organization.
    client: z.string(),

    // High-level industry bucket. Constrained to four buckets so listing
    // pages can filter cleanly. Add more values here when the work
    // expands into new sectors.
    sector: z.enum(['church', 'preschool', 'nonprofit', 'small-business']),

    // Services delivered on the project. Free-form strings so we can
    // phrase them however reads best in context. Typical values:
    // 'Strategy', 'Web Design', 'Photography'.
    services: z.array(z.string()),

    // Nathan's role on the project. Optional. Useful when a case study
    // wants to clarify whether he led design, code, photography, or
    // some combination. Example: 'Designer, Developer, Photographer'.
    role: z.string().optional(),

    // Optional tag chips for the case study card and detail page.
    // Shorter and more granular than services; good for surfacing
    // angles like 'Plan Your Visit', 'Brand refresh', 'Fundraising'.
    tags: z.array(z.string()).optional(),

    // One-sentence pitch shown on listing cards and meta descriptions.
    // Capped so it stays inside title tags and og:description.
    summary: z.string().max(200),

    // Optional longer-form description for the case study detail page,
    // a step bigger than the one-sentence summary. Caps at 500 chars
    // so it stays a paragraph, not a wall of text.
    description: z.string().max(500).optional(),

    // Cover image used on the work index card and at the top of the
    // case study detail page. Resolved via image() so Astro processes
    // it (WebP conversion, srcset, dimensions) at build time.
    //
    // Renamed from hero_image in Phase 5: same file, same role, but
    // a more general name that fits both the card and the detail use.
    cover: image(),

    // Project year. Number, not string, so listings can sort numerically.
    year: z.number().int(),

    // Featured flag. When true, the homepage Selected Work section can
    // pull this entry to the top. Defaults to false so new entries are
    // off the homepage until explicitly promoted.
    featured: z.boolean().default(false),

    // Publish date. Drives ordering on the work index (newest first).
    published: z.date(),

    // Optional last-updated date. Surfaces on the case study detail
    // page as "Updated <date>" so visitors know whether the work is
    // recent. Falls back to `published` when absent.
    updated: z.date().optional(),

    // Optional toolkit / stack list. Shown on the case study card hover
    // and inline at the top of the case study detail page when present.
    // Example: ['Astro', 'Tailwind', 'Cloudflare Pages'].
    stack: z.array(z.string()).optional(),

  }),
});


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
   ---------------------------------------------------------------------- */

const photos = defineCollection({

  loader: glob({ pattern: '**/*.json', base: './src/content/photos' }),

  schema: ({ image }) => z.object({

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

export const collections = {
  'case-studies': caseStudies,
  'photos':       photos,
};
