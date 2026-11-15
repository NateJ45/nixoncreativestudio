/* ============================================================================
   /peek.json | What the link previews and the command palette know
   ============================================================================
   One small file, written at build time and fetched the first time a visitor
   reaches for a link preview (src/scripts/peek.js) or opens the palette
   (src/scripts/palette.js). Nothing here is loaded with a page.

   Everything is read from the same sources the pages use, so a preview can
   never say something its page does not:
     - the clients from the case study frontmatter (src/lib/clients.ts)
     - the three starting prices from src/data/pricing.ts
     - the journal posts from the journal collection (drafts never ship)
     - the pages from the same gates the dock and the closing read

   Keys are short on purpose: this is fetched by people on phones too.
   ============================================================================ */

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { site } from '../data/site';
import { getClients } from '../lib/clients';
import { getGatedNav } from '../data/nav';
import { pricesAsOf, webTiers } from '../data/pricing';
import { SECTOR_PAGES } from '../data/sector-pages';
import { clusterLabel, newestFirst } from '../lib/journal';
import { money } from '../lib/money';
import { readingTime } from '../lib/readingTime';

// Static endpoint: written to dist as a plain file at build time.
export const prerender = true;

export const GET: APIRoute = async () => {
  const clients = await getClients();
  const gated = await getGatedNav();
  // The same filter as the journal index: drafts show in dev and never in a production build.
  const posts = newestFirst(
    await getCollection('journal', ({ data }) =>
      import.meta.env.PROD ? data.draft !== true : true,
    ),
  );

  const body = {
    // Case studies by slug, in deck order. `still` is the 320px phone capture the cards already
    // use, so a preview costs about as much as one small picture.
    work: Object.fromEntries(
      clients.map((c) => [
        c.slug,
        {
          name: c.name,
          sector: c.sector,
          outcome: c.outcome,
          host: c.host,
          c: c.accent,
          p: c.paper,
          still: `/assets/${c.slug}-m-320.webp`,
        },
      ]),
    ),
    // The three starting prices, exactly as the price hand prints them.
    prices: {
      asOf: pricesAsOf,
      tiers: webTiers.map((t) => ({
        name: t.name,
        from: money(t.priceFrom),
        who: t.who,
        href: `/services/#${t.name.toLowerCase()}`,
      })),
    },
    // Journal posts by slug, newest first.
    posts: Object.fromEntries(
      posts.map((e) => [
        e.id,
        {
          title: e.data.title,
          cluster: clusterLabel(e.data.cluster),
          min: readingTime(e.body ?? ''),
        },
      ]),
    ),
    // The palette's pages. `k` is extra words a search should find the page by.
    pages: [
      { t: 'Home', href: '/', k: 'start front' },
      { t: 'Work', href: '/work/', k: 'case studies portfolio clients sites' },
      { t: 'Prices', href: '/services/', k: 'services cost pricing tiers care hosting' },
      { t: 'About', href: '/about/', k: 'nathan nixon who bio' },
      { t: 'Start a project', href: '/contact/', k: 'contact form hire quote' },
      { t: "What I'm doing now", href: '/now/', k: 'now current' },
      { t: 'The one-page summary', href: '/one-page/', k: 'board committee print forward' },
      ...gated.map((l) => ({
        t: l.label,
        href: l.href,
        k: l.href === '/journal/' ? 'blog posts writing articles' : 'photos photographs films',
      })),
      { t: 'How this site is built', href: '/colophon/', k: 'colophon stack astro' },
      { t: 'Accessibility', href: '/accessibility/', k: 'wcag a11y statement' },
      { t: 'Privacy', href: '/privacy/', k: 'data cookies analytics' },
    ],
    // The sector pages, under "Websites for".
    sectors: SECTOR_PAGES.map((s) => ({ t: s.label, href: `/${s.path}/` })),
    // What the palette's actions need. All of it is already printed on every page.
    me: {
      email: site.email,
      emailHref: site.emailHref,
      phone: site.phone,
      smsHref: site.smsHref,
    },
  };

  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
