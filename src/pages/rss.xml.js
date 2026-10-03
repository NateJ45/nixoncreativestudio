/* ============================================================================
   RSS feed endpoint
   ============================================================================
   Foundation, edit with care. Exposes /rss.xml for feed readers.

   Pulls every case study from the EmDash CMS, sorts newest first,
   and renders an Atom-flavored RSS 2.0 document. Each item links back to
   its detail page on the live site (so readers see the real article
   when they click, not a stripped-down feed-only view).

   Why .js rather than .ts: Astro's RSS helper expects a CommonJS-friendly
   export; .js keeps the type juggling out of the way.

   Server-rendered (EmDash content is read at request time) with a short CDN
   cache, so a published edit reaches feed readers within minutes. The item
   fields are identical to the old content-collection feed.
   ============================================================================ */

import rss from '@astrojs/rss';
import { getSite, SITE_URL } from '../data/site';
import { getCaseStudies } from '../lib/caseStudies';
import { PAGE_MAX_AGE, PAGE_SWR } from '../lib/routeCache';

export async function GET(context) {
  // Already sorted newest first by project date.
  const entries = await getCaseStudies(context.cache);
  // Feed title and description are fields in Site settings (CMS, with the fallback).
  const site = await getSite(context);
  // Same lifetime as the pages; the case-study tags set above purge it on publish.
  context.cache?.set?.({ maxAge: PAGE_MAX_AGE, swr: PAGE_SWR });

  const response = await rss({
    title: site.rssTitle,
    description: site.rssDescription,
    site: context.site ?? SITE_URL,

    items: entries.map((entry) => ({
      title: entry.title,
      pubDate: entry.published,
      description: entry.summary,
      // categories double as a hint for filtering in some feed readers.
      categories: [entry.sector, ...entry.services],
      link: `/work/${entry.id}/`,
    })),

    customData: '<language>en-us</language>',
  });
  return response;
}
