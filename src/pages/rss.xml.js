/* ============================================================================
   RSS feed endpoint
   ============================================================================
   Foundation, edit with care. Exposes /rss.xml for feed readers.

   Pulls every case study and every PUBLISHED journal entry from the EmDash CMS,
   sorts them newest first, and renders an Atom-flavored RSS 2.0 document. Each
   item links back to its detail page on the live site (so readers see the real
   article when they click, not a stripped-down feed-only view). A draft journal
   entry is never in the feed.

   scripts/generate-og.mjs reads this feed to learn the slugs and titles it makes
   OG cards for: /work/<slug>/ links are case studies, /journal/<slug>/ links are
   journal entries. Keep those two link shapes (CLAUDE.md, gotcha 13).

   Why .js rather than .ts: Astro's RSS helper expects a CommonJS-friendly
   export; .js keeps the type juggling out of the way.

   Server-rendered (EmDash content is read at request time) with a short CDN
   cache, so a published edit reaches feed readers within minutes. The item
   fields are identical to the old content-collection feed.
   ============================================================================ */

import rss from '@astrojs/rss';
import { getSite, SITE_URL } from '../data/site';
import { getCaseStudies } from '../lib/caseStudies';
import { getJournalEntries } from '../lib/journal';
import { PAGE_MAX_AGE, PAGE_SWR } from '../lib/routeCache';

export async function GET(context) {
  // Already sorted newest first by project date.
  const entries = await getCaseStudies(context.cache);
  // Published journal entries (a draft is never returned), newest first. [] today.
  const journal = await getJournalEntries({ cache: context.cache });
  // Feed title and description are fields in Site settings (CMS, with the fallback).
  const site = await getSite(context);
  // Same lifetime as the pages; the case-study tags set above purge it on publish.
  context.cache?.set?.({ maxAge: PAGE_MAX_AGE, swr: PAGE_SWR });

  // Case studies keep their order; journal entries are merged in by date only when
  // there are any, so a journal-less feed is byte-for-byte what it was before.
  const items = [
    ...entries.map((entry) => ({
      title: entry.title,
      pubDate: entry.published,
      description: entry.summary,
      // categories double as a hint for filtering in some feed readers.
      categories: [entry.sector, ...entry.services],
      link: `/work/${entry.id}/`,
    })),
    ...journal.map((post) => ({
      title: post.title,
      pubDate: post.publishedAt,
      description: post.summary,
      ...(post.tags.length > 0 ? { categories: post.tags } : {}),
      link: `/journal/${post.id}/`,
    })),
  ];
  if (journal.length > 0) items.sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf());

  const response = await rss({
    title: site.rssTitle,
    description: site.rssDescription,
    site: context.site ?? SITE_URL,

    items,

    customData: '<language>en-us</language>',
  });
  return response;
}
