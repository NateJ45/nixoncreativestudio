// Safe to edit.
/* ============================================================================
   production-load.mjs  (npm run cms:production-load)
   ============================================================================
   One command that loads every migrated area (cms/schema/*.mjs and
   cms/content/*.json) into the PRODUCTION EmDash instance, in a safe order,
   checking each step. Nathan runs it in his own PowerShell window, after:

     npx emdash login --url https://www.nixoncreativestudio.com
     $env:EMDASH_TOKEN = '<API token from Settings, API tokens>'
     npx wrangler d1 time-travel info ncs-emdash-prod      # note the restore point

     npm run cms:production-load -- --plan                 # print the plan, no network
     npm run cms:production-load                           # the real run

   Flags:  --plan             print the ordered plan and exit (no token, no network)
           --only <name>      one collection (schema and content)
           --from <name>      resume at <name> and carry on to the end
           --url <instance>   default https://www.nixoncreativestudio.com
           --yes              skip the typed "yes" and the Enter pause (tests only)

   What it will not do: write without the typed "yes", print or log the token,
   carry on after an error or a surprise, or automate the follow-ups (CI seed,
   PRODUCTION_HAS). It spawns scripts/cms/apply-schema.mjs and load-content.mjs,
   so their production guard and validation still apply to every write.

   Every run writes a timestamped log to .cms-load-log/ (git-ignored, no secrets).
   The logic and its rules are in scripts/lib/production-load.mjs.
   ============================================================================ */
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { restRequest, storedLoginToken } from '../lib/emdash-rest.mjs';
import { emdash } from '../lib/emdash-cli.mjs';
import {
  buildPlan,
  followUps,
  formatPlan,
  makeScrubber,
  runLoad,
  selectPlan,
} from '../lib/production-load.mjs';
import { CONTENT_DIR, ROOT, SCHEMA_DIR } from './args.mjs';

const PROD = 'https://www.nixoncreativestudio.com';

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const value = (n) => {
  const i = argv.indexOf(`--${n}`);
  return i > -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : undefined;
};
const url = (value('url') || PROD).replace(/\/$/, '');
// EMDASH_TOKEN if set, otherwise the login `npx emdash login` stored (Nathan chose
// this on 2026-10-03). Either way the value is scrubbed from every line printed or logged.
const token = process.env.EMDASH_TOKEN || storedLoginToken(url) || '';
const scrub = makeScrubber([token]);

// ---- log file (scrubbed; one file per run) ----------------------------------
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const logDir = join(ROOT, '.cms-load-log');
const logFile = join(logDir, `${stamp}.log`);
let logReady = false;
function say(line = '') {
  const clean = scrub(line);
  console.log(clean);
  if (flag('plan')) return;
  if (!logReady) {
    mkdirSync(logDir, { recursive: true });
    logReady = true;
  }
  appendFileSync(logFile, clean + '\n');
}
function die(message) {
  console.error(scrub(message));
  process.exit(1);
}

// ---- what is on disk --------------------------------------------------------
const namesIn = (dir, ext) =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith(ext))
        .map((f) => f.slice(0, -ext.length))
    : [];
let plan;
try {
  plan = selectPlan(buildPlan(namesIn(SCHEMA_DIR, '.mjs'), namesIn(CONTENT_DIR, '.json')), {
    only: value('only'),
    from: value('from'),
  });
} catch (e) {
  die(e.message);
}
if (!plan.length) die('Nothing to load: cms/schema/ and cms/content/ are empty.');

if (flag('plan')) {
  for (const l of formatPlan(plan, url)) console.log(l);
  console.log('(plan only: no network, nothing written)');
  process.exit(0);
}

// ---- preconditions ----------------------------------------------------------
if (!token) {
  die(
    'No credential found. Either log in once (it prints a code, approve it in your browser):\n' +
      `  npx emdash login --url ${url}\n` +
      'or create an API token in /_emdash/admin, Settings, API tokens, then in PowerShell:\n' +
      "  $env:EMDASH_TOKEN = '<the token>'\n" +
      'and run this again. The credential is never printed or logged.',
  );
}

