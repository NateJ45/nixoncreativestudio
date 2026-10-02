// Safe to edit.
/* ============================================================================
   emdash-schema-case-studies.mjs
   ============================================================================
   Makes an EmDash instance match the `case_studies` schema defined in
   scripts/lib/case-studies-schema.mjs: the collection settings (drafts,
   revisions, seo, search, "Portfolio" sidebar group), every field (select
   options, results repeater, indexed and searchable flags), and the three flat
   taxonomies `service`, `topic` and `stack`. Idempotent; safe to rerun.

     EMDASH_TOKEN=<api token> node scripts/emdash-schema-case-studies.mjs --url https://<instance>

   A field whose type changed (for example json -> repeater) is dropped and
   re-added, so rerun scripts/migrate-case-studies.mjs afterwards to refill it.
   Old json fields services/tags/stack are removed; their data now lives in the
   taxonomies.

   Needs a REST token (see scripts/lib/emdash-rest.mjs). Without one, run
   applySchema() from the admin console instead.
   ============================================================================ */
import { applySchema } from './lib/case-studies-schema.mjs';
import { restRequest } from './lib/emdash-rest.mjs';

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const url = (arg('url') || process.env.EMDASH_URL || '').replace(/\/$/, '');
if (!url) {
  console.error(
    'Usage: EMDASH_TOKEN=... node scripts/emdash-schema-case-studies.mjs --url <instance>',
  );
  process.exit(1);
}
const request = restRequest(url, arg('token'));
if (!request) {
  console.error('Set EMDASH_TOKEN (or --token). See scripts/lib/emdash-rest.mjs.');
  process.exit(1);
}

for (const line of await applySchema(request)) console.log(line);
console.log('schema ok');
