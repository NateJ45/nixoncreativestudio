// Safe to edit. Client quotes that are not about a website, so they have no case study to live on
// (a case study's quotes are in its frontmatter; see `testimonials` in src/content.config.ts).
//
// The same rules hold: never fabricate one (CLAUDE.md never-break rule 9). Every quote is copied
// character for character from the client's own words and recorded in the vault note
// projects/ncs-testimonials.md. `photo` is the person's face (`/assets/people/<name>`, with the
// -96.webp and -192.webp files beside it), used only with their blessing. `shot` is one of the
// photographs on /photography (an id in src/content/photos), shown where a website quote shows the
// client's site. `accent` and `paper` colour the home band while the quote is up, the same as a
// client's palette; `paper` must read on `accent`.
//
// Shown in the home band's carousel (QuoteBand.astro) and, for a church, on /churches.

export interface StandaloneQuote {
  /** A short id, used as the band slide's key. */
  id: string;
  quote: string;
  name: string;
  title: string;
  /** The organisation, for a heading. */
  org: string;
  /** The day they wrote it (YYYY-MM-DD). */
  date: string;
  /** The key phrase, copied exactly out of `quote`. */
  highlight?: string;
  context?: string;
  photo?: string;
  /** A photograph from src/content/photos. */
  shot: string;
  accent: string;
  paper: string;
  /** The sector pages it belongs on, by their path (e.g. 'churches'). */
  sectors: string[];
}

export const QUOTES: StandaloneQuote[] = [
  {
    id: 'crestview',
    // Jessica's public Google review of the studio, copied from Google on 2026-11-16.
    quote:
      "Nathan is exceptional with listening to our needs and vision then creating pictures and videos that beautifully capture our events/VBS/special moments that have been used for our socials, website, print and internal communications. He is THE best that we've ever worked with!",
    name: 'Jessica Sams',
    title: 'Director of Communications, Crestview Presbyterian Church',
    org: 'Crestview Presbyterian Church',
    date: '2026-11-16',
    highlight: "He is THE best that we've ever worked with!",
    context: 'Photography and video for the church',
    photo: '/assets/people/jessica-sams',
    shot: 'vbs-song',
    accent: '#24453a',
    paper: '#f3eee2',
    sectors: ['churches'],
  },
];

for (const q of QUOTES)
  if (q.highlight && !q.quote.includes(q.highlight))
    throw new Error(`quotes.ts: ${q.id}'s highlight must be copied exactly out of its quote`);
