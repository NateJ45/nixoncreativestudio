// Safe to edit.
// Journal sitemap, wrapping EmDash's own per-collection sitemap handler (the same
// shape as sitemap-case_studies.xml.ts; read its header for the why).
//
// Two things this wrapper adds to the stock handler:
//   1. A trailing slash on every /journal/<slug> address. EmDash drops it, but every
//      canonical URL on this site ends in a slash, so a slashless <loc> would be a
//      duplicate of the canonical page.
//   2. A VALID EMPTY sitemap while nothing is published. The stock handler answers 404
//      for a collection with no published entries, and sitemap-index.xml (built by
//      @astrojs/sitemap, see astro.config.mjs) always lists this file, so a 404 would
//      hand Search Console a broken child sitemap for as long as the journal is empty.
//
// The stock handler lists published entries only (a draft never appears) and skips
// entries marked "do not index" in the SEO panel. It needs the `seo` support and the
// `/journal/{slug}/` URL pattern on the `posts` collection (cms/schema/posts.mjs); until
// the schema is applied in production this route simply returns the empty sitemap.
//
// A user-defined route wins over EmDash's injected /sitemap-[collection].xml.
import type { APIRoute } from 'astro';
import { GET as emdashCollectionSitemap } from 'emdash/internal/routes/sitemap-_collection_.xml';

// Matches the end of a /journal/<slug> URL that has no trailing slash.
const JOURNAL_URL_NO_SLASH = /(\/journal\/[^/<]+)(<\/loc>)/g;

const EMPTY_SITEMAP =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>\n';

const emptyResponse = () =>
  new Response(EMPTY_SITEMAP, {
    status: 200,
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });

export const GET: APIRoute = async (context) => {
  try {
    const res = await emdashCollectionSitemap({
      ...context,
      params: { collection: 'posts' },
    } as Parameters<APIRoute>[0]);

    // 404 is "collection not found or empty"; any other failure also reads as empty
    // rather than putting an error in the sitemap index.
    if (!res.ok) {
      if (res.status !== 404) console.error(`[sitemap-posts] handler answered ${res.status}`);
      return emptyResponse();
    }

    const xml = (await res.text()).replace(JOURNAL_URL_NO_SLASH, '$1/$2');
    return new Response(xml, { status: res.status, headers: res.headers });
  } catch (error) {
    console.error('[sitemap-posts] could not build the journal sitemap; serving it empty', error);
    return emptyResponse();
  }
};
