/* ============================================================================
   Prose pages | Privacy, Accessibility and Colophon, read from the CMS
   ============================================================================
   Foundation, edit with care.

   /privacy, /accessibility and /colophon read one thing each through here:
   getProsePage(slug), the entry of the `pages` collection (EmDash admin: Pages,
   "Other pages"; schema cms/schema/pages.mjs) whose slug matches the route.
   src/components/ProsePage.astro draws it. If the entry is missing, unpublished,
   unreadable, or half-filled (the template `pages` collection also exists in
   production with only Title and Content), the reader serves the committed
   cms/content/pages.json (the literal prose the three .astro pages used to hold)
   and logs a `[cms]` line, so a broken edit never blanks a legal page. That
   fallback is also what production serves until its data is loaded
   (docs/LAUNCH-RUNBOOK.md).

   TWO LAYOUTS, picked by the `show_toc` field:
     document   eyebrow label, headline, lead paragraph, "Last updated" badge, then
                the "On this page" list beside the sections. Every Heading 2 in the
                body starts a section and is an entry in that list.
     ledger     headline, lead paragraph, then the label/detail rows (the Colophon)
                and the closing "Start a project / See the work" links.

   ANCHORS. A section's id is the slug of its heading text (src/lib/portableText.ts
   slugify, the rule the case-study headings use), so "Contact form" is
   #contact-form. Three Accessibility headings had hand-picked ids before the CMS
   (#how-its-checked, #where-it-stops, #report), and old links may point at them,
   so LEGACY_ANCHORS keeps those ids for as long as the heading text is unchanged.

   RESTRICTED BODY. The body goes through restrictPortableText (paragraphs, bold,
   italic, code, safe links, headings 2 and 3, lists) and is turned into plain HTML
   strings here rather than handed to emdash/ui's PortableText: that renderer ships
   its own stylesheet as a render-blocking link (measured in the PR 8 parity run),
   and these pages need none of it. The markup is exactly what the hand-written
   pages had, so the move is invisible.

   The pure helpers are unit tested in prosePage.test.ts, including a check that
   the committed fallback is the prose the pages carried before.
   ============================================================================ */

import { dayOf, updatedLabel } from './aboutPage.ts';
import { bool, getSingleton, portable, rows, text, type Raw } from './cms.ts';
import {
  blockHtml,
  blockText,
  restrictPortableText,
  slugify,
  type PTNode,
} from './portableText.ts';
import type { RouteCache } from './routeCache.ts';

/** One block of a section's body. `html` is trusted: it was built by blockHtml from restricted text. */
export type ProseBlock =
  | { kind: 'p'; html: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'h3'; id: string; text: string };

export interface ProseSection {
  /** Anchor id (see ANCHORS above). */
  id: string;
  /** Empty only for body text that comes before the first Heading 2. */
  heading: string;
  blocks: ProseBlock[];
}

export interface ProseRow {
  label: string;
  detail: string;
}

export interface ProsePage {
  slug: string;
  /** The page name; the tab reads "<title> | <studio name>" (see proseTitle). */
  title: string;
  /** The h1. */
  heading: string;
  /** The small label above the h1 (document layout). */
  eyebrow?: string;
  /** Meta description. */
  summary: string;
  /** The lead paragraph(s) as HTML. */
  intro: string[];
  sections: ProseSection[];
  rows: ProseRow[];
  /** True: document layout with the table of contents. False: ledger layout. */
  showToc: boolean;
  /** `YYYY-MM-DD`, or undefined when the entry has no date. */
  lastUpdated?: string;
}

/** Link style shared by every prose anchor (--link clears AA on white, always underlined). */
export const LINK_CLASS =
  'text-link underline underline-offset-2 ' +
  'hover:underline-offset-4 focus-visible:underline-offset-4 ' +
  'transition-[text-underline-offset] duration-200';

/** Class on the `code` mark's <code>. */
export const CODE_CLASS = 'font-mono text-[0.9em]';

/**
 * Anchors that predate the CMS and differ from the heading's slug. Keyed by page
 * slug, then by the exact heading text. Keep an entry for as long as a link to
 * the old anchor could exist.
 */
export const LEGACY_ANCHORS: Record<string, Record<string, string>> = {
  accessibility: {
    'How it is checked': 'how-its-checked',
    'Where it stops short': 'where-it-stops',
    'Found a problem?': 'report',
  },
};

/** The id for a heading: its legacy anchor if it has one, else the slug of its text. */
export function anchorFor(pageSlug: string, headingText: string): string {
  // A heading with no letters or digits (an emoji, say) would slug to nothing; give it a usable id.
  return LEGACY_ANCHORS[pageSlug]?.[headingText] ?? (slugify(headingText) || 'section');
}

/** Make ids unique within a page (a repeated heading gets -2, -3, ...). */
function uniqueIds(): (id: string) => string {
  const seen = new Map<string, number>();
  return (id) => {
    const n = (seen.get(id) ?? 0) + 1;
    seen.set(id, n);
    return n === 1 ? id : `${id}-${n}`;
  };
}