/** True when `emdash login` has stored a login for this origin (token value never read out). */
function hasCliLogin() {
  const dir = process.env.XDG_CONFIG_HOME
    ? join(process.env.XDG_CONFIG_HOME, 'emdash')
    : join(homedir(), '.config', 'emdash');
  try {
    const store = JSON.parse(readFileSync(join(dir, 'auth.json'), 'utf8'));
    return Boolean(store[new URL(url).origin]?.accessToken);
  } catch {
    return false;
  }
}
if (!hasCliLogin()) {
  die(
    `No emdash CLI login found for ${url}. Run this once (it prints a code, approve it in your browser):\n` +
      `  npx emdash login --url ${url}\n` +
      'then run this again.',
  );
}

// ---- show the plan and confirm ----------------------------------------------
const rl = createInterface({ input: process.stdin, output: process.stdout });
// If stdin closes (piped input ran out, window closed) resolve to '' so nothing proceeds:
// an empty answer is never "yes".
const closed = new Promise((resolve) => rl.once('close', () => resolve('')));
const ask = async (q) => String(await Promise.race([rl.question(q), closed])).trim();

for (const l of formatPlan(plan, url)) say(l);
say('');
say('BEFORE YOU CONTINUE: record a D1 Time Travel restore point (read-only, run it yourself):');
say('  npx wrangler d1 time-travel info ncs-emdash-prod');
say('Keep the timestamp it prints. If something goes wrong:');
say('  npx wrangler d1 time-travel restore ncs-emdash-prod --timestamp <iso>');
say('When this is all done, revoke the API token (Settings, API tokens).');
say('');
say(`Log file: ${logFile}`);
// Set only after a person typed "yes": the child scripts refuse production without it.
let typedYes = false;
if (!flag('yes')) {
  const answer = await ask(`This WRITES to ${url}. Type yes to start: `);
  if (answer !== 'yes') {
    rl.close();
    die('Not started (you did not type yes). Nothing was written.');
  }
  typedYes = true;
}

// ---- check the token works (read only) before any step ----------------------
try {
  await restRequest(url, token)('GET', '/schema/collections');
} catch (e) {
  rl.close();
  die(`The API token was rejected by ${url}: ${scrub(e.message)}\nCreate a fresh token and retry.`);
}

// ---- the real dependencies --------------------------------------------------
const script = (tool) =>
  join(ROOT, 'scripts/cms', tool === 'schema' ? 'apply-schema.mjs' : 'load-content.mjs');

function runStep({ tool, collection, mode }) {
  // --yes is always passed: the typed "yes" above is the confirmation, and the
  // child's own guard then lets the production URL through. Dry runs never write.
  const res = spawnSync(
    process.execPath,
    [
      script(tool),
      '--collection',
      collection,
      '--url',
      url,
      mode === 'dry-run' ? '--dry-run' : '--yes',
    ],
    {
      encoding: 'utf8',
      maxBuffer: 256 * 1024 * 1024,
      timeout: 15 * 60 * 1000,
      env: {
        ...process.env,
        NO_COLOR: '1',
        ...(typedYes ? { NCS_PRODUCTION_WRITE: 'yes' } : {}),
      },
    },
  );
  const output = scrub(`${res.stdout || ''}${res.stderr ? `\n${res.stderr}` : ''}`);
  return { code: res.status ?? 1, output };
}

/**
 * `pages` and `posts` (the Journal) already exist from the template: list their
 * entries first, as the runbook says. `posts` should hold none.
 */
function preflight(collection) {
  if (collection !== 'pages' && collection !== 'posts') return undefined;
  try {
    const list = emdash(url, ['content', 'list', collection]);
    const items = list?.items ?? (Array.isArray(list) ? list : []);
    return `existing ${collection} entries: ${items.map((i) => i.slug ?? i.id).join(', ') || '(none)'}`;
  } catch (e) {
    return `could not list existing ${collection} entries: ${scrub(e.message)}`;
  }
}

const result = await runLoad(
  plan,
  {
    runStep,
    preflight,
    pause: async (m) => {
      await ask(`${m} `);
    },
    log: say,
  },
  { url, yes: flag('yes') },
);
rl.close();

if (!result.ok) {
  say('');
  say(`Log saved: ${logFile}`);
  process.exit(1);
}
say('');
for (const l of followUps(plan, url)) say(l);
say('');
say(`Log saved: ${logFile}`);
