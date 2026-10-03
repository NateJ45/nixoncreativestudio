// Safe to edit.
/* ============================================================================
   cms-fixtures.mjs  (scripts/ci-dataset)
   ============================================================================
   Gives the CI dataset (D1 ncs-ci) the same CMS data the site reads in
   production, WITHOUT touching production. CMS-DESIGN PR 4 onwards ships its
   schema and content before the main session can load them into production (that
   needs an admin API token), so snapshot.mjs (which reads production) has
   nothing to copy yet. This script builds the CI copy from the committed
   sources instead:

     cms/schema/<collection>.mjs    the collection definition   -> seed/seed.json
     cms/content/menus.json         the menus                   -> seed/seed.json
     cms/content/<collection>.json  the entries                 -> cms-rows.sql
     { "$file": "src/assets/..." }  repo images inside an entry -> media rows in
                                    cms-rows.sql + cms-media.json

   Three generated outputs, all committed:

     seed/seed.json                 gains the collections and menus (EmDash applies
                                    the seed on first run, so `rebuild.mjs
                                    --from-scratch` creates the tables and menus)
     scripts/ci-dataset/cms-rows.sql  one INSERT OR REPLACE per entry (and per media
                                    item), applied by rebuild.mjs right after rows.sql
     scripts/ci-dataset/cms-media.json  the files behind those media rows, with the
                                    repo path each is read from. rebuild.mjs uploads
                                    them to ncs-ci-media from the local checkout
                                    (they are not on the live site: they are bundled
                                    site images such as the About photos)

     node scripts/ci-dataset/cms-fixtures.mjs           # rewrite both files
     node scripts/ci-dataset/cms-fixtures.mjs --check   # exit 1 if any is out of date

   WHEN PRODUCTION HAS THE DATA. After the main session has applied a collection's
   schema and loaded its content into production (docs/LAUNCH-RUNBOOK.md), the
   regular path takes over: snapshot.mjs already lists the CMS collections in
   SNAPSHOT_ALL and starts copying real rows into rows.sql. Add that collection
   to PRODUCTION_HAS below so this script stops generating a second copy of it,
   then re-run both scripts. Menus come from the re-exported seed at that point.

   Nothing here writes anywhere but the two files above and nothing reaches the
   network. (Applying them to ncs-ci is rebuild.mjs's job.)
   ============================================================================ */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { format, resolveConfig } from 'prettier';
import sharp from 'sharp';
import { DIR, ROOT, insertRow } from './lib.mjs';

/** Collections already loaded into production: snapshot.mjs carries them, so skip them here. */
export const PRODUCTION_HAS = [];

/** Fixed timestamp for generated rows, so the file is byte-stable between runs. */
const STAMP = '2026-10-03T00:00:00.000Z';

const SCHEMA_DIR = join(ROOT, 'cms/schema');
const CONTENT_DIR = join(ROOT, 'cms/content');
const SEED_PATH = join(ROOT, 'seed/seed.json');
const ROWS_PATH = resolve(DIR, 'cms-rows.sql');
const MEDIA_PATH = resolve(DIR, 'cms-media.json');

const MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

/** A 26-character, ULID-shaped, deterministic id (Crockford base32 has every hex digit). */
export function stableId(collection, slug) {
  const hex = createHash('sha1').update(`${collection}/${slug}`).digest('hex');
  return `01CI${hex.slice(0, 22).toUpperCase()}`;
}

/**
 * Turn every { "$file": "src/assets/...", "alt" } in an entry into the EmDash image
 * value the CMS stores (the same shape `emdash media upload` plus the loader
 * produce: a media id and the storage key in `meta`), and collect the media rows
 * and upload list that go with them. A file used twice becomes one media row.
 *
 * Ids and storage keys are derived from the repo path and the bytes, so the
 * output is byte-stable between runs. The storage key is 26 hex digits of the
 * file's SHA-1 plus its extension, the shape of EmDash's own keys.
 */
