// Safe to edit. The copy for each sector page lives here; the page itself is
// src/pages/[sector].astro, and every study, count and quote on it is read
// from the case-studies collection.
/* ============================================================================
   Sector pages (overhaul package 4.2)
   ============================================================================
   One template, src/pages/[sector].astro, builds a page per entry below:
   /churches/ today. Its getStaticPaths emits ONLY the sectors listed here, so
   this list is the allow-list. Every other sector keeps /work/?sector=… (the
   filtered work index) until it gets an entry.

   Why only churches: a sector page with one or two studies and copy borrowed
   from /services is a thin page (overhaul ruling 19). Nathan cleared
   /churches/ on 2026-10-31 with today's church studies, since more are on
   the way (plan Part A, decision 11). Nonprofits, schools and small business
   still need copy of their own.

   To add a sector (say nonprofits):
     1. Write its copy as a new entry below: path 'nonprofits', sector
        'nonprofit', and its own H1, lede, points and description. Draw every
        claim from that sector's studies and /services. No invented counts,
        results or quotes (CLAUDE.md never-break rule 9).
     2. Add '/nonprofits' to tests/routes.ts, and a jsonLd line for it in
        tests/page-weight.config.json if you want its types pinned.
     3. Add its OG card title to STATIC_PAGES in scripts/generate-og.mjs.
     That is all: the /work filter and the sector crumb on each study of that
     sector pick up the new page through sectorPagePath() below.

   Copy rules: first person singular, no em dashes, no counts typed into the
   prose (the template computes them), and names of clients only where the
   study cards below the points can back them up.
   ============================================================================ */

export interface SectorPoint {
  /** A short H3, sentence case. */
  title: string;
  body: string;
}

export interface SectorPage {
  /** The URL segment, plural: /churches/. */
  path: string;
  /** The case-study `sector` value this page collects. */
  sector: 'church' | 'school' | 'nonprofit' | 'small-business';
  /** The <title>, before " | Nixon Creative Studio". Keep the whole title under 60 characters. */
  title: string;
  /** Meta description, 110 to 160 characters. `{n}` becomes the study count. */
  description: string;
  /** The rail label and breadcrumb name. */
  label: string;
  /** The H1: a light lead, then the heavy phrase (the page's one Heft). */
  h1: { lead: string; heavy: string };
  lede: string;
  /** The H2 over the points: a light lead and a heavy end, in a <b>. */
  pointsHeading: { lead: string; heavy: string };
  points: SectorPoint[];
  /** The study and the signer whose quote the page shows. If either goes
      missing, the page falls back to the first quote on any study in the
      sector, and to no quote at all if there is none. */
  quote?: { study: string; name: string };
}

export const SECTOR_PAGES: SectorPage[] = [
  {
    path: 'churches',
    sector: 'church',
    title: 'Church websites',
    description:
      'Church websites I designed and built: a clear first Sunday for visitors, and pages the staff keep current themselves. See the {n} church sites live today.',
    label: 'Churches',
    h1: { lead: 'Church websites, starting with', heavy: 'the first Sunday.' },
    lede: 'Every church site I build starts with the person who has never been inside: when the service is, how to get there, and what happens when they walk in. Then it has to work for the people who keep it running, so the staff can post the week’s news without waiting on a developer.',
    pointsHeading: { lead: 'What a church site', heavy: 'has to do' },
    points: [
      {
        title: 'Make the first visit easy',
        body: 'A first-time visitor should know the time, the place and how the morning runs before they arrive. So the service times, the address and a plain what-to-expect page come first, ahead of everything the members already know.',
      },
      {
        title: 'Let the staff run it',
        body: 'I match the platform to whoever keeps the site up after launch: a custom build with an editing studio and a live preview for one church, Wix for another whose communications team wanted to own every page. Either way, the bulletin, the events and the news go up without me.',
      },
      {
        title: 'Cover the rest of the week',
        body: 'A church building is busy all week, and a church has a history worth keeping. On the sites below that meant one form for booking the building, a page about the building itself, and an old blog brought across with every post at its address.',
      },
      {
        title: 'Open to everyone',
        body: 'Every page I build is checked against WCAG AA, and that work is part of the price, not an upsell. For a church it is simply the right thing to do.',
      },
    ],
    quote: { study: 'first-baptist-muncie', name: 'Kendall Ellis, M.Div., MSW' },
  },
];

/** The sector page for a case-study sector ('church' -> '/churches/'), or
    undefined while that sector has no page (it uses /work/?sector= instead). */
export function sectorPagePath(sector: string): string | undefined {
  const page = SECTOR_PAGES.find((p) => p.sector === sector);
  return page ? `/${page.path}/` : undefined;
}
