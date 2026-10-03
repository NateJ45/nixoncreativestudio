// Safe to edit.
/* ============================================================================
   load-content.mjs
   ============================================================================
   Loads the literal values in cms/content/*.json into an EmDash instance
   (CMS-DESIGN PR 3, recipe step 3). Idempotent: a rerun against an instance that
   already holds the same values changes nothing. Entries are published.

     node scripts/cms/load-content.mjs --collection page_home --url <instance>
     node scripts/cms/load-content.mjs --all --url <instance>
     node scripts/cms/load-content.mjs --all --url <instance> --dry-run
     node scripts/cms/load-content.mjs --collection menus --url <instance>      # needs EMDASH_TOKEN
     node scripts/cms/load-content.mjs --collection redirects --url <instance>  # needs EMDASH_TOKEN

   What it does per collection file: uploads every { "$file" } image once (SHA-1
   de-dup, so a file the media library already holds is reused), then
   `emdash content create` or `content update --rev` for each entry, then
   publishes. Menus and redirects have no CLI write command, so they go through
   REST with EMDASH_TOKEN. The schema must already exist (apply-schema.mjs).

   Auth: the `emdash` CLI login for content and media (npx emdash login --url
   <instance>), EMDASH_TOKEN for menus and redirects. Production needs --yes.
   The logic is in scripts/lib/cms-load.mjs; this file is the command line.
   ============================================================================ */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { emdash, withJsonFile } from '../lib/emdash-cli.mjs';
import { createMediaResolver } from '../lib/emdash-media.mjs';
import { restRequest } from '../lib/emdash-rest.mjs';
import {
  SPECIAL_FILES,
  loadEntries,
  loadMenus,
  loadRedirects,
  readEntries,
} from '../lib/cms-load.mjs';
import { CONTENT_DIR, ROOT, fail, guardTarget, parseArgs } from './args.mjs';

const args = parseArgs();
const names = args.all
  ? existsSync(CONTENT_DIR)
    ? readdirSync(CONTENT_DIR)
        .filter((f) => f.endsWith('.json'))
        .map((f) => f.replace(/\.json$/, ''))
        .sort()
    : []
  : args.collection
    ? [args.collection]
    : [];
if (!names.length) {
  fail(
    args.all
      ? 'cms/content/ has no files yet (nothing to load).'
      : 'Usage: node scripts/cms/load-content.mjs (--collection <slug> | --all) --url <instance> [--dry-run] [--force]',
  );
}
guardTarget(args);

const emdashFn = (cliArgs) => emdash(args.url, cliArgs);
const media = createMediaResolver({ emdashFn, root: ROOT, dryRun: args.dryRun });
const request = restRequest(args.url, args.token);

for (const name of names) {
  const file = join(CONTENT_DIR, `${name}.json`);
  if (!existsSync(file)) fail(`No content file at cms/content/${name}.json`);
  console.log(`${name} -> ${args.url}${args.dryRun ? ' (dry run)' : ''}`);
  if (SPECIAL_FILES.includes(name)) {
    if (!request) fail(`${name} goes through REST: set EMDASH_TOKEN (or --token).`);
    const json = JSON.parse(readFileSync(file, 'utf8'));
    if (name === 'menus') await loadMenus(request, json, { dryRun: args.dryRun });
    else await loadRedirects(request, json, { dryRun: args.dryRun });
    continue;
  }
  loadEntries({
    collection: name,
    entries: readEntries(file),
    emdashFn,
    withFile: withJsonFile,
    imageValue: media.imageValue,
    dryRun: args.dryRun,
    force: args.force,
  });
}
console.log('content ok');
