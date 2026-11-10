#!/usr/bin/env node
/* Write src/data/footage-versions.json: a short hash of every clip in public/assets/. The site puts
   it on the end of each footage address (stamped() in src/lib/clients.ts), so a re-filmed clip is
   fetched fresh instead of waiting out the month-long cache on /assets/*. Run it after filming:

     npm run footage:stamp

   src/lib/footage-versions.test.ts fails when a clip and this list disagree. */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const assets = join(root, 'public', 'assets');
const out = {};
for (const name of readdirSync(assets)
  .filter((n) => n.endsWith('.mp4'))
  .sort()) {
  out[name] = createHash('sha1')
    .update(readFileSync(join(assets, name)))
    .digest('hex')
    .slice(0, 8);
}
writeFileSync(
  join(root, 'src', 'data', 'footage-versions.json'),
  JSON.stringify(out, null, 2) + '\n',
);
console.log(`[footage:stamp] ${Object.keys(out).length} clips`);
