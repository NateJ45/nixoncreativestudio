// Safe to edit.
/* ============================================================================
   export-seed-from-instance.mjs
   ============================================================================
   Writes seed/seed.json (schema, taxonomies, menus, redirects; NO content) from
   a RUNNING EmDash instance, through the `emdash` CLI login.

     node scripts/export-seed-from-instance.mjs --url https://<instance>
     node scripts/export-seed-from-instance.mjs --url https://<instance> --check

   --check writes nothing: it prints whether seed/seed.json still matches the
   instance and exits 1 when it does not. Use it to prove the seed round-trips
   (docs/CMS-DESIGN.md, section 2.4) and to spot schema drift between production
   and the committed seed.

   Why not `npx emdash export-seed`: that command reads a local SQLite file
   (--database), not a deployed D1 database, so it cannot see a deployed
   instance. This script builds the same seed shape from `schema get`,
   `taxonomy terms` and `menu get`, mirroring the field mapping in emdash's own
   exportSeed.

   What the CLI cannot see: a collection's titleField, sortOrder, admin and
   dateField, and the redirect list. With EMDASH_TOKEN set (Settings, API
   tokens) this script reads them over REST and puts them in the seed; without
   a token it says so and leaves them out, so a seed exported without a token
   does not carry them. Menus and redirects are written only when the instance
   has some, so today's seed is unchanged by them.

   The seed creates the schema on a fresh instance: it is applied once,
   automatically, before the setup wizard is completed. Taxonomy terms ship in
   the seed too (the lists are small and stable); entries are loaded with
   scripts/migrate-case-studies.mjs (or, for the CI database, snapshot.mjs).
   ============================================================================ */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { emdash } from './lib/emdash-cli.mjs';
import { restRequest } from './lib/emdash-rest.mjs';
import { format, resolveConfig } from 'prettier';

const i = process.argv.indexOf('--url');
const url = ((i > -1 && process.argv[i + 1]) || process.env.EMDASH_URL || '').replace(/\/$/, '');
const check = process.argv.includes('--check');
if (!url) {
  console.error('Usage: node scripts/export-seed-from-instance.mjs --url <instance> [--check]');
  process.exit(1);
}
const out = resolve(dirname(fileURLToPath(import.meta.url)), '../seed/seed.json');
const request = restRequest(url);
if (!request) {
  console.warn(
    'note: no EMDASH_TOKEN, so collection titleField/sortOrder/admin and redirects are not exported.',
  );
}

/** Drop undefined/null/empty-array keys so the seed stays tidy. */
const tidy = (o) =>
  Object.fromEntries(
    Object.entries(o).filter(
      ([k, v]) => k === 'hierarchical' || (v !== undefined && v !== null && v !== false),
    ),
  );
const items = (r) => (Array.isArray(r) ? r : (r?.items ?? []));

/**
 * The CLI reports SEO as a separate `hasSeo` flag, but a seed (and the committed
 * seed.json) lists it as the "seo" support. Put it back, before "search".
 */
function supportsOf(full) {
  const s = [...(full.supports ?? [])];
  if (full.hasSeo && !s.includes('seo')) {
    const at = s.indexOf('search');
    s.splice(at === -1 ? s.length : at, 0, 'seo');
  }
  return s.length ? s : undefined;
}

/** The CLI returns repeater subField keys alphabetically; keep the seed's slug-first order. */
const SUBFIELD_ORDER = ['slug', 'type', 'label', 'required', 'options'];
function normaliseValidation(v) {
  if (!Array.isArray(v.subFields)) return { ...v };
  const rank = (k) =>
    SUBFIELD_ORDER.includes(k) ? SUBFIELD_ORDER.indexOf(k) : SUBFIELD_ORDER.length;
  return {
    ...v,
    subFields: v.subFields.map((sf) =>
      Object.fromEntries(Object.entries(sf).sort(([a], [b]) => rank(a) - rank(b))),
    ),
  };
}

const list = emdash(url, ['schema', 'list']);
const collections = [];
for (const c of items(list)) {
  const full = emdash(url, ['schema', 'get', c.slug]);
  // REST carries the settings the CLI leaves out. Fall back to the CLI's copy.
  let extra = {};
  if (request) {
    try {
      const r = await request('GET', `/schema/collections/${c.slug}`);
      extra = r?.item ?? r?.collection ?? r ?? {};
    } catch (e) {
      console.warn(
        `note: REST read of collection ${c.slug} failed (${e.message}); using the CLI copy`,
      );
    }
  }
  const pick = (k) => extra[k] ?? full[k];
  collections.push(
    tidy({
      slug: full.slug,
      label: full.label,
      labelSingular: full.labelSingular,
      description: full.description,
      icon: pick('icon') || undefined,
      admin: pick('admin') || undefined,
      supports: supportsOf(full),
      urlPattern: full.urlPattern || undefined,
      routable: full.routable === false ? false : undefined,
      editLocking: full.editLocking === false ? false : undefined,
      hidden: full.hidden || undefined,
      sortOrder: pick('sortOrder') ?? undefined,
      group: full.group,
      commentsEnabled: full.commentsEnabled || undefined,
      titleField: pick('titleField') || undefined,
      dateField: pick('dateField') || undefined,
      fields: [...full.fields]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((f) =>
          tidy({
            slug: f.slug,
            label: f.label,
            type: f.type,
            required: f.required || undefined,
            unique: f.unique || undefined,
            searchable: f.searchable || undefined,
            indexed: f.indexed || undefined,
            translatable: f.translatable === false ? false : undefined,
            defaultValue: f.defaultValue,
            // maxLength, minLength, min, max, pattern, options, minItems, maxItems
            // and repeater subFields all travel inside `validation`, verbatim.
            validation: f.validation ? normaliseValidation(f.validation) : undefined,
            widget: f.widget || undefined,
            options: f.options || undefined,
          }),
        ),
    }),
  );
}

