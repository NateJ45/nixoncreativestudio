/* ============================================================================
   coverPlaceholder
   ============================================================================
   Foundation, edit with care.

   Lookup helper for case study cover blur previews. The data itself is
   generated at build time by scripts/generate-placeholders.mjs, which
   reads the source images and bakes a tiny base64 PNG per cover into
   src/lib/coverPlaceholders.json. This file just exposes a typed
   accessor so pages can read the value without thinking about JSON
   shape.

   The work happens out-of-process because Astro pages render inside the
   Cloudflare Pages prerender worker, which runs in a V8 isolate without
   node:fs. Plaiceholder needs fs to read image bytes, so the only place
   it can run safely is Node, before Astro starts building. The pre-build
   script handles that; pages just look up the result here.

   Convention: cover filename matches the case study slug (the .mdx
   filename without extension). See scripts/generate-placeholders.mjs
   for the full convention.
   ============================================================================ */

// The `with { type: 'json' }` attribute is required by Node's native ESM
// loader (used by the test runner) and is equally accepted by Vite during the
// Astro build, so this one import works in both places.
import placeholders from './coverPlaceholders.json' with { type: 'json' };

const map = placeholders as Record<string, string>;

/**
 * Return the base64 blur preview for the given case study slug, or
 * undefined when the slug doesn't have one. CaseStudyCover falls back
 * to its bg-bg-soft solid placeholder in that case.
 */
export function getCoverPlaceholder(slug: string): string | undefined {
  return map[slug];
}
