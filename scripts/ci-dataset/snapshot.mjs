// Safe to edit.
/* ============================================================================
   snapshot.mjs  (scripts/ci-dataset)
   ============================================================================
   Writes the two committed files that rebuild.mjs applies to the CI dataset:

     scripts/ci-dataset/rows.sql    INSERT OR REPLACE statements (content rows,
                                    their media rows, taxonomy terms and links)
     scripts/ci-dataset/media.json  the files rebuild.mjs copies into R2

     node scripts/ci-dataset/snapshot.mjs            # rewrite both files
     node scripts/ci-dataset/snapshot.mjs --check    # exit 1 if they would change

   READ-ONLY against production. Content and media rows come from the `emdash`
   CLI's stored login (`content list/get`, `media list`, `taxonomy terms`), the
   same channel scripts/export-seed-from-instance.mjs uses. Nothing here touches
   production D1 or R2, and nothing writes anywhere but the two files above.
   (The only other read is a PRAGMA table_info against the CI database, so a row
   only ever names columns that exist on both sides.)

   WHICH ROWS (the allowlist, edit CASE_STUDY_SLUGS / SNAPSHOT_ALL below)
     - case_studies: exactly the three slugs tests/routes.ts lists.
     - Every singleton or list collection from docs/CMS-DESIGN.md: ALL published
       entries, but only once the collection exists in production (until then it
       is skipped with a note, so this file never needs a code change when a
       CMS PR lands).
     - NEVER users, sessions, tokens, passkeys or options. The few options the
       site needs (setup flags, title, tagline) live in fixtures.sql.

   HOW A ROW IS BUILT
     The `content get --raw --published` output is mapped field by field to the
     ec_<collection> column of the same name (images and repeaters as JSON text,
     booleans as 0/1). author, byline and revision ids are left NULL (the CI
     database has no users or revisions). Media keep production's storage keys,
     so the R2 copy is a straight copy under the same key.

   TAXONOMY LINKS
     Which terms an entry carries is not readable through the CLI, so the CI view
     is pinned in terms.json ({ slug: { taxonomy: [term slugs] } }). Edit that
     file when a CI case study should carry different tags; CI deliberately does
     not track Nathan's tag edits in the admin.
   ============================================================================ */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { emdash } from '../lib/emdash-cli.mjs';
import { DIR, PROD_URL, d1Query, insertRow, lit } from './lib.mjs';

/** The CI case studies. Keep equal to caseStudySlugs in tests/routes.ts. */
const CASE_STUDY_SLUGS = ['presbyterian-academy', 'reid-design', 'second-presbyterian-chicago'];

/** Collections snapshotted in full (all published entries), once they exist in production. */
const SNAPSHOT_ALL = [
  'site_settings',
  'page_home',
  'page_services',
  'page_about',
  'page_contact',
  'page_work',
  'page_photography',
  'page_journal',
  'page_not_found',
  'pricing_tiers',
  'pricing_addons',
  'service_offerings',
  // The EmDash template's prose collection (privacy, accessibility, colophon).
  'pages',
];

/** Column values forced for the CI copy (all three CI studies fill the Selected Work strip). */
const OVERRIDES = { case_studies: { featured: 1 } };

const check = process.argv.includes('--check');
const ULID_FIELDS_TO_NULL = new Set(['author_id', 'primary_byline_id']);

const asArray = (r) => (Array.isArray(r) ? r : (r?.items ?? []));

/** Serialise one field value for its column. undefined/null means "leave the column NULL". */
function columnValue(type, v) {
  if (v === undefined || v === null) return undefined;
  if (type === 'boolean') return v ? 1 : 0;
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}

/** Every local media id referenced anywhere inside a value. */
function mediaIds(v, out = new Set()) {
  if (Array.isArray(v)) v.forEach((x) => mediaIds(x, out));
  else if (v && typeof v === 'object') {
    if (v.provider === 'local' && typeof v.id === 'string') out.add(v.id);
    Object.values(v).forEach((x) => mediaIds(x, out));
  }
  return out;
}

