/* ============================================================================
   cms (the shared reader for the editable site content)
   ============================================================================
   Foundation, edit with care.

   The only module that reads the CMS-design collections (docs/CMS-DESIGN.md,
   section 1.1): the `page_*` singletons, `site_settings`, the ordered lists
   (`pricing_tiers`, `service_offerings`, ...) and the EmDash menus. Pages and
   components call getSingleton() / getOrdered() / getMenuItems(), never
   getEmDashEntry() directly, so the three promises below hold everywhere.

   1. FALLBACK. If an entry is missing, unpublished, malformed, or D1 errors,
      the same value is read from the committed migration JSON
      (cms/content/<collection>.json, see src/lib/cmsFallback.ts) and a
      `console.error` says so (Workers observability is on). A broken or
      unpublished singleton never blanks the site. If there is no fallback
      either, the call throws: that is a developer error, not an editor one.

   2. CACHE TAGS. Every read passes its `cacheHint` to `Astro.cache.set()` when
      the route cache is on (pass `Astro.cache` as `opts.cache`, exactly as
      src/lib/caseStudies.ts does), so the page carries the tags of everything
      it rendered and a publish in the admin purges it (src/lib/routeCache.ts).

   3. NORMALISED FIELDS. D1 hands back 0/1 for booleans, null for empty
      optional fields, repeaters as arrays (or, defensively, JSON text), images
      as objects. A page supplies a `normalize(raw)` that builds its typed
      shape from the small helpers exported here (text, bool, int, date, image,
      rows, texts, portable, choice), so a template only ever sees real
      booleans, arrays and `undefined`-for-empty.

   This file imports nothing at runtime except what the default wiring loads on
   demand (`emdash`, the fallback glob), so `node --test` can import it and run
   the whole read path with a stub reader (src/lib/cms.test.ts).
   ============================================================================ */

import type { CacheHint, ImageValue } from 'emdash';
import type { RouteCache } from './routeCache';
import type { PTNode } from './portableText';

/** An untyped record at the EmDash boundary. */
export type Raw = Record<string, unknown>;

/** Where a value came from. 'fallback' means the committed JSON was used. */
export type CmsSource = 'cms' | 'fallback';

export interface CmsEntry<T> {
  /** The entry slug. */
  slug: string;
  data: T;
  source: CmsSource;
}

/** A top-level menu item. Nested `children` are ignored (the header has no dropdown). */
export interface CmsMenuItem {
  label: string;
  url: string;
  target?: string;
  /** The "Title attribute" box in the menu editor. The mobile nav shows it as a visible descriptor. */
  titleAttr?: string;
}

/* ----------------------------------------------------------------------------
   Dependencies (injectable so the tests need no EmDash and no D1)
   ---------------------------------------------------------------------------- */

export interface CmsReader {
  getEntry(
    collection: string,
    slug: string,
  ): Promise<{ data: Raw | null; cacheHint?: CacheHint; error?: Error }>;
  getList(
    collection: string,
  ): Promise<{ entries: { id: string; data: Raw }[]; cacheHint?: CacheHint; error?: Error }>;
  getMenu(name: string): Promise<{ items: Raw[] | null; cacheHint?: CacheHint }>;
}

export interface CmsFallback {
  entry(collection: string, slug: string): Raw | undefined;
  list(collection: string): { slug: string; data: Raw }[] | undefined;
  menu(name: string): CmsMenuItem[] | undefined;
}

export interface CmsDeps {
  reader: CmsReader;
  fallback: CmsFallback;
  /** Called with a one-line reason whenever the fallback is used. Default: console.error. */
  log: (message: string, error?: unknown) => void;
}

export interface CmsOptions {
  /** `Astro.cache`; the read adds its cache tags to the page. */
  cache?: RouteCache;
  /** Tests inject this; the site uses the default (EmDash + the JSON glob). */
  deps?: CmsDeps;
}

const defaultLog = (message: string, error?: unknown) =>
  error === undefined
    ? console.error(`[cms] ${message}`)
    : console.error(`[cms] ${message}`, error);

let defaults: Promise<CmsDeps> | undefined;

/** The real wiring, loaded on first use so importing this module costs nothing. */
function defaultDeps(): Promise<CmsDeps> {
  defaults ??= (async () => {
    const em = await import('emdash');
    const { fallbackFromBundle } = await import('./cmsFallback');
    const reader: CmsReader = {
      async getEntry(collection, slug) {
        const { entry, error, cacheHint } = await em.getEmDashEntry(collection, slug);
        return { data: (entry?.data as Raw | undefined) ?? null, cacheHint, error };
      },
      async getList(collection) {
        const { entries, error, cacheHint } = await em.getEmDashCollection(collection);
        return {
          entries: entries.map((e) => ({ id: e.id, data: e.data as Raw })),
          cacheHint,
          error,
        };
      },
      async getMenu(name) {
        const { data, cacheHint } = await em.getMenuWithCacheHint(name);
        return { items: (data?.items as unknown as Raw[] | undefined) ?? null, cacheHint };
      },
    };
    return { reader, fallback: fallbackFromBundle(), log: defaultLog };
  })();
  return defaults;
}

