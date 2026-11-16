// Safe to edit. Client quotes that are not about a website, so they have no case study to live on
// (a case study's quotes are in its frontmatter; see `testimonials` in src/content.config.ts).
//
// The same rules hold: never fabricate one (CLAUDE.md never-break rule 9). Every quote is copied
// character for character from the client's own words and recorded in the vault note
// projects/ncs-testimonials.md. `photo` is the person's face (`/assets/people/<name>`, with the
// -96.webp and -192.webp files beside it), used only with their blessing. `shots` are photographs
// on /photography (ids in src/content/photos), shown as a small fan of prints (PrintFan.astro) where
// a website quote shows the client's site; the first is the print on top. `accent` and `paper` colour the home band while the quote is up, the same as a
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
  /** Set when the words are a public Google review: the stars and a link to the review itself
   *  (the long google.com/maps/reviews/... form, which opens without a sign-in). */
  source?: { platform: 'google'; url: string; rating: number };
  /** Up to three photographs from src/content/photos, the top print first. */
  shots: string[];
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
    source: {
      platform: 'google',
      url: 'https://www.google.com/maps/reviews/data=!4m8!14m7!1m6!2m5!1sCi9DQUlRQUNvZENodHljRjlvT20xeVQyaDZMV1l3TldaTVIySnlURmt0WVhsS2RtYxAB!2m1!1s0x0:0x799871759370794f!3m1!1s2@1:CAIQACodChtycF9oOm1yT2h6LWYwNWZMR2JyTFktYXlKdmc%7C%7C',
      rating: 5,
    },
    shots: ['vbs-song', 'vbs-hug', 'choir-sing'],
    accent: '#24453a',
    paper: '#f3eee2',
    sectors: ['churches'],
  },
];

for (const q of QUOTES) {
  if (q.highlight && !q.quote.includes(q.highlight))
    throw new Error(`quotes.ts: ${q.id}'s highlight must be copied exactly out of its quote`);
  if (q.source && !/^https:\/\/(www\.google\.com\/maps|maps\.app\.goo\.gl)\//.test(q.source.url))
    throw new Error(`quotes.ts: ${q.id}'s review link must open the review on Google Maps`);
}
