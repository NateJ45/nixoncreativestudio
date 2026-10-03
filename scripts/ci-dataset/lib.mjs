// Safe to edit.
/* ============================================================================
   lib.mjs  (scripts/ci-dataset)
   ============================================================================
   Shared helpers for snapshot.mjs and rebuild.mjs.

   THE SAFETY RULE THIS FILE ENFORCES
   Everything that WRITES is hard-wired to the ncs-ci resources (D1 `ncs-ci`,
   R2 `ncs-ci-media`, Worker `ncs-ci`). There is no function here that writes to
   production, and the D1 helper refuses any database name other than ncs-ci,
   read or write. Production is only ever READ, and only through the two
   channels that need no production credentials in this repo:

     - the `emdash` CLI, through its stored login (scripts/lib/emdash-cli.mjs)
     - public URLs on the live site (media bytes under /_emdash/api/media/file/)

   Production D1 and R2 are deliberately not reachable from here.
   ============================================================================ */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const DIR = resolve(ROOT, 'scripts/ci-dataset');

/** The CI resources, mirrored from the `ci` environment in wrangler.jsonc. */
export const CI = {
  worker: 'ncs-ci',
  url: 'https://ncs-ci.nathanjnixon86.workers.dev',
  d1: 'ncs-ci',
  d1Id: 'ab647734-85f6-495c-87f5-e959d8ff1fd4',
  r2: 'ncs-ci-media',
};

/** Where production content is READ from (CLI login + public media URLs). */
export const PROD_URL = process.env.EMDASH_URL || 'https://www.nixoncreativestudio.com';

const require = createRequire(import.meta.url);
const WRANGLER = resolve(dirname(require.resolve('wrangler/package.json')), 'bin/wrangler.js');

/**
 * Confirm wrangler.jsonc still binds the ci environment to the resources named
 * above. A drifted constant would aim a write at the wrong place, so refuse to
 * run rather than trust it.
 */
export function assertCiConfig() {
  const text = readFileSync(resolve(ROOT, 'wrangler.jsonc'), 'utf8');
  const ci = text.slice(text.indexOf('"ci"'));
  for (const want of [CI.d1Id, `"${CI.r2}"`, `"name": "${CI.worker}"`, CI.url]) {
    if (!ci.includes(want)) {
      throw new Error(
        `wrangler.jsonc env.ci no longer mentions ${want}; update scripts/ci-dataset/lib.mjs`,
      );
    }
  }
}

/** Run wrangler (no shell). Returns { status, stdout, stderr }. */
function wrangler(args, opts = {}) {
  const res = spawnSync(process.execPath, [WRANGLER, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    env: { ...process.env, NO_COLOR: '1', WRANGLER_SEND_METRICS: 'false', ...opts.env },
  });
  return { status: res.status, stdout: res.stdout || '', stderr: res.stderr || '' };
}

function onlyCi(db) {
  if (db !== CI.d1)
    throw new Error(`refusing to touch D1 "${db}": this tool only targets ${CI.d1}`);
}

/** Run one SQL command against ncs-ci. Returns the result rows of the last statement. */
export function d1Query(sql) {
  onlyCi(CI.d1);
  const r = wrangler(['d1', 'execute', CI.d1, '--remote', '--json', '--command', sql]);
  const start = r.stdout.indexOf('[');
  if (r.status !== 0 || start === -1) {
    throw new Error(`D1 query failed: ${(r.stdout + r.stderr).trim().slice(-800)}`);
  }
  const parsed = JSON.parse(r.stdout.slice(start));
  const last = parsed[parsed.length - 1];
  if (last.success === false)
    throw new Error(`D1 query failed: ${JSON.stringify(last).slice(0, 800)}`);
  return last.results ?? [];
}

/** Run a .sql file against ncs-ci. Throws with wrangler's real error text. */
export function d1File(path) {
  onlyCi(CI.d1);
  const r = wrangler(['d1', 'execute', CI.d1, '--remote', '--yes', '--file', path]);
  if (r.status !== 0)
    throw new Error(`D1 file failed: ${(r.stdout + r.stderr).trim().slice(-1200)}`);
  return r.stdout;
}

/** Download an object from ncs-ci-media to a local file. Returns false when absent. */
export function r2GetCi(key, file) {
  const r = wrangler(['r2', 'object', 'get', `${CI.r2}/${key}`, '--remote', '--file', file]);
  return r.status === 0;
}

/** Upload a local file to ncs-ci-media under `key`. Throws on failure. */
export function r2PutCi(key, file, contentType) {
  const r = wrangler([
    'r2',
    'object',
    'put',
    `${CI.r2}/${key}`,
    '--remote',
    '--file',
    file,
    '--content-type',
    contentType,
  ]);
  if (r.status !== 0)
    throw new Error(`R2 put ${key} failed: ${(r.stdout + r.stderr).trim().slice(-600)}`);
}

/** Deploy the ci Worker. CLOUDFLARE_ENV=ci is set here and nowhere else. */
export function buildAndDeployCi() {
  const env = { ...process.env, CLOUDFLARE_ENV: 'ci' };
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const run = (cmd, args) => {
    const res = spawnSync(cmd, args, {
      cwd: ROOT,
      env,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    if (res.status !== 0) throw new Error(`${cmd} ${args.join(' ')} exited ${res.status}`);
  };
  run(npm, ['run', 'build']);
  run(npx, ['--no-install', 'wrangler', 'deploy']);
}

/** SQL literal for a JS value (text, number, null). */
export function lit(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  if (typeof v === 'boolean') return v ? '1' : '0';
  return `'${String(v).replace(/'/g, "''")}'`;
}

/** `INSERT OR REPLACE INTO table (cols) VALUES (...)` from a plain object. */
export function insertRow(table, row) {
  const cols = Object.keys(row);
  return `INSERT OR REPLACE INTO ${table} (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${cols
    .map((c) => lit(row[c]))
    .join(', ')});`;
}

export const fileExists = (p) => existsSync(p);
