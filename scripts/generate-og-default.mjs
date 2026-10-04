/* ============================================================================
   scripts/generate-og-default.mjs
   ============================================================================
   Generator for public/og-default.png, the site-wide fallback social card (the
   Organization schema image, the coming-soon page, and any page that passes no
   card of its own).

   It is the home-page card: survey paper with the contour ground, the official
   logo lockup, "I MAKE WEBSITES THAT" in Bebas Neue and "pull their weight." in
   the Newsreader italic voice with the china-marker stroke. All drawing is in
   scripts/lib/brand-card.mjs (shared with generate-og.mjs), fully offline.

   Run with:
     node scripts/generate-og-default.mjs   (or npm run og)

   The output overwrites public/og-default.png. It is committed (a real asset
   shipped to visitors), so re-run this whenever the brand or the tagline changes.
   ============================================================================ */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { renderCard } from './lib/brand-card.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// The tagline is the committed home hero text, so the card cannot drift from it.
let home = {};
try {
  home = JSON.parse(readFileSync(resolve(projectRoot, 'cms/content/page_home.json'), 'utf8')).data;
} catch {
  // fall through to the literals
}

const png = await renderCard({
  head: home.hero_heading || 'I make websites that',
  voice: home.hero_heading_accent || 'pull their weight.',
  seed: 11,
});

const outPath = resolve(projectRoot, 'public/og-default.png');
writeFileSync(outPath, png);
console.log(`Wrote ${outPath} (${png.length.toLocaleString()} bytes)`);