/** Add a read's tags to the page's route cache (no-op in dev, where the cache is a stub). */
function tag(cache: RouteCache | undefined, hint: CacheHint | undefined): void {
  if (cache?.enabled && hint) cache.set(hint);
}

/* ----------------------------------------------------------------------------
   Field normalisers (use these inside a page's `normalize`)
   ---------------------------------------------------------------------------- */

/** A non-blank string, else undefined. Whitespace-only counts as empty. */
export const text = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() !== '' ? v : undefined;

/** D1 stores booleans as 0/1; accept those, 'true'/'1' and real booleans. */
export const bool = (v: unknown): boolean =>
  v === true || v === 1 || v === '1' || (typeof v === 'string' && v.toLowerCase() === 'true');

/** A finite number (D1 may hand a numeric string back), else undefined. */
export const num = (v: unknown): number | undefined => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
};

/** A whole number, else undefined. */
export const int = (v: unknown): number | undefined => {
  const n = num(v);
  return n === undefined ? undefined : Math.trunc(n);
};

/** A valid Date from an ISO string (or Date), else undefined. */
export const date = (v: unknown): Date | undefined => {
  if (v instanceof Date) return Number.isNaN(v.valueOf()) ? undefined : v;
  if (typeof v !== 'string' || !v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.valueOf()) ? undefined : d;
};

/**
 * A stored image value, else undefined. An un-uploaded migration reference
 * ({ "$file": "src/assets/..." }, as in the fallback JSON) has nothing to render,
 * so it counts as no image and the component falls back to its no-image state.
 */
export const image = (v: unknown): ImageValue | undefined => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;
  const o = v as Raw;
  if ('$file' in o) return undefined;
  return typeof o.src === 'string' || typeof o.id === 'string' ? (v as ImageValue) : undefined;
};

