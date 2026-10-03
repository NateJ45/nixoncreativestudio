/* ============================================================================
   Contact page | The /contact words and form choices, read from the CMS
   ============================================================================
   Foundation, edit with care.

   /contact reads one thing through here: getContactPage(), the `page_contact`
   entry (slug `contact`), edited in the EmDash admin under Pages, "Contact page"
   (schema in cms/schema/page_contact.mjs). If the entry is missing, unpublished
   or unreadable, the reader serves the committed copy in
   cms/content/page_contact.json (the literal text contact.astro used to hold) and
   logs a `[cms]` line, so a broken edit never blanks the form. That fallback is
   also what production serves until its data is loaded (docs/LAUNCH-RUNBOOK.md).

   THE SUBMITTED VALUE IS THE LABEL. The Budget, Timeline and "How did you hear"
   selects use each choice's visible text as the <option> value, so the label is
   what Web3Forms emails to Nathan ("Budget: Under $4,000") rather than an
   invisible code he would have to translate. Because of that the value and the
   label are the same string here (`ChoiceOption.value === label`); the list
   items are plain strings.

   Stays in code (docs/CMS-DESIGN.md 1.8): the field labels and help text, the
   validation and success/error messages, the Web3Forms wiring and honeypot, the
   Organization type list (its values are the case-study sector slugs the
   /contact?org_type=<sector> links rely on) and the layout.
   ============================================================================ */

import { getSingleton, text, texts, type Raw } from './cms.ts';
import type { RouteCache } from './routeCache.ts';

export interface ContactPage {
  /** Page title without the studio name; the page adds it (see contactTitle). */
  seoTitle: string;
  seoDescription: string;
  /** Closing banner overrides; undefined means the site default. */
  ctaTitle?: string;
  ctaSub?: string;
  ctaLabel: string;
  /** Headline: the plain part, then the accent phrase set in the link colour. */
  heading: string;
  headingAccent: string;
  intro: string;
  /** Choice labels, in order. Each is also the value the form submits. */
  budgets: string[];
  timelines: string[];
  heardFrom: string[];
  /** The "What happens next" lines. */
  nextSteps: string[];
  /** The text after the address in the "Where I am" block. */
  whereText: string;
}

/** The form's selects hold this many choices at most (matches the schema limits). */
export const BUDGET_SLOTS = 6;
export const TIMELINE_SLOTS = 6;
export const HEARD_FROM_SLOTS = 8;
export const NEXT_STEP_SLOTS = 4;

/** A required string; a blank one makes the entry unusable (the reader then falls back). */
function must(raw: Raw, key: string): string {
  const v = text(raw[key]);
  if (v === undefined) throw new Error(`page_contact.${key} is empty`);
  return v;
}

/**
 * A choice list from a repeater of `{ label }` rows (or `{ text }` rows for the
 * steps). Blank rows are dropped and exact repeats are removed (two identical
 * options would be indistinguishable in the inquiry email); fewer than two usable
 * choices throws so the reader falls back to the committed lists. A list that is
 * too long is cut.
 */
function choices(raw: Raw, key: string, rowKey: string, max: number): string[] {
  // Trimmed first, because the label is also the submitted value: a stray space
  // would arrive in the email and break the exact-match draft restore.
  const list = [...new Set(texts(raw[key], rowKey).map((s) => s.trim()))].slice(0, max);
  if (list.length < 2) throw new Error(`page_contact.${key} needs at least 2 choices`);
  return list;
}

/**
 * Build the typed ContactPage from a raw `page_contact` entry (or the fallback
 * JSON). Throws when a required field is blank or a list has fewer than two usable
 * rows, so the reader serves the committed fallback instead of a half-empty form.
 */
export function normalizeContactPage(raw: Raw): ContactPage {
  return {
    seoTitle: must(raw, 'seo_title'),
    seoDescription: must(raw, 'seo_description'),
    ctaTitle: text(raw.cta_title),
    ctaSub: text(raw.cta_sub),
    ctaLabel: must(raw, 'cta_label'),
    heading: must(raw, 'heading'),
    headingAccent: must(raw, 'heading_accent'),
    intro: must(raw, 'intro'),
    budgets: choices(raw, 'budgets', 'label', BUDGET_SLOTS),
    timelines: choices(raw, 'timelines', 'label', TIMELINE_SLOTS),
    heardFrom: choices(raw, 'heard_from', 'label', HEARD_FROM_SLOTS),
    nextSteps: choices(raw, 'next_steps', 'text', NEXT_STEP_SLOTS),
    whereText: must(raw, 'where_text'),
  };
}

/**
 * The page <title>. The stored value is the bare name ("Contact"); the studio
 * name is added so a tab reads "Contact | Nixon Creative Studio". If an edit
 * already includes the studio name it is left alone.
 */
export function contactTitle(seoTitle: string, studioName: string): string {
  return seoTitle.includes(studioName) ? seoTitle : `${seoTitle} | ${studioName}`;
}

/** What the reader needs from the caller: `Astro` in a page. */
export interface ContactContext {
  /** Route cache; the read adds its tag so publishing the entry purges the page. */
  cache?: RouteCache;
}

/** The /contact words and choices. One D1 read; falls back to the committed JSON. */
export async function getContactPage(
  ctx: ContactContext = {},
  opts: Pick<NonNullable<Parameters<typeof getSingleton>[3]>, 'deps'> = {},
): Promise<ContactPage> {
  return (
    await getSingleton('page_contact', 'contact', normalizeContactPage, {
      cache: ctx.cache,
      ...opts,
    })
  ).data;
}
