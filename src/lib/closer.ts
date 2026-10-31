// Safe to edit.
/* ============================================================================
   The closer: the ink band every page ends on (overhaul package 2.1)
   ============================================================================
   The footer opens with a .band-ink "closer" in both themes: one static H2,
   an optional line under it, the email and the CTA pill. Each page sets its
   own through BaseLayout's `closer` prop; a page that passes nothing gets
   DEFAULT_CLOSER below. This replaced the old CtaBanner component.

   The heading is two parts, because emphasis on this site is weight: `heading`
   renders at 300 and `emphasis` (optional) follows it in a <b> at 800. Never
   Heft here: the one weight animation per page belongs to the H1 (ruling 9).

     <BaseLayout closer={{ heading: 'Building for a', emphasis: 'church?' }}>

   Leave `href` out for the default "/contact/" pill; set `cta: false` for no
   pill at all (/contact itself, so the page never links to itself).
   ============================================================================ */

export interface Closer {
  /** The H2's lead, at weight 300. */
  heading: string;
  /** The heavy phrase that follows the lead, in a <b> at 800. */
  emphasis?: string;
  /** One line under the heading. */
  sub?: string;
  /** Where the pill goes. Defaults to /contact/. */
  href?: string;
  /** The pill's text. Defaults to "Start a project". */
  label?: string;
  /** false hides the pill (the email still shows). */
  cta?: boolean;
}

export const DEFAULT_CLOSER: Closer = {
  heading: "Let's build a site",
  emphasis: "you won't have to redo.",
  sub: 'The first conversation is free and ends with an honest ballpark, so you know where you stand before anything is signed.',
};

/** How each case-study sector reads in a sentence ("Building for a church?"). */
export const SECTOR_PHRASE: Record<string, string> = {
  church: 'church',
  school: 'school',
  nonprofit: 'nonprofit',
  'small-business': 'small business',
};

/** Column heading for each sector in the footer's Work column. */
export const SECTOR_PLURAL: Record<string, string> = {
  church: 'Churches',
  school: 'Schools',
  nonprofit: 'Nonprofits',
  'small-business': 'Small businesses',
};
