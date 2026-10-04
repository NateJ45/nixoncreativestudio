/* ============================================================================
   homeWork (what the homepage shows as work: the hero reel and the proof sheet)
   ============================================================================
   Safe to edit.

   The homepage shows client work twice, both as real screenshots bundled in
   src/assets/home/ (captured by scripts/brand/capture-home-reel.mjs):

     REEL   the hero carousel: ten browser frames from five sites, two pages each.
     SHEET  the "proof sheet" work band: one film strip per live site, with a short
            note and the facts printed on the film edge.

   The pictures and the art direction (which page, which crop, which caption) are
   curated here, in code. Whether a site may appear at all is the CMS's call, read
   from the case studies (src/lib/caseStudies.ts) through two rules:

     - The honesty rule (launch_status). A slide or job whose case study is not live
       is dropped. The one exception is a slide marked `soon`: it shows a finished
       build that is not on its own domain yet (FBCM), so it needs the study to be
       "Launching soon", and it is labelled as such, never linked as live.
     - Curation (featured). The proof sheet only shows a site whose case study is
       ticked "Featured". The reel does not need it (FBCM is not featured).

   When the CMS has no row for a site (local dev, where D1 is empty, and the CI
   dataset, which carries three other studies), the bundled entry stands: every
   site listed here was checked live on 2026-10-04. The "Read the case study" link
   only appears when the study exists, so it never points at a 404.

   Every fact in a caption or note is one D's copy audit marked proven
   (docs/redesign-2026/D-copy-positioning.md, the claims table). Do not add a number
   that is not on that list.

   Pure (type-only imports) so src/lib/homeWork.test.ts runs it under plain Node.
   ============================================================================ */

import type { LaunchStatus } from './launchStatus.ts';

/** One frame on the hero reel. `id` names the image pair in src/assets/home/reel/. */
export interface ReelSlide {
  id: string;
  /** Case study slug (the CMS row that gates it). */
  study: string;
  site: string;
  page: string;
  /** Address shown in the frame's chrome bar (host and path, no scheme). */
  host: string;
  /** The live page; undefined for a launching-soon build (never linked as live). */
  url?: string;
  /** A finished build waiting for its domain: labelled "Launching soon". */
  soon?: boolean;
  /** One checkable sentence under the centre frame. */
  fact: string;
  alt: string;
}

/**
 * The reel, in order. It opens on Stone Steps (REEL_START), the lead case study; the new
 * First Baptist Muncie build comes second, right beside it, as the church proof (Nathan,
 * 2026-10-04); then Foundation for Reformed Theology, Theology Matters, MAS Monograms and
 * FBCM's second page. The other sites' second pages sit to the left, so the fan has frames
 * on both sides from the first paint.
 */
export const REEL: ReelSlide[] = [
  {
    id: 'mas-about',
    study: 'mas-monograms',
    site: 'MAS Monograms',
    page: 'About Mary Ann',
    host: 'mas-monograms.com/about',
    url: 'https://mas-monograms.com/about',
    fact: 'A one-woman embroidery studio in St. Matthews, South Carolina.',
    alt: 'The MAS Monograms about page: The person behind every stitch, a one-woman home embroidery studio.',
  },
  {
    id: 'tm-article',
    study: 'theology-matters',
    site: 'Theology Matters',
    page: 'An article',
    host: 'theologymatters.com/articles',
    url: 'https://theologymatters.com/articles/the-nicene-creed-in-historical-context/',
    fact: '149 of its 154 articles link back to the printed issue they first appeared in.',
    alt: 'A Theology Matters article page: The Nicene Creed in Historical Context, set in a large serif with an italic summary.',
  },
  {
    id: 'frt-res',
    study: 'foundation-for-reformed-theology',
    site: 'Foundation for Reformed Theology',
    page: 'The library',
    host: 'foundationrt.org/resources',
    url: 'https://foundationrt.org/resources/',
    fact: 'Decades of sermons, lectures and bibliographies, gathered into one library.',
    alt: 'The Foundation for Reformed Theology library page: bibliographies and John Calvin studies, each with a short description and a list of the latest additions.',
  },
  {
    id: 'ss-records',
    study: 'stone-steps-50k',
    site: 'Stone Steps 50K',
    page: 'The records',
    host: 'stonesteps50k.com/records',
    url: 'https://stonesteps50k.com/records',
    fact: 'Results arrive the morning after each race, with nobody typing them in.',
    alt: 'The Stone Steps records page: Twenty-plus years of fast days, with a photograph of two runners racing through autumn woods.',
  },
  {
    id: 'ss-home',
    study: 'stone-steps-50k',
    site: 'Stone Steps 50K',
    page: 'Home page',
    host: 'stonesteps50k.com',
    url: 'https://stonesteps50k.com/',
    fact: '2,188 finishes on file, 2003 to 2025. Every course record is worked out from them.',
    alt: 'The Stone Steps 50K home page: the race name in large stamped letters, the race date, and a photograph of a runner on a wooded trail.',
  },
  {
    id: 'fbcm-home',
    study: 'first-baptist-muncie',
    site: 'First Baptist Church, Muncie',
    page: 'Home page',
    host: 'New site, not yet on its domain',
    soon: true,
    fact: 'A finished church site, every page filled in. It goes live when the church moves its address over.',
    alt: 'The new First Baptist Church of Muncie home page: Praise and Proclaim, set in capitals over a photograph of the worship band, with the Sunday service time and address.',
  },
  {
    id: 'frt-home',
    study: 'foundation-for-reformed-theology',
    site: 'Foundation for Reformed Theology',
    page: 'Home page',
    host: 'foundationrt.org',
    url: 'https://foundationrt.org/',
    fact: 'It scores 100 on all four of Google’s Lighthouse checks on a phone (September 2026).',
    alt: 'The Foundation for Reformed Theology home page: the serif headline Recovering the historic faith of the church, beside an archival black-and-white photograph of the founder at his bookshelves.',
  },
  {
    id: 'tm-home',
    study: 'theology-matters',
    site: 'Theology Matters',
    page: 'Home page',
    host: 'theologymatters.com',
    url: 'https://theologymatters.com/',
    fact: 'A theology journal, Volume 32. Every article has a listen-along audio version.',
    alt: "The Theology Matters home page: the journal's script masthead, the featured essay with an illuminated painting, and the current issue.",
  },
  {
    id: 'mas-home',
    study: 'mas-monograms',
    site: 'MAS Monograms',
    page: 'Home page',
    host: 'mas-monograms.com',
    url: 'https://mas-monograms.com/',
    fact: 'Mary Ann edits it herself, page by page, with no monthly platform fee.',
    alt: 'The MAS Monograms home page on deep blue: Custom monogramming, made just for you, beside photographs of a monogrammed tote, a towel and a stitched name.',
  },
  {
    id: 'fbcm-expect',
    study: 'first-baptist-muncie',
    site: 'First Baptist Church, Muncie',
    page: 'What to expect',
    host: 'New site, not yet on its domain',
    soon: true,
    fact: 'Sunday times set like a hymn board, photos framed in the church’s own arches.',
    alt: 'The What to Expect band on deep brown: photographs of a church supper and two children framed in arched shapes, beside a hymn board of Sunday times.',
  },
];

