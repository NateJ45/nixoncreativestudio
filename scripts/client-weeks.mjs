/* ============================================================================
   client-weeks | Which weeks each client's site had changes, from git
   ============================================================================
   Local only (it reads the client repos that sit beside this one on Nathan's PC),
   run by hand with `npm run weeks`, then commit src/data/client-weeks.json.
   The care section on /services draws one dot per week since each build began,
   filled where that week had at least one commit that was not a merge.

   For each repo it runs `git fetch -q origin`, then reads the author dates of
   the non-merge commits on the remote's default branch (origin/HEAD, falling
   back to origin/main). Only week numbers and counts are written: never a
   commit message, an author or a hash, so nothing private reaches the page.

   Weeks start on Monday, in local time. Week 0 is the week of the first commit;
   the last week is the one holding `asOf` (today, or `--as-of YYYY-MM-DD`).
   A repo that is missing or cannot be read is skipped with a warning, and the
   entry it had last time is kept, so a run on a half-cloned machine never wipes
   a row.
   ============================================================================ */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '../src/data/client-weeks.json');
// The client repos live in Projects/clients. Walk up from here to the folder that holds both
// clients/ and internal/, so this works from the main checkout and from a worktree alike.
function findClients(from) {
  for (let d = from; d !== dirname(d); d = dirname(d)) {
    if (existsSync(join(d, 'clients')) && existsSync(join(d, 'internal')))
      return join(d, 'clients');
  }
  return resolve(from, '../../../clients');
}
const clientsRoot = process.env.NCS_CLIENTS_ROOT ?? findClients(here);

/** Repo folder (under clients/) to the case study slug it belongs to. */
const REPOS = [
  ['fbcm', 'first-baptist-muncie'],
  ['Foundation For Reformed Theology Website', 'foundation-for-reformed-theology'],
  ['mas-monograms-rebuild', 'mas-monograms'],
  ['presacademy', 'presbyterian-academy'],
  ['ReidDesignAstro/reid-design-site', 'reid-design'],
  ['stonesteps-50k', 'stone-steps-50k'],
  ['Theology Matters Website', 'theology-matters'],
];

const DAY = 86400000;
const WEEK = 7 * DAY;

/** Midnight local time on the Monday of the week holding `d`. */
export function mondayOf(d) {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return m;
}

/** A local date as YYYY-MM-DD (toISOString would shift it to UTC). */
export function isoDay(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Whole weeks from one Monday to another. Rounded, so a daylight-saving hour cannot shift it. */
const weeksBetween = (a, b) => Math.round((b - a) / WEEK);

/**
 * The published shape for one client, from its commit dates.
 * Returns null when there are no commits to go on.
 */
export function weeksFrom(slug, dates, asOf) {
  if (!dates.length) return null;
  const first = mondayOf(new Date(Math.min(...dates.map(Number))));
  const last = mondayOf(asOf);
  const weeks = weeksBetween(first, last) + 1;
  const active = [
    ...new Set(
      dates.map((d) => weeksBetween(first, mondayOf(d))).filter((i) => i >= 0 && i < weeks),
    ),
  ].sort((a, b) => a - b);
  return { slug, firstWeek: isoDay(first), weeks, active, asOf: isoDay(asOf) };
}

const git = (repo, args) =>
  execFileSync('git', ['-C', repo, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

function commitDates(repo) {
  git(repo, ['fetch', '-q', 'origin']);
  let ref = 'origin/HEAD';
  try {
    git(repo, ['rev-parse', '-q', '--verify', ref]);
  } catch {
    ref = 'origin/main';
  }
  // %aI only: the author date, nothing that names a person or says what changed.
  return git(repo, ['log', ref, '--no-merges', '--format=%aI'])
    .split('\n')
    .filter(Boolean)
    .map((s) => new Date(s));
}

function main() {
  const flag = process.argv.indexOf('--as-of');
  const asOf = flag > -1 ? new Date(`${process.argv[flag + 1]}T12:00:00`) : new Date();
  const before = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : [];
  const rows = [];
  for (const [folder, slug] of REPOS) {
    const repo = join(clientsRoot, folder);
    try {
      if (!existsSync(repo)) throw new Error('not found');
      const row = weeksFrom(slug, commitDates(repo), asOf);
      if (!row) throw new Error('no commits');
      rows.push(row);
      console.log(`${slug}: ${row.weeks} weeks, ${row.active.length} with changes`);
    } catch (e) {
      const kept = before.find((r) => r.slug === slug);
      if (kept) rows.push(kept);
      console.warn(
        `${slug}: skipped (${e.message.split('\n')[0]})${kept ? ', kept the last run' : ''}`,
      );
    }
  }
  writeFileSync(out, JSON.stringify(rows, null, 2) + '\n');
  console.log(`Wrote ${rows.length} clients to ${out}`);
}

// Run only when called as a script, so the test can import the helpers.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