const taxonomies = emdash(url, ['taxonomy', 'list']).map((t) => {
  const terms = emdash(url, ['taxonomy', 'terms', t.name]);
  return tidy({
    name: t.name,
    label: t.label,
    labelSingular: t.labelSingular,
    hierarchical: Boolean(t.hierarchical),
    collections: t.collections,
    // Terms come back in creation order, which is the display order.
    terms: items(terms).map((x) => ({
      slug: x.slug,
      label: x.label,
    })),
  });
});

/** One menu item (and its children) in seed shape. Tolerates the CLI's camelCase names. */
function seedItem(it) {
  const custom = (it.type ?? 'custom') === 'custom';
  return tidy({
    type: it.type ?? 'custom',
    label: it.label,
    url: custom ? (it.url ?? it.customUrl) : undefined,
    ref: custom ? undefined : (it.ref ?? it.referenceId),
    collection: custom ? undefined : (it.collection ?? it.referenceCollection),
    target: it.target === '_blank' ? '_blank' : undefined,
    titleAttr: it.titleAttr || undefined,
    cssClasses: it.cssClasses || undefined,
    children: it.children?.length ? it.children.map(seedItem) : undefined,
  });
}
const menus = items(emdash(url, ['menu', 'list'])).map((m) => {
  const full = emdash(url, ['menu', 'get', m.name]);
  return {
    name: m.name,
    label: full.label ?? m.label,
    items: (full.items ?? []).map(seedItem),
  };
});

let redirects = [];
if (request) {
  try {
    redirects = items(await request('GET', '/redirects?limit=200'))
      .filter((r) => [301, 302, 307, 308].includes(r.type))
      .map((r) =>
        tidy({
          source: r.source,
          destination: r.destination,
          type: r.type,
          enabled: r.enabled === false ? false : undefined,
          groupName: r.groupName ?? r.group_name ?? undefined,
        }),
      );
  } catch (e) {
    console.warn(`note: could not read redirects over REST (${e.message}); none exported`);
  }
}

// Keep the committed seed's taxonomy order so a re-export does not shuffle it.
const previous = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : {};
const taxRank = (name) => {
  const at = (previous.taxonomies ?? []).findIndex((t) => t.name === name);
  return at === -1 ? Number.MAX_SAFE_INTEGER : at;
};
taxonomies.sort((a, b) => taxRank(a.name) - taxRank(b.name));

const seed = {
  $schema: 'https://emdashcms.com/seed.schema.json',
  version: '1',
  meta: { name: 'Nixon Creative Studio', description: 'Schema and taxonomies, no content.' },
  collections,
  taxonomies,
  ...(menus.length ? { menus } : {}),
  ...(redirects.length ? { redirects } : {}),
};
// Written the way the repo formats it (prettier), so a re-export is a clean diff.
const text = await format(JSON.stringify(seed, null, 2), {
  ...(await resolveConfig(out)),
  filepath: out,
});

if (check) {
  const current = existsSync(out) ? readFileSync(out, 'utf8') : '';
  if (current && JSON.stringify(JSON.parse(current)) === JSON.stringify(seed)) {
    console.log(`seed/seed.json matches ${url}`);
    process.exit(0);
  }
  const a = JSON.parse(current || '{}');
  const names = (s) => new Set((s.collections ?? []).map((c) => c.slug));
  console.log(`seed/seed.json DIFFERS from ${url}`);
  for (const c of seed.collections) {
    const old = (a.collections ?? []).find((x) => x.slug === c.slug);
    if (!old) console.log(`  + collection ${c.slug}`);
    else if (JSON.stringify(old) !== JSON.stringify(c)) console.log(`  ~ collection ${c.slug}`);
  }
  for (const s of names(a)) if (!names(seed).has(s)) console.log(`  - collection ${s}`);
  if (JSON.stringify(a.taxonomies) !== JSON.stringify(seed.taxonomies))
    console.log('  ~ taxonomies');
  if (JSON.stringify(a.menus) !== JSON.stringify(seed.menus)) console.log('  ~ menus');
  if (JSON.stringify(a.redirects) !== JSON.stringify(seed.redirects)) console.log('  ~ redirects');
  process.exit(1);
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, text);
console.log(
  `wrote ${out}: ${collections.length} collections, ${taxonomies.length} taxonomies, ${menus.length} menus, ${redirects.length} redirects`,
);
