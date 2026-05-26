/* ============================================================================
   RSS feed endpoint
   ============================================================================
   Foundation, edit with care. Exposes /rss.xml for feed readers.

   Pulls every case study from the content collection, sorts newest first,
   and renders an Atom-flavored RSS 2.0 document. Each item links back to
   its detail page on the live site (so readers see the real article
   when they click, not a stripped-down feed-only view).

   Why .js rather than .ts: Astro's RSS helper expects a CommonJS-friendly
   export; .js keeps the type juggling out of the way. The schema is
   typed via the content collection import anyway.
   ============================================================================ */

import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { site } from '../data/site';

// Static endpoint: prerendered at build time, served as a static file.
// Without this, output:'static' projects with the Cloudflare adapter
// would treat the endpoint as a function and refuse to prerender it.
export const prerender = true;

export async function GET(context) {
  const entries = (await getCollection('case-studies')).sort(
    (a, b) => b.data.published.valueOf() - a.data.published.valueOf()
  );

  return rss({
    title:       `${site.studioName} — Case Studies`,
    description: site.tagline,
    site:        context.site ?? site.url,

    items: entries.map((entry) => ({
      title:       entry.data.title,
      pubDate:     entry.data.published,
      description: entry.data.summary,
      // categories double as a hint for filtering in some feed readers.
      categories:  [entry.data.sector, ...entry.data.services],
      link:        `/work/${entry.id}/`,
    })),

    customData: '<language>en-us</language>',
  });
}
