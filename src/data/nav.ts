/* ============================================================================
   Gated links
   ============================================================================
   The dock (src/components/Dock.astro) is the fixed menu: Work, Prices, About,
   Start a project. Two more pages exist and are gated at build time, so a link
   never points at an empty page. When open, they join the closing's site index.

     Journal       only when at least one entry is published. Same filter as
                   the journal index: drafts are hidden in production builds
                   and shown in `npm run dev`.
     Photography   only when the photos collection holds MIN_PHOTOS or more
                   real photographs. The rule lives in
                   src/data/photography-gate.ts, which the page and the sitemap
                   filter in astro.config.mjs read too, so the three never
                   disagree. Ungating: docs/PENDING.md.

   Every href ends in a slash: the site builds with trailingSlash 'always', and a
   slashless internal link is a redirect hop (npm run check:slashes).
   ============================================================================ */

import { getCollection } from 'astro:content';
import { MIN_PHOTOS, photographyOpen } from './photography-gate';

export { MIN_PHOTOS };

export interface NavLink {
  label: string;
  /** Root-relative, always with a trailing slash. */
  href: string;
}

const JOURNAL: NavLink = { label: 'Journal', href: '/journal/' };
const PHOTOGRAPHY: NavLink = { label: 'Photography', href: '/photography/' };

async function journalCount(): Promise<number> {
  const entries = await getCollection('journal', ({ data }) =>
    import.meta.env.PROD ? data.draft !== true : true,
  );
  return entries.length;
}

export async function photoCount(): Promise<number> {
  return (await getCollection('photos')).length;
}

/** The pages that have earned a link. Empty today. */
export async function getGatedNav(): Promise<NavLink[]> {
  const [journal, photos] = await Promise.all([journalCount(), photoCount()]);
  return [...(photographyOpen(photos) ? [PHOTOGRAPHY] : []), ...(journal > 0 ? [JOURNAL] : [])];
}
