// A build step. The Content-Security-Policy in public/_headers allows inline scripts and
// styles by hash, and those hashes can only be known after the build: the GA snippet's text
// depends on PUBLIC_GA_ID, and Astro inlines small stylesheets as it sees fit. So
// public/_headers carries two markers, and this script walks the built pages and writes the
// real hashes into dist/client/_headers. Cloudflare's build runs this with the production
// environment, so the production hashes are the ones that ship.
// How to read the reports and how to go from report-only to enforcing:
// docs/claude/deployment.md.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fillPolicy, inlineHashes } from './lib/csp-hashes.mjs';

const ROOT = 'dist/client';
const pages = readdirSync(ROOT, { recursive: true })
  .map(String)
  .filter((name) => name.endsWith('.html'));

const scripts = new Set();
const styles = new Set();
for (const page of pages) {
  const found = inlineHashes(readFileSync(join(ROOT, page), 'utf8'));
  found.scripts.forEach((hash) => scripts.add(hash));
  found.styles.forEach((hash) => styles.add(hash));
}

const path = join(ROOT, '_headers');
const headers = readFileSync(path, 'utf8');
// CI and local builds have no PUBLIC_GA_ID, so they lack the GA snippet's hash that the
// production build adds, and once passed CI at 1,984 characters while production failed at
// 2,037 (2026-11-15). Check the line as production will see it: fillPolicy throws over 2,000.
if (!(process.env.PUBLIC_GA_ID ?? '').trim()) {
  fillPolicy(headers, new Set([...scripts, `'sha256-${'A'.repeat(43)}='`]), styles);
}
writeFileSync(path, fillPolicy(headers, scripts, styles));
console.log(
  `[csp] ${scripts.size} inline scripts and ${styles.size} inline styles hashed across ${pages.length} pages.`,
);
