// Safe to edit.
/* ============================================================================
   cms-load.mjs
   ============================================================================
   The loading logic behind scripts/cms/load-content.mjs (CMS-DESIGN PR 3): put
   the literal values in cms/content/*.json into an EmDash instance. Kept
   separate from the command line so the unit tests (src/lib/cmsLoad.test.ts)
   can drive it with stub functions and no network.

   File shapes in cms/content/:

     <collection>.json   a singleton:  { "slug": "home", "data": { ... } }
                         or a list:    [ { "slug": "launch", "data": { ... } }, ... ]
     menus.json          { "primary": { "label": "Header navigation",
                                        "items": [ { "label", "url", "titleAttr?", "target?" } ] }, ... }
     redirects.json      [ { "source": "/now", "destination": "/about/#now", "type": 301 } ]

   Inside `data`, an image is { "$file": "src/assets/about/family.jpg", "alt": "..." }.
   The loader uploads the file once (SHA-1 de-dup) and swaps in the stored image
   value. Portable Text fields hold literal blocks (generate them from Markdown
   with `npm run cms:pt -- file.md`), so the same JSON also works as the offline
   fallback src/lib/cms.ts renders when an entry or D1 is missing.

   Everything is idempotent: a rerun against an instance that already holds the
   same values changes nothing and says "unchanged".
   ============================================================================ */
import { readFileSync } from 'node:fs';
import { stable } from './emdash-schema.mjs';

/** File basenames in cms/content/ that are not collections. */
export const SPECIAL_FILES = ['menus', 'redirects'];

/** Parse a cms/content/<collection>.json file into [{ slug, data }]. Throws on a bad shape. */
export function readEntries(path) {
  const json = JSON.parse(readFileSync(path, 'utf8'));
  return toEntries(json, path);
}

/** Validate and normalise a singleton object or a list of entries. */
export function toEntries(json, label = 'content') {
  const list = Array.isArray(json) ? json : [json];
  const seen = new Set();
  return list.map((e, i) => {
    if (!e || typeof e.slug !== 'string' || !e.slug) {
      throw new Error(`${label}[${i}]: every entry needs a string "slug"`);
    }
    if (!e.data || typeof e.data !== 'object' || Array.isArray(e.data)) {
      throw new Error(`${label}[${i}] (${e.slug}): "data" must be an object`);
    }
    if (seen.has(e.slug)) throw new Error(`${label}: duplicate slug "${e.slug}"`);
    seen.add(e.slug);
    return { slug: e.slug, data: e.data };
  });
}

/**
 * Deep copy of `value` with every { "$file", "alt" } replaced by
 * imageValue(file, alt). Everything else is copied untouched.
 */
export function resolveFiles(value, imageValue) {
  if (Array.isArray(value)) return value.map((v) => resolveFiles(v, imageValue));
  if (value && typeof value === 'object') {
    if (typeof value.$file === 'string') return imageValue(value.$file, value.alt);
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = resolveFiles(v, imageValue);
    return out;
  }
  return value;
}

/** True when `value` still contains an unresolved { "$file" } anywhere. */
export function hasFileRefs(value) {
  if (Array.isArray(value)) return value.some(hasFileRefs);
  if (value && typeof value === 'object') {
    return typeof value.$file === 'string' || Object.values(value).some(hasFileRefs);
  }
  return false;
}

/** The data object of a `content get --raw` result (the CLI nests it under `data`). */
export const dataOf = (existing) => existing?.data ?? existing?.item?.data ?? {};

/** The revision token a `content update --rev` needs. */
export const revOf = (existing) => existing?._rev ?? existing?.item?._rev;

/**
 * EmDash stores a boolean field as 0 or 1, so a stored `false` reads back as `0`.
 * Fold booleans to 0/1 (deeply, so repeater rows are covered too) on both sides
 * before comparing, otherwise every entry with a boolean looks changed forever.
 */
function foldBooleans(value) {
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (Array.isArray(value)) return value.map(foldBooleans);
  if (value && typeof value === 'object') {
    // An image value: EmDash stores it without `src` and adds blurhash, dominant
    // colour and the like to `meta`, so the value the loader builds never matches
    // the stored one key for key. Which file and its alt text are what matter.
    if (typeof value.provider === 'string' && typeof value.id === 'string') {
      return { id: value.id, alt: value.alt ?? '' };
    }
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, foldBooleans(v)]));
  }
  return value;
}

/** True when every key in `desired` already holds the same value in `current`. */
export function sameData(current, desired) {
  return Object.keys(desired).every(
    (k) => stable(foldBooleans(current?.[k])) === stable(foldBooleans(desired[k])),
  );
}

/** What to do for one entry, given what the instance holds (or null). */
export function planEntry(existing, desired, { force = false } = {}) {
  if (!existing) return 'create';
  if (!force && sameData(dataOf(existing), desired)) {
    const status = existing.status ?? existing.item?.status;
    return status && status !== 'published' ? 'publish' : 'unchanged';
  }
  return 'update';
}

/**
 * Load a list of entries into one collection.
 *
 *   emdashFn(args)        the `emdash` CLI with the url bound, returns parsed JSON
 *   withFile(data, fn)    writes data to a temp JSON file, calls fn(path)
 *   imageValue(file,alt)  from scripts/lib/emdash-media.mjs
 *
 * Returns [{ slug, action }] where action is created, updated, published or
 * unchanged. With dryRun nothing is written and the action is what WOULD happen.
 */
