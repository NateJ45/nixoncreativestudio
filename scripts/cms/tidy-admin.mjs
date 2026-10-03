// Safe to edit.
/* ============================================================================
   tidy-admin.mjs  (npm run cms:tidy)
   ============================================================================
   Deletes the unused template `category` taxonomy and reports the admin screens
   EmDash cannot hide (widget areas, sections, extra menus). Logic and rules:
   scripts/lib/tidy-admin.mjs.

     npm run cms:tidy -- --url https://www.nixoncreativestudio.com --dry-run   # read only
     npm run cms:tidy -- --url https://www.nixoncreativestudio.com --yes       # real run

   Same guard as the other cms scripts: a target other than ncs-ci or localhost
   needs --yes unless it is a dry run. Credential: EMDASH_TOKEN, --token, or the
   login `npx emdash login` stored. The credential is never printed.
   ============================================================================ */
import { tidyAdmin } from '../lib/tidy-admin.mjs';
import { restRequest } from '../lib/emdash-rest.mjs';
import { fail, guardTarget, parseArgs } from './args.mjs';

const args = parseArgs();
guardTarget(args);
const request = restRequest(args.url, args.token);
if (!request) {
  fail('No credential. Run `npx emdash login --url <instance>` first, or set EMDASH_TOKEN.');
}
console.log(`tidy-admin -> ${args.url}${args.dryRun ? ' (dry run)' : ''}`);
for (const line of await tidyAdmin(request, { dryRun: args.dryRun })) console.log(`  ${line}`);