/** Repeater rows as an array of objects. Missing, null, malformed or JSON-text input. */
export function rowsOf(v: unknown): Raw[] {
  let value = v;
  if (typeof value === 'string' && value.trim() !== '') {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  return Array.isArray(value)
    ? value.filter((r): r is Raw => !!r && typeof r === 'object' && !Array.isArray(r))
    : [];
}

/** Repeater rows mapped through `map`; rows it maps to undefined are dropped. */
export function rows<T>(v: unknown, map: (row: Raw, index: number) => T | undefined): T[] {
  const out: T[] = [];
  rowsOf(v).forEach((row, i) => {
    const mapped = map(row, i);
    if (mapped !== undefined) out.push(mapped);
  });
  return out;
}

/** A repeater of `{ <key>: string }` rows as string[] (blank rows dropped). */
export const texts = (v: unknown, key = 'text'): string[] => rows(v, (r) => text(r[key]));

/** A Portable Text value as an array of nodes ([] for anything else). */
export const portable = (v: unknown): PTNode[] => (Array.isArray(v) ? (v as PTNode[]) : []);

/** `v` if it is one of `options`, else `fallback` (selects with a known option list). */
export function choice<T extends string>(v: unknown, options: readonly T[], fallback: T): T {
  return typeof v === 'string' && (options as readonly string[]).includes(v) ? (v as T) : fallback;
}

/* ----------------------------------------------------------------------------
   Reads
   ---------------------------------------------------------------------------- */

/**
 * One entry of a singleton collection, by its fixed slug.
 *
 *   const { data } = await getSingleton('page_services', 'services', normalizeServices, {
 *     cache: Astro.cache,
 *   });
 *
 * Reads the published entry. If it is missing or the read fails, falls back to
 * cms/content/<collection>.json (and logs). Throws only when neither exists.
 */
export async function getSingleton<T>(
  collection: string,
  slug: string,
  normalize: (raw: Raw) => T,
  opts: CmsOptions = {},
): Promise<CmsEntry<T>> {
  const deps = opts.deps ?? (await defaultDeps());
  let reason = '';
  try {
    const res = await deps.reader.getEntry(collection, slug);
    // Tag even a miss or error: publishing the entry later must purge this page.
    tag(opts.cache, res.cacheHint);
    if (res.error) {
      reason = `read of ${collection}/${slug} failed`;
      deps.log(`${reason}; serving the committed fallback`, res.error);
    } else if (!res.data) {
      reason = `${collection}/${slug} is missing or unpublished`;
      deps.log(`${reason}; serving the committed fallback`);
    } else {
      try {
        return { slug, data: normalize(res.data), source: 'cms' };
      } catch (e) {
        reason = `${collection}/${slug} could not be read as the expected shape`;
        deps.log(`${reason}; serving the committed fallback`, e);
      }
    }
  } catch (e) {
    reason = `read of ${collection}/${slug} threw`;
    deps.log(`${reason}; serving the committed fallback`, e);
  }
  const raw = deps.fallback.entry(collection, slug);
  if (!raw) {
    throw new Error(`[cms] ${reason}, and cms/content/${collection}.json has no entry "${slug}"`);
  }
  return { slug, data: normalize(raw), source: 'fallback' };
}

export interface OrderedOptions extends CmsOptions {
  /** Field to sort on. Default `sort_order`. */
  orderBy?: string;
  /** Default false (ascending). */
  descending?: boolean;
  /** Keep only the first N after sorting (the layouts have a fixed number of slots). */
  limit?: number;
}

/** Compare two raw values for an ordered list: numbers numerically, missing last. */
function compareField(a: unknown, b: unknown): number {
  const an = num(a);
  const bn = num(b);
  if (an !== undefined && bn !== undefined) return an - bn;
  if (an !== undefined) return -1;
  if (bn !== undefined) return 1;
  return 0;
}

/**
 * Every published entry of a list collection, sorted on `orderBy` (default
 * `sort_order`, ties broken by slug), first `limit` kept. Same fallback rule as
 * getSingleton, with one addition: an EMPTY result also falls back when a
 * committed JSON list exists (an unpublished tier row must not blank the table).
 * A collection with no JSON (photos, journal) simply returns [] when empty.
 */
export async function getOrdered<T>(
  collection: string,
  normalize: (raw: Raw, slug: string) => T,
  opts: OrderedOptions = {},
): Promise<CmsEntry<T>[]> {
  const deps = opts.deps ?? (await defaultDeps());
  const orderBy = opts.orderBy ?? 'sort_order';

  const finish = (items: { slug: string; data: Raw }[], source: CmsSource): CmsEntry<T>[] => {
    const sorted = items.slice().sort((a, b) => {
      const c = compareField(a.data[orderBy], b.data[orderBy]);
      return (opts.descending ? -c : c) || a.slug.localeCompare(b.slug);
    });
    const kept = opts.limit === undefined ? sorted : sorted.slice(0, opts.limit);
    return kept.map((i) => ({ slug: i.slug, data: normalize(i.data, i.slug), source }));
  };

  let reason = '';
  try {
    const res = await deps.reader.getList(collection);
    tag(opts.cache, res.cacheHint);
    if (res.error) {
      reason = `read of ${collection} failed`;
      deps.log(`${reason}; serving the committed fallback`, res.error);
    } else if (res.entries.length === 0 && deps.fallback.list(collection)) {
      reason = `${collection} has no published entries`;
      deps.log(`${reason}; serving the committed fallback`);
    } else {
      try {
        return finish(
          res.entries.map((e) => ({ slug: e.id, data: e.data })),
          'cms',
        );
      } catch (e) {
        reason = `${collection} could not be read as the expected shape`;
        deps.log(`${reason}; serving the committed fallback`, e);
      }
    }
  } catch (e) {
    reason = `read of ${collection} threw`;
    deps.log(`${reason}; serving the committed fallback`, e);
  }
  const list = deps.fallback.list(collection);
  if (!list) {
    // No committed copy to fall back to (photos, journal): an outage reads as empty.
    return [];
  }
  return finish(list, 'fallback');
}

/**
 * Give an internal page path its trailing slash. The Worker answers `/about`
 * with a 301 to `/about/`, so a menu link without the slash costs every click
 * (and every prefetch) an extra round trip. Leaves external URLs, hashes,
 * mailto/tel, file paths (`/rss.xml`) and anything already slashed alone.
 */
export function withTrailingSlash(url: string): string {
  if (!url.startsWith('/') || url.startsWith('//')) return url;
  const m = /^([^?#]*)(.*)$/.exec(url);
  const path = m?.[1] ?? url;
  const rest = m?.[2] ?? '';
  if (path === '' || path.endsWith('/')) return url;
  const last = path.slice(path.lastIndexOf('/') + 1);
  return last.includes('.') ? url : `${path}/${rest}`;
}

/** True for a label and url worth rendering. */
const isItem = (i: Raw): boolean => !!text(i.label) && !!text(i.url);

/**
 * The top-level items of an EmDash menu. Falls back to the `menus.json` entry
 * of the same name when the menu is missing, empty or unreadable. Items without
 * a label or url are dropped; nested children are ignored. Returns [] only when
 * neither the menu nor a fallback exists.
 */
export async function getMenuItems(name: string, opts: CmsOptions = {}): Promise<CmsMenuItem[]> {
  const deps = opts.deps ?? (await defaultDeps());
  try {
    const res = await deps.reader.getMenu(name);
    tag(opts.cache, res.cacheHint);
    const items = (res.items ?? []).filter(isItem).map((i): CmsMenuItem => ({
      label: String(i.label),
      url: withTrailingSlash(String(i.url)),
      target: text(i.target),
      titleAttr: text(i.titleAttr),
    }));
    if (items.length) return items;
    deps.log(`menu "${name}" is missing or empty; serving the committed fallback`);
  } catch (e) {
    deps.log(`read of menu "${name}" threw; serving the committed fallback`, e);
  }
  return deps.fallback.menu(name) ?? [];
}
