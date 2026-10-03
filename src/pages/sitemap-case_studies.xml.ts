// Safe to edit.
// Case-study sitemap, wrapping EmDash's own per-collection sitemap handler.
//
// Why a wrapper: EmDash builds sitemap URLs from the collection's URL pattern
// and drops the trailing slash (it only keeps it when Astro's global
// `trailingSlash: 'always'` is set, and that setting breaks EmDash's raw media
// route and the admin entry URL; tried and reverted 2026-10-02). Every canonical
// URL on this site ends in a slash (/work/reid-design/), so a slashless <loc>
// is a duplicate of the canonical page. This route calls the real handler, so
// noindex entries, drafts and the SEO-image extension still behave exactly as
// EmDash decides, then adds the slash to the case-study URLs only.
//
// A user-defined route wins over EmDash's injected /sitemap-[collection].xml,
// and @astrojs/sitemap's index already points at /sitemap-case_studies.xml.
import type { APIRoute } from 'astro';
import { GET as emdashCollectionSitemap } from 'emdash/internal/routes/sitemap-_collection_.xml';

export const prerender = false;

// Matches the end of a /work/<slug> URL that has no trailing slash.
const WORK_URL_NO_SLASH = /(\/work\/[^/<]+)(<\/loc>)/g;

export const GET: APIRoute = async (context) => {
  // The handler reads `params.collection`; this static route has no param, so
  // supply it.
  const res = await emdashCollectionSitemap({
    ...context,
    params: { collection: 'case_studies' },
  } as Parameters<APIRoute>[0]);

  // Pass errors and empty results through untouched.
  if (!res.ok) return res;

  const xml = (await res.text()).replace(WORK_URL_NO_SLASH, '$1/$2');
  return new Response(xml, { status: res.status, headers: res.headers });
};