const schemaList = asArray(emdash(PROD_URL, ['schema', 'list'])).map((c) => c.slug);
const statements = { deletes: [], media: [], terms: [], rows: [], links: [] };
const neededMedia = new Set();
const entryIdBySlug = new Map();
const notes = [];
let rowCount = 0;

const plan = [['case_studies', CASE_STUDY_SLUGS], ...SNAPSHOT_ALL.map((c) => [c, null])];

for (const [collection, slugs] of plan) {
  if (!schemaList.includes(collection)) {
    if (slugs) throw new Error(`collection ${collection} is not in production`);
    notes.push(collection);
    continue;
  }
  const table = `ec_${collection}`;
  const ciCols = new Set(d1Query(`PRAGMA table_info(${table})`).map((c) => c.name));
  if (ciCols.size === 0) {
    throw new Error(`${table} does not exist in ncs-ci; rebuild it from the current seed first`);
  }
  const fields = new Map(
    emdash(PROD_URL, ['schema', 'get', collection]).fields.map((f) => [f.slug, f.type]),
  );
  const published = asArray(emdash(PROD_URL, ['content', 'list', collection, '--limit', '100']))
    .filter((e) => e.status === 'published')
    .filter((e) => !slugs || slugs.includes(e.slug))
    .sort((a, b) => a.slug.localeCompare(b.slug));
  if (slugs) {
    const missing = slugs.filter((s) => !published.some((e) => e.slug === s));
    if (missing.length)
      throw new Error(`${collection}: not published in production: ${missing.join(', ')}`);
  }

  for (const item of published) {
    const e = emdash(PROD_URL, ['content', 'get', collection, item.id, '--raw', '--published']);
    entryIdBySlug.set(`${collection}/${e.slug}`, e.id);
    const row = {
      id: e.id,
      slug: e.slug,
      status: e.status,
      created_at: e.createdAt,
      updated_at: e.updatedAt,
      published_at: e.publishedAt,
      version: e.version,
      locale: e.locale,
      translation_group: e.translationGroup,
    };
    for (const [slug, value] of Object.entries(e.data)) {
      const v = columnValue(fields.get(slug), value);
      if (v === undefined) continue;
      if (!ciCols.has(slug))
        throw new Error(
          `${table} in ncs-ci has no column "${slug}"; rebuild from the current seed`,
        );
      row[slug] = v;
      mediaIds(value, neededMedia);
    }
    Object.assign(row, OVERRIDES[collection] ?? {});
    for (const c of ULID_FIELDS_TO_NULL) delete row[c];
    statements.rows.push(insertRow(table, row));
    rowCount += 1;
  }
  const keep = published.map((e) => lit(e.slug)).join(', ');
  statements.deletes.push(`DELETE FROM ${table}${keep ? ` WHERE slug NOT IN (${keep})` : ''};`);
}

// ---- media: full rows and the file list --------------------------------------
const allMedia = [];
let cursor;
do {
  const page = emdash(PROD_URL, [
    'media',
    'list',
    '--limit',
    '100',
    ...(cursor ? ['--cursor', cursor] : []),
  ]);
  allMedia.push(...asArray(page));
  cursor = page?.nextCursor || undefined;
} while (cursor);
const mediaById = new Map(allMedia.map((m) => [m.id, m]));
const files = [];
for (const id of [...neededMedia].sort()) {
  const m = mediaById.get(id);
  if (!m) throw new Error(`media ${id} is referenced by an entry but not in media list`);
  statements.media.push(
    insertRow('media', {
      id: m.id,
      filename: m.filename,
      mime_type: m.mimeType,
      size: m.size,
      width: m.width,
      height: m.height,
      alt: m.alt,
      caption: m.caption,
      storage_key: m.storageKey,
      content_hash: m.contentHash,
      created_at: m.createdAt,
      status: m.status,
      blurhash: m.blurhash,
      dominant_color: m.dominantColor,
      focal_x: m.focalX,
      focal_y: m.focalY,
    }),
  );
  files.push({
    id: m.id,
    storageKey: m.storageKey,
    mimeType: m.mimeType,
    size: m.size,
    contentHash: m.contentHash,
    filename: m.filename,
  });
}

