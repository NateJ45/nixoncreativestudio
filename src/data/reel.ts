// Safe to edit.
/* ============================================================================
   Hero reel: which client sites scroll past in the homepage hero
   ============================================================================
   The hero's right side is a tilted wall of real client sites, drifting in
   columns. Each site needs two captures in src/assets/reel/:

     {slug}-desktop.jpg   600 x 1240, the top of the homepage at 1440 wide
     {slug}-phone.jpg     300 x 840, the top of the homepage at 390 wide

   Re-shoot them all from the live sites with:  node scripts/capture-reel.mjs
   (the script reads this file's `reelSites`, so add a site here first).

   `feature` is the one line shown when a visitor hovers that site's card and
   in the "Now showing" ticker under the CTAs. Keep it TRUE: a real, live
   thing on that site (the case study's outcome line is a safe source).
   ============================================================================ */

export interface ReelSite {
  /** Matches the case study slug, so the card links to /work/{slug}/. */
  slug: string;
  /** Client name, shown in the ticker. */
  name: string;
  /** The live homepage the capture script photographs. */
  url: string;
  /** Short host shown in the card's address bar. */
  host: string;
  /** One true, specific thing about this site. */
  feature: string;
}

export const reelSites: ReelSite[] = [
  {
    slug: 'stone-steps-50k',
    name: 'Stone Steps 50K',
    url: 'https://stonesteps50k.com/',
    host: 'stonesteps50k.com',
    feature: 'Records calculated from every finish since 2003',
  },
  {
    slug: 'mas-monograms',
    name: 'MAS Monograms',
    url: 'https://mas-monograms.com/',
    host: 'mas-monograms.com',
    feature: 'Try your own initials right in the hero',
  },
  {
    slug: 'presbyterian-academy',
    name: 'The Presbyterian Academy',
    url: 'https://www.presbyterianacademy.org/',
    host: 'presbyterianacademy.org',
    feature: 'A term catalog, laid out like one',
  },
  {
    slug: 'theology-matters',
    name: 'Theology Matters',
    url: 'https://theologymatters.com/',
    host: 'theologymatters.com',
    feature: 'Audio on every article',
  },
  {
    slug: 'reid-design',
    name: 'Reid Design',
    url: 'https://www.reiddesignllc.com/',
    host: 'reiddesignllc.com',
    feature: 'The plan and the price before anything is ordered',
  },
  {
    slug: 'foundation-for-reformed-theology',
    name: 'Foundation for Reformed Theology',
    url: 'https://foundationrt.org/',
    host: 'foundationrt.org',
    feature: 'A scholarly library the staff maintain themselves',
  },
  {
    slug: 'first-baptist-muncie',
    name: 'First Baptist Church Muncie',
    url: 'https://www.fbcmuncie.org/',
    host: 'fbcmuncie.org',
    feature: 'Every ministry given a home of its own',
  },
];

/* The wall itself: five columns, alternating direction, each at its own
   speed so the movement never lines up. `kind` picks the desktop or phone
   capture. `offset` staggers where each column starts (rem) so the cards
   don't sit in a neat row. The fifth column is hidden on phones. */
export interface ReelColumn {
  kind: 'desktop' | 'phone';
  slugs: string[];
  /** Seconds for one full loop. Bigger is slower. */
  seconds: number;
  direction: 'up' | 'down';
  offset: number;
}

export const reelColumns: ReelColumn[] = [
  {
    kind: 'phone',
    slugs: ['mas-monograms', 'theology-matters', 'first-baptist-muncie'],
    seconds: 64,
    direction: 'down',
    offset: -7.5,
  },
  {
    kind: 'desktop',
    slugs: ['stone-steps-50k', 'presbyterian-academy', 'reid-design'],
    seconds: 80,
    direction: 'up',
    offset: 0,
  },
  {
    kind: 'phone',
    slugs: [
      'foundation-for-reformed-theology',
      'stone-steps-50k',
      'mas-monograms',
      'presbyterian-academy',
    ],
    seconds: 58,
    direction: 'down',
    offset: -16,
  },
  {
    kind: 'desktop',
    slugs: ['theology-matters', 'first-baptist-muncie', 'mas-monograms'],
    seconds: 92,
    direction: 'up',
    offset: -5,
  },
  {
    kind: 'phone',
    slugs: ['reid-design', 'foundation-for-reformed-theology', 'theology-matters'],
    seconds: 70,
    direction: 'down',
    offset: -2.5,
  },
];
