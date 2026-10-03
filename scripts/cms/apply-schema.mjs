// Safe to edit.
/* ============================================================================
   apply-schema.mjs
   ============================================================================
   Makes an EmDash instance match the collection definitions in cms/schema/*.mjs
   (CMS-DESIGN PR 3, recipe step 2). Idempotent; safe to rerun.

     # one collection, to the CI Worker or production
     EMDASH_TOKEN=<api token> node scripts/cms/apply-schema.mjs --collection pricing_tiers --url <instance>
     # every file in cms/schema/
     EMDASH_TOKEN=... node scripts/cms/apply-schema.mjs --all --url <instance>
     # read the instance, print the plan, write nothing
     EMDASH_TOKEN=... node scripts/cms/apply-schema.mjs --all --url <instance> --dry-run
     # no network: validate the definitions only (also run by npm run test:unit)
     node scripts/cms/apply-schema.mjs --all --check

   Production needs --yes (see args.mjs). The generic applier is
   scripts/lib/emdash-schema.mjs; this file only finds the definitions, validates
   them and calls it. Needs a REST token (scripts/lib/emdash-rest.mjs); without
   one, paste scripts/lib/emdash-schema.mjs and a definition into the admin
   console (docs/EMDASH-SCHEMA.md, "Re-creating the schema").
   ============================================================================ */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { applyCollectionSchema, validateDef } from '../lib/emdash-schema.mjs';
import { restRequest } from '../lib/emdash-rest.mjs';
import { SCHEMA_DIR, fail, guardTarget, parseArgs, schemaSlugs } from './args.mjs';

const args = parseArgs();
const slugs = args.all ? schemaSlugs() : args.collection ? [args.collection] : [];
if (!slugs.length) {
  if (args.all && args.check) {
    console.log('cms/schema/ has no definitions yet (nothing to validate)');
    process.exit(0);
  }
  fail(
    args.all
      ? 'cms/schema/ has no definitions yet (nothing to apply).'
      : 'Usage: node scripts/cms/apply-schema.mjs (--collection <slug> | --all) [--url <instance>] [--dry-run] [--check]',
  );
}

// Load and validate every definition first, so a typo fails before any write.
const defs = [];
let bad = false;
for (const slug of slugs) {
  const file = join(SCHEMA_DIR, `${slug}.mjs`);
  if (!existsSync(file)) fail(`No definition at cms/schema/${slug}.mjs`);
  const def = await import(pathToFileURL(file).href);
  if (def.SLUG !== slug) {
    fail(`cms/schema/${slug}.mjs exports SLUG "${def.SLUG}"; it must match the file name.`);
  }
  const { errors, warnings } = validateDef(def);
  for (const w of warnings) console.warn(`warning: ${w}`);
  for (const e of errors) console.error(`error: ${e}`);
  if (errors.length) bad = true;
  defs.push(def);
}
if (bad) process.exit(1);
if (args.check) {
  console.log(`${defs.length} definition(s) valid`);
  process.exit(0);
}

guardTarget(args);
const request = restRequest(args.url, args.token);
if (!request) fail('Set EMDASH_TOKEN (or --token). See scripts/lib/emdash-rest.mjs.');

for (const def of defs) {
  console.log(`${def.SLUG} -> ${args.url}${args.dryRun ? ' (dry run)' : ''}`);
  for (const line of await applyCollectionSchema(request, def, { dryRun: args.dryRun })) {
    console.log(`  ${line}`);
  }
}
console.log('schema ok');
