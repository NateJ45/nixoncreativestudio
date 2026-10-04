// Safe to edit.
/* ============================================================================
   args.mjs  (scripts/cms)
   ============================================================================
   Shared command-line handling for apply-schema.mjs and load-content.mjs:
   the flags both take, plus the production guard.

   THE GUARD. These scripts WRITE. An instance counts as safe without a flag
   only when it is the ncs-ci Worker or a local address. Anything else, the
   production domain above all, needs `--yes` AND NCS_PRODUCTION_WRITE=yes, so a
   stray `--url` or an EMDASH_URL left in the environment, or a command that
   ran by accident, cannot touch production.
   ============================================================================ */
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const SCHEMA_DIR = join(ROOT, 'cms/schema');
export const CONTENT_DIR = join(ROOT, 'cms/content');

/** Parse `--name value` and `--flag` out of argv. */
export function parseArgs(argv = process.argv.slice(2)) {
  const value = (name) => {
    const i = argv.indexOf(`--${name}`);
    return i > -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : undefined;
  };
  const flag = (name) => argv.includes(`--${name}`);
  return {
    url: (value('url') || process.env.EMDASH_URL || '').replace(/\/$/, ''),
    token: value('token'),
    collection: value('collection'),
    all: flag('all'),
    dryRun: flag('dry-run'),
    yes: flag('yes'),
    force: flag('force'),
    check: flag('check'),
  };
}

/** True for the CI Worker and local addresses, the only targets that need no --yes. */
export function isSafeTarget(url) {
  let host;
  try {
    host = new URL(url).hostname;
  } catch {
    return false;
  }
  return (
    host === 'ncs-ci.nathanjnixon86.workers.dev' ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '[::1]' ||
    host.endsWith('.localhost')
  );
}

/** Exit with a clear message unless the target is safe or --yes was passed. */
export function guardTarget(args) {
  if (!args.url) fail('Pass --url <instance> (or set EMDASH_URL).');
  if (args.dryRun || isSafeTarget(args.url)) return;
  if (!args.yes) {
    fail(
      `${args.url} is not the ncs-ci Worker or a local address, and this script writes.\n` +
        'Check the target, then rerun with --yes (or add --dry-run to read only).',
    );
  }
  // Second factor (added 2026-10-04 after a delegated agent ran a production load by
  // accident: a backticked command inside a shell string ran as a command substitution,
  // and --yes was in it). Production writes also need this environment variable, which
  // only a person sets on purpose, or scripts/cms/production-load.mjs after its typed
  // "yes". An agent must never set it.
  if (process.env.NCS_PRODUCTION_WRITE !== 'yes') {
    fail(
      `${args.url} is production and this script writes. --yes is not enough: set NCS_PRODUCTION_WRITE=yes in the\n` +
        'same command, and only with Nathan present (never-break rule 5; .claude/rules/live-writes.md).',
    );
  }
}

export function fail(message) {
  console.error(message);
  process.exit(1);
}

/** Slugs of every cms/schema/<slug>.mjs, sorted. */
export function schemaSlugs() {
  if (!existsSync(SCHEMA_DIR)) return [];
  return readdirSync(SCHEMA_DIR)
    .filter((f) => f.endsWith('.mjs'))
    .map((f) => f.replace(/\.mjs$/, ''))
    .sort();
}