/** The slide the reel opens on (Stone Steps home page). */
export const REEL_START_ID = 'ss-home';

/** One film strip in the proof sheet. Frame `img` names a file in src/assets/home/sheet/. */
export interface SheetFrame {
  img: string;
  alt: string;
  caption: string;
  /** The china-marker loop round the keeper (one per strip). */
  pick?: boolean;
  /** Relative width of this frame in the strip at desktop (flex-grow). */
  grow?: number;
}

export interface SheetJob {
  study: string;
  name: string;
  /** The italic line under the name. */
  kind: string;
  /** Facts printed on the film edge (real, checkable, short). */
  edge: string[];
  frames: SheetFrame[];
  /** Two short paragraphs: what was done, then one proven fact. */
  note: string;
  fact: string;
  url: string;
  host: string;
}

/** The proof sheet, in order. Stone Steps leads (the lead case study). */
export const SHEET: SheetJob[] = [
  {
    study: 'stone-steps-50k',
    name: 'Stone Steps 50K',
    kind: 'A trail race in Mt. Airy Forest, Cincinnati',
    edge: ['Stone Steps 50K', 'Cincinnati OH', '2026', 'stonesteps50k.com'],
    frames: [
      {
        img: 'ss-elev',
        alt: 'Elevation chart from the Stone Steps site: about 5,200 feet of climbing across seven loops, with an aid station marked at the end of each loop.',
        caption: 'The climbing, measured from USGS survey data',
        pick: true,
        grow: 1,
      },
      {
        img: 'ss-records',
        alt: "The records board: men's and women's course records for the 50K and 27K, with times and years.",
        caption: 'The records board, built from the results',
        grow: 1,
      },
    ],
    note: 'The old site said 10,726 feet of climbing. I measured the course against USGS elevation data and it is about 5,200, so that is what the chart says now.',
    fact: 'Twelve marks that no finish could prove came off the records board until the race director can find the results behind them.',
    url: 'https://stonesteps50k.com/',
    host: 'stonesteps50k.com',
  },
  {
    study: 'foundation-for-reformed-theology',
    name: 'Foundation for Reformed Theology',
    kind: 'A ministry to working pastors',
    edge: ['Foundation for Reformed Theology', 'foundationrt.org', 'Home and library'],
    frames: [
      {
        img: 'frt',
        alt: 'The Foundation for Reformed Theology home page: a serif headline, Recovering the historic faith of the church, beside an archival black-and-white photograph of a scholar in his study.',
        caption: 'Home page, desktop',
        grow: 1.65,
      },
      {
        img: 'frt-library',
        alt: 'The resources section: bibliographies, John Calvin studies, foundation publications, sermons and lectures, and worship leadership, each with a one-line description.',
        caption: 'The library, by kind of resource',
        pick: true,
        grow: 1,
      },
    ],
    note: 'Decades of sermons, lectures, bibliographies and seminar material, gathered into one library you can search and browse by topic.',
    fact: 'It scores 100 on all four of Google’s Lighthouse checks on a phone (speed, accessibility, best practices and search), measured September 2026.',
    url: 'https://foundationrt.org/',
    host: 'foundationrt.org',
  },
  {
    study: 'theology-matters',
    name: 'Theology Matters',
    kind: 'A theology journal, Volume 32',
    edge: ['Theology Matters', 'Winter 2026 issue', 'theologymatters.com'],
    frames: [
      {
        img: 'tm',
        alt: "The Theology Matters home page: the journal's script masthead, the featured essay with an illuminated image, and the current issue set as a printed cover.",
        caption: 'Home page, desktop',
        grow: 1.6,
      },
      {
        img: 'tm-article',
        alt: 'An article page from Theology Matters, set in a large serif with an italic summary.',
        caption: 'An article page',
        pick: true,
        grow: 1,
      },
    ],
    note: 'Every article has an audio version, so the journal can be listened to as well as read.',
    fact: '149 of its 154 articles link back to the print edition they first appeared in.',
    url: 'https://theologymatters.com/',
    host: 'theologymatters.com',
  },
  {
    study: 'mas-monograms',
    name: 'MAS Monograms',
    kind: 'Mary Ann’s embroidery shop',
    edge: ['MAS Monograms', 'St. Matthews SC', 'mas-monograms.com'],
    frames: [
      {
        img: 'mas-mobile',
        alt: 'The MAS Monograms home page on a phone.',
        caption: 'Home page, phone',
        grow: 0.42,
      },
      {
        img: 'mas',
        alt: "The MAS Monograms home page on deep indigo: Custom monogramming, made just for you, beside stitched photographs of a monogrammed tote, a towel and a child's name on a pillow.",
        caption: 'Home page, desktop',
        grow: 1.15,
      },
      {
        img: 'mas-maker',
        alt: "Mary Ann at her desk, beside the heading Hi, I'm Mary Ann, and a short note that every order comes straight to her.",
        caption: 'Meet the maker',
        pick: true,
        grow: 1,
      },
    ],
    note: 'Moved off Squarespace onto a site Mary Ann edits herself, page by page, with no monthly platform fee.',
    fact: 'Quotes come in through a short form instead of a cart, because for handmade embroidery that is still the honest way to set a price.',
    url: 'https://mas-monograms.com/',
    host: 'mas-monograms.com',
  },
];