export async function resolveImages(entries) {
  const media = new Map(); // repo path -> { row, upload }
  const describe = async (file) => {
    const known = media.get(file);
    if (known) return known;
    const abs = join(ROOT, file);
    if (!existsSync(abs)) throw new Error(`image not found: ${file}`);
    const bytes = readFileSync(abs);
    const ext = extname(file).toLowerCase();
    const mimeType = MIME[ext];
    if (!mimeType) throw new Error(`unsupported image type: ${file}`);
    const sha1 = createHash('sha1').update(bytes).digest('hex');
    const meta = await sharp(bytes).metadata();
    const { dominant } = await sharp(bytes).stats();
    const filename = file.split('/').pop();
    const info = {
      id: stableId('media', file),
      filename,
      mimeType,
      size: bytes.length,
      width: meta.width,
      height: meta.height,
      dominantColor: `rgb(${dominant.r},${dominant.g},${dominant.b})`,
      storageKey: `${sha1.slice(0, 26).toUpperCase()}${ext}`,
      contentHash: `sha1:${sha1}`,
      source: file,
    };
    media.set(file, info);
    return info;
  };
  const walk = async (v) => {
    if (Array.isArray(v)) return Promise.all(v.map(walk));
    if (v && typeof v === 'object') {
      if (typeof v.$file === 'string') {
        const m = await describe(v.$file);
        return {
          id: m.id,
          provider: 'local',
          filename: m.filename,
          mimeType: m.mimeType,
          width: m.width,
          height: m.height,
          dominantColor: m.dominantColor,
          alt: v.alt ?? '',
          meta: { storageKey: m.storageKey, dominantColor: m.dominantColor },
        };
      }
      const out = {};
      for (const [k, x] of Object.entries(v)) out[k] = await walk(x);
      return out;
    }
    return v;
  };
  const resolved = [];
  for (const e of entries) resolved.push({ ...e, data: await walk(e.data) });
  const list = [...media.values()].sort((a, b) => a.source.localeCompare(b.source));
  return { entries: resolved, media: list };
}

/** The `media` INSERT for one resolved image (the columns the snapshot's own rows use). */
export function mediaSql(m) {
  return insertRow('media', {
    id: m.id,
    filename: m.filename,
    mime_type: m.mimeType,
    size: m.size,
    width: m.width,
    height: m.height,
    storage_key: m.storageKey,
    content_hash: m.contentHash,
    created_at: STAMP,
    status: 'ready',
    dominant_color: m.dominantColor,
  });
}

/** The seed.json collection entry for a cms/schema definition. */
export function seedCollection(def) {
  const { COLLECTION, FIELDS, SLUG } = def;
  return {
    slug: SLUG,
    ...COLLECTION,
    fields: FIELDS.map((f) => {
      const field = { slug: f.slug, label: f.label, type: f.type };
      if (f.required) field.required = true;
      if (f.searchable) field.searchable = true;
      if (f.indexed) field.indexed = true;
      if (f.validation) field.validation = f.validation;
      return field;
    }),
  };
}

/** The seed.json menus array for cms/content/menus.json. */
export function seedMenus(menus) {
  return Object.entries(menus).map(([name, menu]) => ({
    name,
    label: menu.label,
    items: menu.items.map((i) => ({
      type: 'custom',
      label: i.label,
      url: i.url,
      ...(i.target ? { target: i.target } : {}),
      ...(i.titleAttr ? { titleAttr: i.titleAttr } : {}),
    })),
  }));
}

/** Column value for a field: text, number, 0/1 for booleans, JSON text for objects. */
function columnValue(type, v) {
  if (v === undefined || v === null || v === '') return undefined;
  if (type === 'boolean') return v ? 1 : 0;
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}

/** The `INSERT OR REPLACE` statements (and the stale-row delete) for one collection. */
export function rowsSql(def, entries) {
  const table = `ec_${def.SLUG}`;
  const types = new Map(def.FIELDS.map((f) => [f.slug, f.type]));
  const lines = [];
  const keep = entries.map((e) => `'${e.slug.replace(/'/g, "''")}'`).join(', ');
  lines.push(`DELETE FROM ${table} WHERE slug NOT IN (${keep});`);
  for (const e of entries) {
    const id = stableId(def.SLUG, e.slug);
    const row = {
      id,
      slug: e.slug,
      status: 'published',
      created_at: STAMP,
      updated_at: STAMP,
      published_at: STAMP,
      version: 1,
      locale: 'en',
      translation_group: id,
    };
    for (const [slug, value] of Object.entries(e.data)) {
      if (!types.has(slug)) throw new Error(`${def.SLUG}/${e.slug}: "${slug}" is not a field`);
      const v = columnValue(types.get(slug), value);
      if (v !== undefined) row[slug] = v;
    }
    lines.push(insertRow(table, row));
  }
  return lines;
}

