// Fails when built HTML has an internal href without a trailing slash.
// Cloudflare answers a slashless page URL with a 307, and Search Console
// reports it as "Page with redirect" (PORTS Card 89). Run after a build.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2] ?? 'dist/client';
const bad = new Map();
let scanned = 0;

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name.endsWith('.html')) scan(p);
  }
}

function scan(file) {
  const html = readFileSync(file, 'utf8');
  for (const m of html.matchAll(/\shref="(\/[^"]*)"/g)) {
    const href = m[1];
    if (href.startsWith('//')) continue;
    const path = href.split(/[?#]/)[0];
    if (path.endsWith('/')) continue;
    if (path.slice(path.lastIndexOf('/') + 1).includes('.')) continue;
    if (/^\/(studio|api)(\/|$)/.test(path)) continue;
    scanned++;
    bad.set(href, [...(bad.get(href) ?? []), file]);
  }
}

walk(root);
if (bad.size) {
  console.error(`check-trailing-slash: ${scanned} slashless internal hrefs`);
  for (const [href, files] of bad)
    console.error(`  ${href}  (${files.length} files, e.g. ${files[0]})`);
  process.exit(1);
}
console.log('check-trailing-slash: 0 slashless internal hrefs');