/** Paragraph HTML. Double quotes stay literal in text, as in the hand-written pages. */
const paragraphHtml = (b: PTNode): string =>
  blockHtml(b, {
    linkClass: LINK_CLASS,
    externalBlank: true,
    codeClass: CODE_CLASS,
    literalQuotes: true,
  });

/**
 * List-item HTML. Quotes are entity-escaped here, matching what the old tick
 * list printed (it rendered each item through a template expression). The two
 * render identically; the difference exists only so the parity check can prove the
 * move changed nothing.
 */
const itemHtml = (b: PTNode): string =>
  blockHtml(b, { linkClass: LINK_CLASS, externalBlank: true, codeClass: CODE_CLASS });

/**
 * Turn a Portable Text body into sections. Every Heading 2 starts a section;
 * text before the first one forms a section with no heading. Heading 3 becomes a
 * sub-heading block. Consecutive list items of one kind join into one list.
 */
export function buildSections(body: unknown, pageSlug: string): ProseSection[] {
  const blocks = restrictPortableText(body, { headings: ['h2', 'h3'], lists: true, code: true });
  const unique = uniqueIds();
  const sections: ProseSection[] = [];
  let current: ProseSection | undefined;
  const open = (heading: string, id: string): ProseSection => {
    current = { id, heading, blocks: [] };
    sections.push(current);
    return current;
  };

  for (const b of blocks) {
    if (b.style === 'h2') {
      const heading = blockText(b).trim();
      open(heading, unique(anchorFor(pageSlug, heading)));
      continue;
    }
    const section = current ?? open('', '');
    if (b.style === 'h3') {
      const heading = blockText(b).trim();
      section.blocks.push({
        kind: 'h3',
        id: unique(slugify(heading) || 'subsection'),
        text: heading,
      });
    } else if (b.listItem) {
      const ordered = b.listItem === 'number';
      const last = section.blocks[section.blocks.length - 1];
      if (last?.kind === 'list' && last.ordered === ordered) last.items.push(itemHtml(b));
      else section.blocks.push({ kind: 'list', ordered, items: [itemHtml(b)] });
    } else {
      section.blocks.push({ kind: 'p', html: paragraphHtml(b) });
    }
  }
  return sections;
}

/** A required string; a blank one makes the entry unusable (the reader then falls back). */
function must(raw: Raw, key: string): string {
  const v = text(raw[key]);
  if (v === undefined) throw new Error(`pages.${key} is empty`);
  return v.trim();
}

/** Most rows the ledger layout takes (matches the schema's maxItems). */
export const ROW_SLOTS = 12;

/**
 * Build the typed ProsePage for `slug` from a raw `pages` entry (or the fallback
 * JSON). Throws when the entry cannot make a page: a blank title, headline or
 * description, a document with no section, or a ledger with no rows. The reader
 * then serves the committed fallback instead of a half-empty legal page.
 */
export function normalizeProsePage(slug: string, raw: Raw): ProsePage {
  const showToc = bool(raw.show_toc);
  const sections = buildSections(raw.content, slug);
  const pageRows = rows(raw.rows, (r): ProseRow | undefined => {
    const label = text(r.label);
    const detail = text(r.detail);
    return label && detail ? { label: label.trim(), detail: detail.trim() } : undefined;
  }).slice(0, ROW_SLOTS);

  if (showToc && sections.length === 0) throw new Error(`pages/${slug} has no body text`);
  if (!showToc && pageRows.length === 0) throw new Error(`pages/${slug} has no rows`);

  return {
    slug,
    title: must(raw, 'title'),
    heading: must(raw, 'heading'),
    eyebrow: text(raw.eyebrow)?.trim(),
    summary: must(raw, 'summary'),
    intro: restrictPortableText(portable(raw.intro), { code: true }).map(paragraphHtml),
    sections,
    rows: pageRows,
    showToc,
    // A day with no time or zone (dayOf), or none when the entry has no usable date.
    lastUpdated: dayOf(raw.last_updated),
  };
}

/** "September 4, 2026" for the badge and the closing line. */
export const lastUpdatedLabel = (iso: string): string => updatedLabel(iso);

/**
 * The page <title>. The stored value is the bare name ("Privacy"); the studio name
 * is added so a tab reads "Privacy | Nixon Creative Studio". If an edit already
 * includes the studio name it is left alone.
 */
export function proseTitle(title: string, studioName: string): string {
  return title.includes(studioName) ? title : `${title} | ${studioName}`;
}

/** What the reader needs from the caller: `Astro` in a page. */
export interface ProseContext {
  /** Route cache; the read adds its tag so publishing the entry purges the page. */
  cache?: RouteCache;
}

/** One prose page by its slug. One D1 read; falls back to the committed JSON. */
export async function getProsePage(
  slug: string,
  ctx: ProseContext = {},
  opts: Pick<NonNullable<Parameters<typeof getSingleton>[3]>, 'deps'> = {},
): Promise<ProsePage> {
  return (
    await getSingleton('pages', slug, (raw) => normalizeProsePage(slug, raw), {
      cache: ctx.cache,
      ...opts,
    })
  ).data;
}