/** Every collection that has both a schema file and a content file, minus PRODUCTION_HAS. */
async function loadCollections() {
  const out = [];
  if (!existsSync(SCHEMA_DIR)) return out;
  for (const file of readdirSync(SCHEMA_DIR)
    .filter((f) => f.endsWith('.mjs'))
    .sort()) {
    const name = file.replace(/\.mjs$/, '');
    const contentFile = join(CONTENT_DIR, `${name}.json`);
    if (!existsSync(contentFile)) continue;
    const def = await import(pathToFileURL(join(SCHEMA_DIR, file)).href);
    const json = JSON.parse(readFileSync(contentFile, 'utf8'));
    out.push({ def, entries: (Array.isArray(json) ? json : [json]).map((e) => ({ ...e })) });
  }
  return out;
}

/** Build all three outputs as strings. Exported so a unit test can prove the committed files are current. */
export async function build() {
  const all = await loadCollections();
  const inSeed = all; // the schema always goes in the seed, even once production has it
  const inRows = all.filter((c) => !PRODUCTION_HAS.includes(c.def.SLUG));

  const seed = JSON.parse(readFileSync(SEED_PATH, 'utf8'));
  const cmsSlugs = new Set(inSeed.map((c) => c.def.SLUG));
  seed.collections = [
    ...seed.collections.filter((c) => !cmsSlugs.has(c.slug)),
    ...inSeed.map((c) => seedCollection(c.def)),
  ];
  const menusFile = join(CONTENT_DIR, 'menus.json');
  if (existsSync(menusFile)) {
    const wanted = seedMenus(JSON.parse(readFileSync(menusFile, 'utf8')));
    const names = new Set(wanted.map((m) => m.name));
    seed.menus = [...(seed.menus ?? []).filter((m) => !names.has(m.name)), ...wanted];
  }
  const options = (await resolveConfig(SEED_PATH)) ?? {};
  const seedText = await format(JSON.stringify(seed, null, 2), { ...options, filepath: SEED_PATH });

  const header = [
    '-- GENERATED by scripts/ci-dataset/cms-fixtures.mjs. Do not edit by hand.',
    '-- Source: cms/schema/*.mjs and cms/content/*.json (not production). Applied by rebuild.mjs.',
    `-- Collections: ${inRows.map((c) => c.def.SLUG).join(', ') || '(none)'}.`,
  ];
  // Repo images inside entries become media rows (media first: entries point at them).
  const resolvedRows = [];
  const media = new Map();
  for (const c of inRows) {
    const r = await resolveImages(c.entries);
    resolvedRows.push({ def: c.def, entries: r.entries });
    for (const m of r.media) media.set(m.source, m);
  }
  const mediaList = [...media.values()].sort((a, b) => a.source.localeCompare(b.source));
  const sql =
    [
      ...header,
      ...mediaList.map(mediaSql),
      ...resolvedRows.flatMap((c) => rowsSql(c.def, c.entries)),
    ].join('\n') + '\n';
  const mediaText = await format(JSON.stringify(mediaList, null, 2), {
    ...options,
    filepath: MEDIA_PATH,
  });
  return { seedText, sql, mediaText };
}

const isMain = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const check = process.argv.includes('--check');
  const { seedText, sql, mediaText } = await build();
  let stale = false;
  for (const [path, content] of [
    [SEED_PATH, seedText],
    [ROWS_PATH, sql],
    [MEDIA_PATH, mediaText],
  ]) {
    const current = existsSync(path) ? readFileSync(path, 'utf8') : '';
    if (current !== content) {
      stale = true;
      if (!check) writeFileSync(path, content);
    }
  }
  console.log(
    check
      ? stale
        ? 'seed/seed.json, cms-rows.sql or cms-media.json is OUT OF DATE: run node scripts/ci-dataset/cms-fixtures.mjs'
        : 'seed/seed.json, cms-rows.sql and cms-media.json are up to date'
      : stale
        ? 'wrote seed/seed.json, cms-rows.sql and cms-media.json'
        : 'seed/seed.json, cms-rows.sql and cms-media.json already up to date',
  );
  if (check && stale) process.exit(1);
}
