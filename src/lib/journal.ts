/* ============================================================================
   journal | The Journal's entries, read from the CMS `posts` collection
   ============================================================================
   Foundation, edit with care.

   /journal, /journal/<slug>, /rss.xml, the sitemap and the Header and Footer
   menus read the journal through here (CMS-DESIGN PR 12), replacing the old
   Astro `journal` content collection (MDX in git). One entry per post, edited in
   the EmDash admin under Journal (schema in cms/schema/posts.mjs).

   THERE IS NO COMMITTED FALLBACK, ON PURPOSE. Production has no journal entries
   and the page's "first entry is coming" card is what it shows. A collection with
   no published entry, a read error and a CMS that has no table yet all read as
   "no entries", so the page renders that card and the nav hides the link; the
   journal can never break a page. (The words around the entries are the separate
   `page_journal` singleton, src/lib/indexPages.ts, which has its own fallback.)

   DRAFTS ARE NEVER VISIBLE. The reader asks EmDash for published entries only,
   and EmDash hands a draft out only to a signed-in editor on a ?_edit or
   ?_preview address (which BaseLayout never caches). An unknown slug and a draft
   slug look the same: not found.

   What the page gets, per entry (see JournalEntry):
     - the publish date is the system `published_at` (data.publishedAt), the
       moment the entry went live; `updated` is the optional field of that name;
     - the cover is the `featured_image` field, shown through EmDashPhoto;
     - tags are the template's `tag` taxonomy, hydrated on `data.terms.tag`;
     - the body is Portable Text, rendered by the page; `minutes` is the reading
       time worked out from its plain text.

   Everything here runs at request time. Pass `Astro.cache` so the page is tagged
   with the rows it rendered and a publish in the admin purges it; every page that
   shows the nav (all of them) also carries the `posts` tag through
   hasJournalEntries(), so publishing the FIRST entry makes the Journal link
   appear everywhere, not only on /journal.
   ============================================================================ */

import type { CacheHint, ImageValue } from 'emdash';
import { date, image, portable, text, type Raw } from './cms.ts';
import { plainText, type PTNode } from './portableText.ts';
import { readingTime } from './readingTime.ts';
import type { RouteCache } from './routeCache.ts';

export interface JournalEntry {
  /** The entry slug, which is also the /journal/<slug>/ URL segment. */
  id: string;
  title: string;
  /** The `excerpt` field: card text, search description, share text. */
  summary: string;
  /** When the entry went live (EmDash's `published_at`). */
  publishedAt: Date;
  /** The optional `updated` field. */
  updated?: Date;
  cover?: ImageValue;
  /** Tag labels, in the order EmDash hydrates them. */
  tags: string[];
  /** The body as Portable Text (a safe [] when empty). */
  body: PTNode[];
  /** Estimated reading time in minutes (at least 1). */
  minutes: number;
}

/** The labels of the terms hydrated on `data.terms.<taxonomy>`. */
function termLabels(raw: Raw, taxonomy: string): string[] {
  const terms = (raw.terms as Record<string, { label?: unknown }[]> | undefined)?.[taxonomy];
  if (!Array.isArray(terms)) return [];
  return terms.map((t) => (typeof t?.label === 'string' ? t.label.trim() : '')).filter(Boolean);
}

/**
 * One raw `posts` entry as a JournalEntry, or undefined when it cannot be shown
 * (no title, or no summary: the summary is required in the schema and it is the
 * share and search text, so an entry without one is left out rather than half
 * rendered). Never throws: one unusable entry must not take the list down.
 */
export function normalizeJournalEntry(raw: Raw, slug: string): JournalEntry | undefined {
  const title = text(raw.title)?.trim();
  const summary = text(raw.excerpt)?.trim();
  if (!slug || !title || !summary) return undefined;
  // `publishedAt` is the system date; fall back to the row's own dates so an
  // entry is never dated 1970 if a publish stamp is somehow missing.
  const publishedAt =
    date(raw.publishedAt) ?? date(raw.createdAt) ?? date(raw.updatedAt) ?? new Date(0);
  const body = portable(raw.content);
  return {
    id: slug,
    title,
    summary,
    publishedAt,
    updated: date(raw.updated),
    cover: image(raw.featured_image),
    tags: termLabels(raw, 'tag'),
    body,
    minutes: readingTime(plainText(body)),
  };
}

/** Newest first; ties broken by slug so the order is stable. */
export function compareJournal(a: JournalEntry, b: JournalEntry): number {
  const d = b.publishedAt.valueOf() - a.publishedAt.valueOf();
  return d !== 0 ? d : a.id.localeCompare(b.id);
}

/* ----------------------------------------------------------------------------
   Dependencies (injectable so the tests need no EmDash and no D1)
   ---------------------------------------------------------------------------- */

export interface JournalReader {
  list(opts?: {
    limit?: number;
  }): Promise<{ entries: { id: string; data: Raw }[]; cacheHint?: CacheHint; error?: Error }>;
  get(slug: string): Promise<{
    entry?: { id: string; data: Raw } | null;
    cacheHint?: CacheHint;
    error?: Error;
  }>;
}

export interface JournalDeps {
  reader: JournalReader;
  /** Called with a one-line reason when a read failed and the journal reads as empty. */
  log: (message: string, error?: unknown) => void;
}

