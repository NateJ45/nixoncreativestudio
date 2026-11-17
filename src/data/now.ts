// Safe to edit: this is the whole /now page, and a two-minute job each month.
/* ============================================================================
   /now: what I'm doing this month, as the things on my desk
   ============================================================================
   The idea comes from nownownow.com: one page that says what you're focused on
   right now, kept roughly current. To update it:

     1. Change `updated` to today's date (YYYY-MM-DD).
     2. Rewrite the lines in `items`. Plain, first person, one sentence each.
     3. Commit. The page, its "Updated" line and the sitemap's lastmod all read
        `updated`, so nothing else needs touching.

   A line can carry a link: `{ text, link: { href, label } }`. The link is only
   shown when `href` is a real page (journal posts are checked at build time,
   so a draft never gets a link).

   A line can also say which object it sits on, with `object`. Leave it out and
   the line is a plain card. Every object is built from something real that is
   already in the repo, and if that thing is missing the line falls back to a
   plain card, so a wrong id never breaks the page:

     { kind: 'plain' }                 Just the words on a card (the default).
     { kind: 'window', client: slug }  A client's site in a small browser
                                       window. `slug` is the case study's id in
                                       src/content/case-studies. Plain until
                                       that study exists.
     { kind: 'print', photo: id }      One of my photographs as a print. `id`
                                       is the file name in src/content/photos,
                                       without .json. Its title is written on
                                       the print, never a date or a year.
     { kind: 'note' }                  An index card with the latest published
                                       journal post on it, linked. Plain while
                                       nothing is published.
     { kind: 'weeks' }                 The weeks sheet: a row of dots per site I
                                       look after, filled where that week had
                                       changes (src/data/client-weeks.json,
                                       `npm run weeks`). No names, no dates.
     { kind: 'route' }                 A small route card: my Flying Pig 10K
                                       from src/data/flying-pig-10k.ts, the same
                                       route About shows.

   Example: { text: 'Shooting a wedding this month.', object: { kind: 'print', photo: 'engagement-hug' } }

   This file has no imports on purpose: astro.config.mjs loads it for the
   sitemap date.
   ============================================================================ */

export type NowObject =
  | { kind: 'plain' }
  | { kind: 'window'; client: string }
  | { kind: 'print'; photo: string }
  | { kind: 'note' }
  | { kind: 'weeks' }
  | { kind: 'route' };

export interface NowItem {
  /** One sentence, first person. */
  text: string;
  /** Optional: the words to link at the end of the sentence, and where. */
  link?: { href: string; label: string };
  /** Optional: the object on the desk this line sits on. Plain card when left out. */
  object?: NowObject;
}

export const now = {
  /** The day this page was last true, as YYYY-MM-DD. */
  updated: '2026-11-10',
  items: [
    {
      text: "Building First Baptist Church of Auburn's new website.",
      object: { kind: 'window', client: 'first-baptist-auburn' },
    },
    { text: 'Looking after eight client sites, week by week.', object: { kind: 'weeks' } },
    {
      text: 'Running Sunday AV at Crestview Presbyterian Church, as one of its volunteers.',
      object: { kind: 'print', photo: 'sanctuary-band' },
    },
    {
      text: 'Writing a journal about websites for churches and small organizations.',
      link: { href: '/journal/', label: 'Read the journal' },
      object: { kind: 'note' },
    },
    { text: 'Time with my family, and long runs.', object: { kind: 'route' } },
  ] satisfies NowItem[],
};

/** `updated` for people, e.g. "November 10, 2026". Read as UTC so the day never slips. */
export function nowUpdatedLabel(): string {
  return new Date(`${now.updated}T12:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