export function loadEntries({
  collection,
  entries,
  emdashFn,
  withFile,
  imageValue,
  dryRun = false,
  force = false,
  log = console.log,
}) {
  const results = [];
  for (const { slug, data: raw } of entries) {
    const data = resolveFiles(raw, imageValue);
    let existing = null;
    try {
      existing = emdashFn(['content', 'get', collection, slug, '--raw']);
    } catch (e) {
      if (!/not found/i.test(e.message)) throw e;
    }
    const action = planEntry(existing, data, { force });
    log(`  ${slug}: ${dryRun ? 'would ' : ''}${action}`);
    results.push({ slug, action });
    if (dryRun || action === 'unchanged') continue;
    if (action === 'create') {
      withFile(data, (f) =>
        emdashFn(['content', 'create', collection, '--slug', slug, '--file', f]),
      );
    } else if (action === 'update') {
      const rev = revOf(existing);
      if (!rev) throw new Error(`no _rev on existing ${collection}/${slug}; cannot update safely`);
      withFile(data, (f) =>
        emdashFn(['content', 'update', collection, existing.id || slug, '--rev', rev, '--file', f]),
      );
    } else if (action === 'publish') {
      emdashFn(['content', 'publish', collection, existing.id || slug]);
    }
  }
  return results;
}

/* ----------------------------------------------------------------------------
   Menus and redirects (REST only: the CLI can read menus, not write them)
   ---------------------------------------------------------------------------- */

const itemUrl = (i) => i.customUrl ?? i.custom_url ?? i.url ?? '';
const itemKey = (i) => [i.label, itemUrl(i), i.titleAttr ?? i.title_attr ?? '', i.target ?? ''];

/** True when the instance's top-level items already equal the wanted ones, in order. */
export function sameMenuItems(have, wanted) {
  const top = (have || []).filter((i) => !i.parentId && !i.parent_id);
  if (top.length !== wanted.length) return false;
  return top.every(
    (h, i) =>
      stable(itemKey(h)) ===
      stable([wanted[i].label, wanted[i].url, wanted[i].titleAttr ?? '', wanted[i].target ?? '']),
  );
}

/**
 * Make each menu in `menus` ({ name: { label, items } }) match. A menu whose items differ is
 * emptied and rebuilt in order (custom-URL items; the items carry no history worth keeping).
 */
export async function loadMenus(request, menus, { dryRun = false, log = console.log } = {}) {
  const existing = (await request('GET', '/menus')) || [];
  const have = new Set(
    (Array.isArray(existing) ? existing : existing.items || []).map((m) => m.name),
  );
  const results = [];
  for (const [name, def] of Object.entries(menus)) {
    if (!Array.isArray(def.items) || !def.label) {
      throw new Error(`menus.json "${name}": needs a label and an items array`);
    }
    let current = [];
    if (have.has(name)) current = ((await request('GET', `/menus/${name}`)) || {}).items || [];
    else {
      log(`  menu ${name}: ${dryRun ? 'would create' : 'created'}`);
      if (!dryRun) await request('POST', '/menus', { name, label: def.label });
    }
    if (have.has(name) && sameMenuItems(current, def.items)) {
      log(`  menu ${name}: unchanged`);
      results.push({ name, action: 'unchanged' });
      continue;
    }
    log(`  menu ${name}: ${dryRun ? 'would rebuild' : 'rebuilt'} ${def.items.length} items`);
    results.push({ name, action: have.has(name) ? 'rebuilt' : 'created' });
    if (dryRun) continue;
    for (const it of current) await request('DELETE', `/menus/${name}/items/${it.id}`);
    for (const [i, it] of def.items.entries()) {
      await request('POST', `/menus/${name}/items`, {
        type: 'custom',
        label: it.label,
        customUrl: it.url,
        ...(it.target ? { target: it.target } : {}),
        ...(it.titleAttr ? { titleAttr: it.titleAttr } : {}),
        sortOrder: i,
      });
    }
  }
  return results;
}

/** Make the instance hold every redirect in `list` (matched by source path). */
export async function loadRedirects(request, list, { dryRun = false, log = console.log } = {}) {
  const res = (await request('GET', '/redirects?limit=100')) || {};
  const existing = new Map((res.items || []).map((r) => [r.source, r]));
  const results = [];
  for (const r of list) {
    if (!r.source || !r.destination)
      throw new Error('redirects.json: source and destination are required');
    const want = {
      source: r.source,
      destination: r.destination,
      type: r.type ?? 301,
      enabled: true,
    };
    const have = existing.get(r.source);
    let action = 'created';
    if (have) {
      const same =
        have.destination === want.destination &&
        Number(have.type) === want.type &&
        Boolean(have.enabled) === true;
      action = same ? 'unchanged' : 'updated';
    }
    log(`  redirect ${r.source}: ${dryRun ? 'would ' : ''}${action}`);
    results.push({ source: r.source, action });
    if (dryRun || action === 'unchanged') continue;
    if (action === 'created') await request('POST', '/redirects', want);
    else await request('PUT', `/redirects/${have.id}`, want);
  }
  return results;
}