export interface JournalOptions {
  /** `Astro.cache`; the read adds its cache tags to the page. */
  cache?: RouteCache;
  /** Tests inject this; the site uses the default (EmDash). */
  deps?: JournalDeps;
}

const defaultLog = (message: string, error?: unknown) =>
  error === undefined
    ? console.error(`[journal] ${message}`)
    : console.error(`[journal] ${message}`, error);

let defaults: Promise<JournalDeps> | undefined;

/** The real wiring, loaded on first use so importing this module costs nothing. */
function defaultDeps(): Promise<JournalDeps> {
  defaults ??= (async () => {
    const em = await import('emdash');
    const reader: JournalReader = {
      async list(opts) {
        const { entries, error, cacheHint } = await em.getEmDashCollection(
          'posts',
          opts?.limit ? { limit: opts.limit } : undefined,
        );
        return {
          entries: entries.map((e) => ({ id: e.id, data: e.data as Raw })),
          cacheHint,
          error,
        };
      },
      async get(slug) {
        const { entry, error, cacheHint } = await em.getEmDashEntry('posts', slug);
        return {
          entry: entry ? { id: entry.id, data: entry.data as Raw } : null,
          cacheHint,
          error,
        };
      },
    };
    return { reader, log: defaultLog };
  })();
  return defaults;
}

/** Add a read's tags to the page's route cache (no-op in dev, where the cache is a stub). */
function tag(cache: RouteCache | undefined, hint: CacheHint | undefined): void {
  if (cache?.enabled && hint) cache.set(hint);
}

/* ----------------------------------------------------------------------------
   Readers
   ---------------------------------------------------------------------------- */

/**
 * Every published, usable journal entry, newest first. [] when there are none,
 * and on any read error (logged): the journal reads as empty rather than failing.
 */
export async function getJournalEntries(opts: JournalOptions = {}): Promise<JournalEntry[]> {
  const deps = opts.deps ?? (await defaultDeps());
  try {
    const res = await deps.reader.list();
    tag(opts.cache, res.cacheHint);
    if (res.error) {
      deps.log('read of posts failed; the journal reads as empty', res.error);
      return [];
    }
    return res.entries
      .flatMap((e) => {
        const entry = normalizeJournalEntry(e.data, e.id);
        return entry ? [entry] : [];
      })
      .sort(compareJournal);
  } catch (e) {
    deps.log('read of posts threw; the journal reads as empty', e);
    return [];
  }
}

/**
 * One published journal entry by slug, or undefined when there is none (the
 * caller answers 404): an unknown slug, a draft, an unusable entry and a failed
 * read all look the same.
 */
export async function getJournalEntry(
  slug: string,
  opts: JournalOptions = {},
): Promise<JournalEntry | undefined> {
  const deps = opts.deps ?? (await defaultDeps());
  try {
    const res = await deps.reader.get(slug);
    tag(opts.cache, res.cacheHint);
    if (res.error) {
      deps.log(`read of posts/${slug} failed; treating it as not found`, res.error);
      return undefined;
    }
    return res.entry ? normalizeJournalEntry(res.entry.data, res.entry.id) : undefined;
  } catch (e) {
    deps.log(`read of posts/${slug} threw; treating it as not found`, e);
    return undefined;
  }
}

/** What hasJournalEntries needs from the caller: `Astro` in a component or page. */
export interface JournalContext {
  cache?: RouteCache;
  request?: Request;
}

const perRequest = new WeakMap<Request, Promise<boolean>>();

/**
 * True when at least one published, usable entry exists. The Header and the Footer
 * both ask (to hide the Journal menu item while there is nothing to read), so the
 * answer is memoised per request, and the read is tagged for the route cache so
 * publishing the first entry purges every page that shows the nav.
 */
export function hasJournalEntries(
  ctx: JournalContext = {},
  opts: Pick<JournalOptions, 'deps'> = {},
): Promise<boolean> {
  const read = async (): Promise<boolean> => {
    const deps = opts.deps ?? (await defaultDeps());
    try {
      // One entry is enough to know. An unusable entry (no summary) must not count,
      // so look at what the list holds rather than at its length.
      const res = await deps.reader.list({ limit: 8 });
      tag(ctx.cache, res.cacheHint);
      if (res.error) {
        deps.log('read of posts failed; the Journal menu item stays hidden', res.error);
        return false;
      }
      return res.entries.some((e) => normalizeJournalEntry(e.data, e.id) !== undefined);
    } catch (e) {
      deps.log('read of posts threw; the Journal menu item stays hidden', e);
      return false;
    }
  };
  if (!ctx.request) return read();
  let memo = perRequest.get(ctx.request);
  if (!memo) {
    memo = read();
    perRequest.set(ctx.request, memo);
  }
  return memo;
}

/* ----------------------------------------------------------------------------
   Display helpers
   ---------------------------------------------------------------------------- */

/**
 * "Oct 3, 2026" or, with `long`, "October 3, 2026". Shown in the studio's own
 * time zone (Cincinnati), not the Worker's UTC, so an entry published on a Friday
 * evening does not read as Saturday. `published_at` is an exact moment, unlike the
 * date-only frontmatter the old journal used.
 */
export function formatJournalDate(d: Date, long = false): string {
  return new Intl.DateTimeFormat('en-US', {
    month: long ? 'long' : 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/New_York',
  }).format(d);
}
