/* ============================================================================
   cmsFallback (the committed migration JSON, bundled)
   ============================================================================
   Foundation, edit with care.

   Bundles every cms/content/*.json at build time (Vite's eager glob, so the
   Worker needs no filesystem) and exposes it through the CmsFallback shape
   src/lib/cms.ts expects. Loaded only by cms.ts's default wiring, and only on
   first use, because `import.meta.glob` exists in Vite builds and not in the
   plain Node the unit tests run under; the tests pass their own fallback.

   File shapes (also what scripts/cms/load-content.mjs reads):
     <collection>.json   { "slug": "home", "data": { ... } }   (a singleton)
                         [ { "slug": "...", "data": { ... } } ]  (a list)
     menus.json          { "primary": { "label": "...", "items": [ { label, url, titleAttr?, target? } ] } }
     redirects.json      not read here (EmDash applies redirects itself)
   ============================================================================ */

import type { CmsFallback, CmsMenuItem, Raw } from './cms';

type Entry = { slug: string; data: Raw };

/** Turn a parsed JSON file into entries; anything malformed yields []. */
export function entriesOfJson(json: unknown): Entry[] {
  const list = Array.isArray(json) ? json : json ? [json] : [];
  return list.filter(
    (e): e is Entry =>
      !!e &&
      typeof (e as Entry).slug === 'string' &&
      !!(e as Entry).data &&
      typeof (e as Entry).data === 'object',
  );
}

/** Build the fallback reader from a map of collection name -> parsed JSON. */
export function fallbackFromFiles(files: Record<string, unknown>): CmsFallback {
  return {
    entry(collection, slug) {
      return entriesOfJson(files[collection]).find((e) => e.slug === slug)?.data;
    },
    list(collection) {
      const entries = entriesOfJson(files[collection]);
      return entries.length ? entries : undefined;
    },
    menu(name) {
      const menus = files.menus as Record<string, { items?: Raw[] }> | undefined;
      const items = menus?.[name]?.items;
      if (!Array.isArray(items)) return undefined;
      const out = items
        .filter((i) => typeof i.label === 'string' && typeof i.url === 'string')
        .map((i): CmsMenuItem => ({
          label: i.label as string,
          url: i.url as string,
          target: typeof i.target === 'string' && i.target ? i.target : undefined,
          titleAttr: typeof i.titleAttr === 'string' && i.titleAttr ? i.titleAttr : undefined,
        }));
      return out.length ? out : undefined;
    },
  };
}

/** The bundled cms/content/*.json, keyed by file name without the extension. */
export function fallbackFromBundle(): CmsFallback {
  const modules = import.meta.glob('../../cms/content/*.json', {
    eager: true,
    import: 'default',
  }) as Record<string, unknown>;
  const files: Record<string, unknown> = {};
  for (const [path, json] of Object.entries(modules)) {
    const name = path
      .split('/')
      .pop()
      ?.replace(/\.json$/, '');
    if (name) files[name] = json;
  }
  return fallbackFromFiles(files);
}
