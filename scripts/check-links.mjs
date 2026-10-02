#!/usr/bin/env node
// Safe to edit.
/**
 * check-links.mjs - internal link check for the hybrid site.
 *
 * Two modes, one skip rule (off-site URLs are never fetched; only links that
 * stay on the crawled origin must resolve):
 *
 *   LINKCHECK_URL=<https://...> npm run check:links
 *     Crawls a DEPLOYED URL (CI passes the Worker version preview URL). This is
 *     the mode that matters: the site is hybrid, so the server-rendered pages
 *     (/, /work/, /work/<slug>/, /about/, /services/) do not exist in
 *     dist/client and are only reachable over HTTP.
 *
 *   npm run check:links            (LINKCHECK_URL unset)
 *     Falls back to crawling dist/client. That tree holds only the PRERENDERED
 *     pages, so a link into a server-rendered page will report broken here even
 *     though it works live. Useful for a static-only sanity pass; do not read a
 *     red result as a real broken link without checking the URL mode.
 *
 * linkinator is run through its CLI file with execFileSync, not a shell string,
 * so the skip regex needs no platform-specific quoting (Windows cmd mangles
 * the lookahead).
 *
 * The log must say "scanned N links" with N in the hundreds.
 */

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cli = join(ROOT, 'node_modules', 'linkinator', 'build', 'src', 'cli.js');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const raw = process.env.LINKCHECK_URL?.replace(/\/+$/, '');
let target;
let skip;

if (raw) {
  const origin = new URL(raw).origin;
  target = raw + '/';
  // Skip every http(s) URL that does not start with the crawled origin.
  skip = `^https?://(?!${escapeRegex(origin.replace(/^https?:\/\//, ''))}([:/]|$))`;
  console.log(`[check-links] crawling ${target}`);
} else {
  target = join(ROOT, 'dist', 'client');
  if (!existsSync(target)) {
    console.error('[check-links] dist/client not found. Build first, or set LINKCHECK_URL.');
    process.exit(1);
  }
  skip = '^https?://(?!(localhost|127[.]0[.]0[.]1)[:/])';
  console.log(`[check-links] LINKCHECK_URL not set: crawling ${target} (prerendered pages only)`);
}

try {
  execFileSync(process.execPath, [cli, target, '--recurse', '--skip', skip], {
    stdio: 'inherit',
  });
} catch (err) {
  // linkinator exits non-zero when any link is broken; pass that through.
  process.exit(typeof err.status === 'number' ? err.status : 1);
}