// ---- taxonomy terms and links (pinned in terms.json) -------------------------
const pinned = JSON.parse(readFileSync(resolve(DIR, 'terms.json'), 'utf8'));
const termCache = new Map();
const termsOf = (taxonomy) => {
  if (!termCache.has(taxonomy)) {
    termCache.set(taxonomy, asArray(emdash(PROD_URL, ['taxonomy', 'terms', taxonomy])));
  }
  return termCache.get(taxonomy);
};
const usedTerms = new Map();
const links = [];
for (const slug of CASE_STUDY_SLUGS) {
  const entryId = entryIdBySlug.get(`case_studies/${slug}`);
  for (const [taxonomy, termSlugs] of Object.entries(pinned[slug] ?? {})) {
    const all = termsOf(taxonomy);
    for (const termSlug of termSlugs) {
      const index = all.findIndex((t) => t.slug === termSlug);
      if (index === -1)
        throw new Error(`terms.json: no ${taxonomy} term "${termSlug}" in production`);
      const t = all[index];
      usedTerms.set(t.id, {
        id: t.id,
        name: t.name,
        slug: t.slug,
        label: t.label,
        parent_id: t.parentId,
        locale: t.locale,
        translation_group: t.translationGroup,
        sort_order: index,
      });
      links.push({ collection: 'case_studies', entry_id: entryId, taxonomy_id: t.id });
    }
  }
}
statements.terms = [...usedTerms.values()]
  .sort((a, b) => a.name.localeCompare(b.name) || a.sort_order - b.sort_order)
  .map((t) => insertRow('taxonomies', t));
statements.links.push("DELETE FROM content_taxonomies WHERE collection = 'case_studies';");
links
  .sort(
    (a, b) => a.entry_id.localeCompare(b.entry_id) || a.taxonomy_id.localeCompare(b.taxonomy_id),
  )
  .forEach((l) => statements.links.push(insertRow('content_taxonomies', l)));

// ---- write (or compare) ------------------------------------------------------
const header = [
  '-- GENERATED by scripts/ci-dataset/snapshot.mjs. Do not edit by hand.',
  '-- Source: production, read through the emdash CLI login. Applied by rebuild.mjs.',
  `-- ${rowCount} content row(s), ${statements.media.length} media row(s), ${statements.terms.length} taxonomy term(s).`,
  ...(notes.length ? [`-- not in production yet, so not snapshotted: ${notes.join(', ')}`] : []),
];
const sql =
  [
    ...header,
    ...statements.deletes,
    ...statements.media,
    ...statements.terms,
    ...statements.rows,
    ...statements.links,
  ].join('\n') + '\n';
const json = JSON.stringify(files, null, 2) + '\n';

mkdirSync(DIR, { recursive: true });
const targets = [
  [resolve(DIR, 'rows.sql'), sql],
  [resolve(DIR, 'media.json'), json],
];
let changed = false;
for (const [path, content] of targets) {
  let current = '';
  try {
    current = readFileSync(path, 'utf8');
  } catch {
    // first run
  }
  if (current !== content) changed = true;
  if (!check) writeFileSync(path, content);
}
console.log(
  `${check ? 'checked' : 'wrote'} rows.sql (${rowCount} rows) and media.json (${files.length} files)` +
    (check ? (changed ? ': OUT OF DATE' : ': up to date') : changed ? '' : ' (unchanged)'),
);
if (notes.length) console.log(`note: not in production yet, skipped: ${notes.join(', ')}`);
if (check && changed) process.exit(1);
