// Safe to edit.
/* ============================================================================
   export-seed-from-instance.mjs
   ============================================================================
   Writes seed/seed.json (schema + taxonomies, NO content) from a RUNNING
   EmDash instance, through the `emdash` CLI login.

     node scripts/export-seed-from-instance.mjs --url https://<instance>

   Why not `npx emdash export-seed`: that command reads a local SQLite file
   (--database), not a deployed D1 database, so it cannot see the trial
   instance. This script builds the same seed shape from `schema get` and
   `taxonomy terms`, mirroring the field mapping in emdash's own exportSeed.

   The seed creates the production schema on a fresh instance: it is applied
   once, automatically, before the setup wizard is completed. Taxonomy terms
   ship in the seed too (the lists are small and stable); entries are loaded
   with scripts/migrate-case-studies.mjs, which also assigns the terms.
   ============================================================================ */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { emdash } from './lib/emdash-cli.mjs';

const i = process.argv.indexOf('--url');
const url = ((i > -1 && process.argv[i + 1]) || process.env.EMDASH_URL || '').replace(/\/$/, '');
if (!url) {
  console.error('Usage: node scripts/export-seed-from-instance.mjs --url <instance>');
  process.exit(1);
}
const out = resolve(dirname(fileURLToPath(import.meta.url)), '../seed/seed.json');

/** Drop undefined/null/empty-array keys so the seed stays tidy. */
const tidy = (o) =>
  Object.fromEntries(
    Object.entries(o).filter(
      ([k, v]) => k === 'hierarchical' || (v !== undefined && v !== null && v !== false),
    ),
  );

const list = emdash(url, ['schema', 'list']);
const collections = (Array.isArray(list) ? list : list.items).map((c) => {
  const full = emdash(url, ['schema', 'get', c.slug]);
  return tidy({
    slug: full.slug,
    label: full.label,
    labelSingular: full.labelSingular,
    description: full.description,
    supports: full.supports?.length ? full.supports : undefined,
    routable: full.routable === false ? false : undefined,
    hidden: full.hidden || undefined,
    group: full.group,
    commentsEnabled: full.commentsEnabled || undefined,
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
          validation: f.validation ? { ...f.validation } : undefined,
        }),
      ),
  });
});

const taxonomies = emdash(url, ['taxonomy', 'list']).map((t) => {
  const terms = emdash(url, ['taxonomy', 'terms', t.name]);
  return tidy({
    name: t.name,
    label: t.label,
    labelSingular: t.labelSingular,
    hierarchical: Boolean(t.hierarchical),
    collections: t.collections,
    // Terms come back in creation order, which is the display order.
    terms: (Array.isArray(terms) ? terms : terms.items).map((x) => ({
      slug: x.slug,
      label: x.label,
    })),
  });
});

const seed = {
  $schema: 'https://emdashcms.com/seed.schema.json',
  version: '1',
  meta: { name: 'Nixon Creative Studio', description: 'Schema and taxonomies, no content.' },
  collections,
  taxonomies,
};
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(seed, null, '\t') + '\n');
console.log(`wrote ${out}: ${collections.length} collections, ${taxonomies.length} taxonomies`);
