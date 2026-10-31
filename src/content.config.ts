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

// A six-digit hex colour, e.g. '#a83c26'. Palettes stay plain hex so the
// contrast test (src/lib/case-palettes.test.ts) can measure them directly.
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a six-digit hex colour like #a83c26');

/* ----------------------------------------------------------------------------
   case-studies
   ----------------------------------------------------------------------------
   Long-form portfolio entries. Each entry is one .mdx file in
   src/content/case-studies/, named with the slug used in the URL
   (e.g. theology-matters.mdx -> /work/theology-matters/).
   ---------------------------------------------------------------------------- */

const caseStudies = defineCollection({
  // Load every .mdx file in src/content/case-studies/. Adding a new entry
  // is as simple as dropping in a new .mdx file with matching frontmatter.
  loader: glob({ pattern: '**/*.mdx', base: './src/content/case-studies' }),

  // image() resolves frontmatter image paths against the entry's folder
  // and gives them the same optimization pipeline as <Image /> in .astro
  // files. Without it, Astro would treat the field as a plain string.
  schema: ({ image }) =>
    z.object({
      // Display title for the case study page and any listing cards.
      title: z.string(),

      // Client name. Often the same as title for one-org projects; can
      // differ when the project covered just one program inside a larger
      // organization.
      client: z.string(),

      // High-level industry bucket. Constrained to a fixed set so listing
      // pages can filter cleanly. Add more values here when the work
      // expands into new sectors.
      sector: z.enum(['church', 'school', 'nonprofit', 'small-business']),

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

      // One-sentence pitch shown on listing cards (and the meta description
      // when metaDescription is absent).
      summary: z.string().max(200),

      // The search-result description for the study page (<meta name=
      // "description">, og:description and the CreativeWork description).
      // Written for a buyer, in first person, 120 to 160 characters so search
      // results show it whole. Optional: without it the page uses `summary`.
      metaDescription: z.string().min(120).max(160).optional(),

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

      // Featured flag. Unused since overhaul 2.2: the home's Selected work
      // now shows the three lowest `order` values instead. Kept so existing
      // frontmatter still validates.
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

      // Optional URL to the live, shipped site. When present, the case study
      // card and detail page link to it (the "Visit {domain}" button on the study).
      // For a web design portfolio this is the single strongest trust signal:
      // it lets a prospect click straight through to real, working proof.
      // Leave it off for work that is no longer live or not yours to link.
      liveUrl: z.string().url().optional(),

      // Optional one-line outcome. The honest, specific result of the project,
      // phrased as intent + qualitative change rather than an invented metric.
      // Surfaces as a highlighted line on the work index card, the homepage
      // Selected Work strip, and the top of the case study detail page, so the
      // proof-point reads at first scan instead of buried in the body. Capped
      // so it stays a single scannable line. Example: 'A quote-first flow that
      // sets the price before a customer spends a dollar.'
      outcome: z.string().max(160).optional(),

      // Optional client testimonials, as a list (First Baptist Muncie has two).
      // Each renders through Testimonial.astro after the study's results
      // ledger; a study without the field shows nothing. The homepage shows
      // one of them (src/pages/index.astro). Never fabricate one (CLAUDE.md
      // never-break rule 9): every quote is copied character for character
      // from the client's own email, recorded in the vault note
      // projects/ncs-testimonials.md, including the client's own punctuation.
      //   quote    the client's words, verbatim, without quote marks
      //   name     their name as they signed it (credentials included)
      //   title    their role and organisation as they signed it
      //   date     the day they wrote it (YYYY-MM-DD), the permission date
      //   context  optional: one plain line that frames the quote honestly,
      //            for example when it is about an earlier version of the site
      // src/lib/case-testimonials.test.ts checks the shape and which studies
      // carry one.
      testimonials: z
        .array(
          z.object({
            quote: z.string().min(1),
            name: z.string().min(1),
            title: z.string().min(1),
            date: z.date(),
            context: z.string().optional(),
          }),
        )
        .optional(),

      // Optional "what changed" results list. Each entry is a short, real outcome
      // of the project. Rendered by the detail page as a scannable ResultsBlock in
      // place of a prose "result" paragraph. HONESTY: only list changes the study
      // actually delivered; never invent a metric or outcome.
      results: z.array(z.string()).optional(),

      // Optional signed designer's note: a short (1-3 sentence) first-person
      // reflection from Nathan, rendered as a signed DesignerNote on the detail
      // page. Specific to the project and honest; the signature is added by the
      // component.
      designerNote: z.string().optional(),

      // ---- Overhaul content model (package 1.6) -------------------------
      // The fields below feed the redesigned reel, /work rows, title card,
      // Specimen strip and Up next loop. All optional so a new study builds
      // before it is fully dressed. Every value is copied from the client's
      // own shipped site; never invent one.

      // One line about the live site, in Nathan's plain voice. The homepage
      // hero reel shows it on hover and in the "Now showing" ticker
      // (src/data/reel.ts reads it from here), and the title card uses it
      // under the client name. Keep it TRUE: a real thing on the live site.
      hook: z.string().max(90).optional(),

      // Position in the study loop (1 = first). Matches the /work order, and
      // the Up next panel hands off to order + 1, wrapping at the end. Unique
      // per study; case-palettes.test.ts checks the set runs 1..n with no gaps.
      order: z.number().int().positive().optional(),

      // The client's colours and typeface, copied from the client repo's
      // shipped tokens (or sampled with getComputedStyle from the live site
      // when there is no repo). Used only for surfaces, rules, swatches and
      // non-text marks on this site, never for our body text.
      //   paper      the client's page ground
      //   ink        the client's body text colour (>= 4.5:1 on paper)
      //   accent     the client's accent, used for rules and marks (>= 3:1 on paper)
      //   accentInk  the text colour the client sets on accent (>= 4.5:1)
      //   markDark   optional: the swatch used for marks on this site's dark
      //              ink surface when `accent` is under 3:1 there. Always one
      //              of the client's own colours, never a tint made up here.
      //   dark       optional: ONLY where the client site really ships a dark
      //              theme (ruling 8: never invent one). accentInk is optional
      //              because some dark themes use the accent for decoration only.
      //   typeface   the client's real heading and body faces, e.g.
      //              'Fraunces / Source Sans 3' (heading first)
      //   swatches   the client's main colours, in display order
      // src/lib/case-palettes.test.ts checks every pair in both modes.
      palette: z
        .object({
          paper: hex,
          ink: hex,
          accent: hex,
          accentInk: hex,
          markDark: hex.optional(),
          dark: z
            .object({
              paper: hex,
              ink: hex,
              accent: hex,
              accentInk: hex.optional(),
            })
            .optional(),
          typeface: z.string(),
          swatches: z.array(hex).min(2).max(6),
        })
        .optional(),

      // Specific captures for the redesigned study page. Paths are relative
      // to the .mdx file, like `cover`. featureShot frames one feature,
      // beforeShot is the site before the project (only where one was
      // captured while the old site was live), mobileShot is the phone-width
      // capture written by `npm run capture:study`.
      featureShot: image().optional(),
      // Alt text for featureShot where it is shown ("The idea" band). Say what
      // the still shows on the live site. Falls back to a generic line.
      featureShotAlt: z.string().optional(),
      // ---- Interaction clip (package 3.5) --------------------------------
      // A few seconds of the live site in use, recorded by
      // `npm run capture:clips` into public/media/. When set, "The idea"
      // band shows the clip instead of featureShot (featureShot stays as the
      // still everywhere else).
      //   src  the base path the script prints, no extension, e.g.
      //        /media/mas-monograms-studio.c68efbbe (the .mp4, .webm and
      //        .webp poster share it)
      //   alt  what the clip shows, for screen readers
      signatureClip: z
        .object({
          src: z.string().regex(/^\/media\/[a-z0-9-]+\.[0-9a-f]{8}$/),
          alt: z.string().min(1),
        })
        .optional(),
      beforeShot: image().optional(),
      mobileShot: image().optional(),

      // ---- "What you edit" (package 3.6) --------------------------------
      // A screenshot of the site's own editor (Sanity Studio or wp-admin)
      // with a real page or post open, because a CMS that works well is part
      // of what I sell. Shot by Nathan with `npm run capture:cms` (he signs
      // in himself) to shots/{slug}-cms.png. Without cmsShot the study page
      // shows no "What you edit" band.
      //   cmsShot     the 1440x900 capture, relative to the .mdx like `cover`
      //   cmsShotAlt  required when cmsShot is set: what the screen shows,
      //               e.g. 'The Home page open in Sanity Studio'
      //   cmsName     the editor's name for the band's rail, e.g.
      //               'Sanity Studio' or 'WordPress'
      //   cmsUrl      optional: the editor's address for the frame's bar. Without
      //               it the frame shows liveUrl plus /studio (Sanity Studio) or
      //               /wp-admin (WordPress), from cmsFrame() in src/lib/study.ts
      // The pairing rule is cmsShotProblem() in src/lib/study.ts (tested):
      // /work/[slug].astro throws on it, so a cmsShot without its alt text
      // fails the build. (Not a superRefine here, which would re-indent
      // this whole schema and collide with every other edit to it.)
      cmsShot: image().optional(),
      cmsShotAlt: z.string().optional(),
      cmsName: z.string().optional(),
      cmsUrl: z.string().url().optional(),

      // Short facts for the study's fact row. Every key is optional; when a
      // key is missing, the page falls back to the matching top-level field
      // (sector, year, role, stack, and the host from liveUrl). Use it only
      // when the fact row should read differently from those fields, for
      // example year: '2024, rebuilt 2026'.
      facts: z
        .object({
          sector: z.string().optional(),
          year: z.string().optional(),
          role: z.string().optional(),
          stack: z.array(z.string()).optional(),
          host: z.string().optional(),
        })
        .optional(),
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

  schema: ({ image }) =>
    z.object({
      // Short display title for the photo (often the moment, not the
      // subject). Example: 'Sunday morning', 'Classroom light'.
      title: z.string(),

      // The image file itself. image() runs the asset through Astro's
      // optimization pipeline. The path in JSON is relative to the
      // entry's location: e.g. '../../assets/photography/<name>.jpg'.
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
  'case-studies': caseStudies,
  photos: photos,
  journal: journal,
};
