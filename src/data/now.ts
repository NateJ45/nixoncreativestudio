// Safe to edit: this is the whole /now page, and a two-minute job each month.
/* ============================================================================
   /now: what I'm doing this month
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
   ============================================================================ */

export interface NowItem {
  /** One sentence, first person. */
  text: string;
  /** Optional: the words to link at the end of the sentence, and where. */
  link?: { href: string; label: string };
}

export const now = {
  /** The day this page was last true, as YYYY-MM-DD. */
  updated: '2026-11-10',
  items: [
    { text: "Building First Baptist Church of Auburn's new website." },
    { text: 'Looking after eight client sites, week by week.' },
    { text: 'Running Sunday AV at Crestview Presbyterian Church, as one of its volunteers.' },
    {
      text: 'Writing a journal about websites for churches and small organizations.',
      link: { href: '/journal/', label: 'Read the journal' },
    },
    { text: 'Time with my family, and long runs.' },
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
