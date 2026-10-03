/* ============================================================================
   Home page | The homepage copy, read from the CMS
   ============================================================================
   Foundation, edit with care.

   The Hero, Selected Work heading, the "What it costs" band and the Process Band
   (on the homepage AND on /services) all read their words through
   getHomePage(). The values live in the EmDash admin, under Pages, "Home page"
   (the `page_home` collection, entry slug `home`, schema in cms/schema/page_home.mjs).
   If that entry is missing, unpublished or unreadable, getHomePage() serves the
   committed copy in cms/content/page_home.json (the literal text the components
   used to hold) and logs a `[cms]` line, so a broken edit never blanks the
   homepage. That fallback is also what production serves until its data is loaded
   (docs/LAUNCH-RUNBOOK.md).

   Usage in an .astro file:
     const home = await getHomePage(Astro);   // Astro.cache tags the page, Astro.request memoises

   One D1 read per request however many components ask (the Hero, three section
   components, and /services' ProcessBand all share it), tagged once for the route
   cache so publishing the entry purges the page. The hero is server-rendered from
   this read: nothing about it waits on JavaScript or starts at opacity 0, so the
   LCP element is the same one it was when the copy was hardcoded (CLAUDE.md
   Gotchas 10 and 14).

   Stays in code (docs/CMS-DESIGN.md 1.4): section order, every link target, the
   step numbers (counted from order), the hero device scene and the client
   marquee.
   ============================================================================ */

import { getSingleton, rows, text, texts, type CmsOptions, type Raw } from './cms.ts';
import type { RouteCache } from './routeCache.ts';

export interface ProcessStep {
  /** "01" to "04", counted from the step's position, never edited. */
  num: string;
  title: string;
  body: string;
}

export interface HomePage {
  /** Browser tab and search title (already contains the studio name). */
  seoTitle: string;
  seoDescription: string;
  hero: {
    /** The plain first part of the headline. */
    heading: string;
    /** The coloured last part (amber on dark, blue on light), as its own span. */
    headingAccent: string;
    positioning: string;
    proof: { before: string; linkText: string; after: string };
    primaryLabel: string;
    secondaryLabel: string;
  };
  work: { heading: string; sub: string; linkLabel: string };
  pricing: {
    heading: string;
    sub: string;
    includesLead: string;
    includes: string[];
    reassurance: string;
    linkLabel: string;
  };
  process: {
    heading: string;
    sub: string;
    steps: ProcessStep[];
    ctaTitle: string;
    ctaSub: string;
    ctaLabel: string;
  };
}

/** The layout has four process nodes and four "includes" items; more never render. */
export const PROCESS_STEP_SLOTS = 4;
export const INCLUDES_SLOTS = 4;

/** A required string; a blank one makes the entry unusable (the reader then falls back). */
function must(raw: Raw, key: string): string {
  const v = text(raw[key]);
  if (v === undefined) throw new Error(`page_home.${key} is empty`);
  return v;
}

/**
 * Build the typed HomePage from a raw `page_home` entry (or the fallback JSON).
 * Throws when a required field is blank or a fixed-count list is short, which
 * makes getSingleton() serve the committed fallback instead of a half-empty
 * homepage. A list that is too LONG is cut to the slots the layout has.
 */
export function normalizeHome(raw: Raw): HomePage {
  const includes = texts(raw.pricing_includes).slice(0, INCLUDES_SLOTS);
  if (includes.length < INCLUDES_SLOTS) {
    throw new Error(`page_home.pricing_includes needs ${INCLUDES_SLOTS} lines`);
  }
  const steps = rows(raw.process_steps, (r, i): ProcessStep | undefined => {
    const title = text(r.title);
    const body = text(r.body);
    if (title === undefined || body === undefined) return undefined;
    return { num: String(i + 1).padStart(2, '0'), title, body };
  });
  if (steps.length < PROCESS_STEP_SLOTS) {
    throw new Error(`page_home.process_steps needs ${PROCESS_STEP_SLOTS} complete steps`);
  }
  return {
    seoTitle: must(raw, 'seo_title'),
    seoDescription: must(raw, 'seo_description'),
    hero: {
      heading: must(raw, 'hero_heading'),
      headingAccent: must(raw, 'hero_heading_accent'),
      positioning: must(raw, 'hero_positioning'),
      proof: {
        before: must(raw, 'hero_proof_before'),
        linkText: must(raw, 'hero_proof_link_text'),
        after: must(raw, 'hero_proof_after'),
      },
      primaryLabel: must(raw, 'hero_primary_label'),
      secondaryLabel: must(raw, 'hero_secondary_label'),
    },
    work: {
      heading: must(raw, 'work_heading'),
      sub: must(raw, 'work_sub'),
      linkLabel: must(raw, 'work_link_label'),
    },
    pricing: {
      heading: must(raw, 'pricing_heading'),
      sub: must(raw, 'pricing_sub'),
      includesLead: must(raw, 'pricing_includes_lead'),
      includes,
      reassurance: must(raw, 'pricing_reassurance'),
      linkLabel: must(raw, 'pricing_link_label'),
    },
    process: {
      heading: must(raw, 'process_heading'),
      sub: must(raw, 'process_sub'),
      steps: steps
        .slice(0, PROCESS_STEP_SLOTS)
        // Re-number after the slice so the badges always read 01 to 04.
        .map((s, i) => ({ ...s, num: String(i + 1).padStart(2, '0') })),
      ctaTitle: must(raw, 'process_cta_title'),
      ctaSub: must(raw, 'process_cta_sub'),
      ctaLabel: must(raw, 'process_cta_label'),
    },
  };
}

/**
 * The page <title>. The stored value normally already carries the studio name
 * ("Nixon Creative Studio | Strategy-led design and photography"); if an edit
 * drops it, add it back so a tab never reads as a bare phrase.
 */
export function homeTitle(seoTitle: string, studioName: string): string {
  return seoTitle.includes(studioName) ? seoTitle : `${seoTitle} | ${studioName}`;
}

/** What getHomePage() needs from the caller: `Astro` in a page or component. */
export interface HomePageContext {
  /** Route cache; the read adds its tag so publishing the entry purges the page. */
  cache?: RouteCache;
  /** Memo key: one read per request even though five components ask. */
  request?: Request;
}

const perRequest = new WeakMap<Request, Promise<HomePage>>();

/**
 * The homepage copy. One D1 read per request, tagged for the route cache. Falls
 * back to cms/content/page_home.json when the entry is missing or unreadable.
 */
export function getHomePage(
  ctx: HomePageContext = {},
  opts: Pick<CmsOptions, 'deps'> = {},
): Promise<HomePage> {
  const read = async (): Promise<HomePage> =>
    (await getSingleton('page_home', 'home', normalizeHome, { cache: ctx.cache, ...opts })).data;
  if (!ctx.request) return read();
  let memo = perRequest.get(ctx.request);
  if (!memo) {
    memo = read();
    perRequest.set(ctx.request, memo);
  }
  return memo;
}