/** What the gate needs from a case study (a structural subset of CaseStudy). */
export interface StudyGate {
  id: string;
  featured: boolean;
  launchStatus: LaunchStatus;
}

/**
 * The reel slides the CMS allows, in order. A slide whose study is in the CMS must be live,
 * or, for a `soon` slide, launching soon. A slide with no CMS row stands (see the header).
 */
export function gateReel(slides: ReelSlide[], studies: StudyGate[]): ReelSlide[] {
  const byId = new Map(studies.map((s) => [s.id, s]));
  return slides.filter((slide) => {
    const s = byId.get(slide.study);
    if (!s) return true;
    return slide.soon ? s.launchStatus === 'launching-soon' : s.launchStatus === 'live';
  });
}

/** A proof-sheet job plus whether its case study page exists (so the link is safe). */
export interface GatedJob extends SheetJob {
  caseStudyHref?: string;
}

/**
 * The proof-sheet jobs the CMS allows: a job whose study is in the CMS must be live AND
 * featured; one with no row stands, without a case-study link.
 */
export function gateSheet(jobs: SheetJob[], studies: StudyGate[]): GatedJob[] {
  const byId = new Map(studies.map((s) => [s.id, s]));
  const out: GatedJob[] = [];
  for (const job of jobs) {
    const s = byId.get(job.study);
    if (!s) {
      out.push({ ...job });
      continue;
    }
    if (s.launchStatus !== 'live' || !s.featured) continue;
    out.push({ ...job, caseStudyHref: `/work/${s.id}/` });
  }
  return out;
}

/**
 * Split a headline into the Bebas part and the italic "voice" turn (DESIGN.md: every big
 * headline turns into the italic for its last phrase). The turn starts after the first
 * sentence break ("The proof sheet. Every one is live today."), else after the last comma
 * ("What it costs, before you ask."), else on the last four words of a long line ("Let's
 * build a site you won't have to redo."). A short line with no break stays all caps.
 */
export function splitVoice(text: string): { lead: string; voice: string } {
  const t = text.trim();
  const sentence = t.search(/[.!?:]\s+\S/);
  if (sentence > 0) return { lead: t.slice(0, sentence + 1), voice: t.slice(sentence + 1).trim() };
  const comma = t.lastIndexOf(', ');
  if (comma > 0) return { lead: t.slice(0, comma + 1), voice: t.slice(comma + 1).trim() };
  const words = t.split(/\s+/);
  if (words.length >= 7) {
    return { lead: words.slice(0, -4).join(' '), voice: words.slice(-4).join(' ') };
  }
  return { lead: t, voice: '' };
}
