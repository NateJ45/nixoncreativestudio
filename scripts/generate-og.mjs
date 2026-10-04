/* ============================================================================
   scripts/generate-og.mjs
   ============================================================================
   Per-page Open Graph card generator. Writes one 1200x630 PNG per page into
   public/og/, so every page (and every case study / journal entry) shares with
   its own branded card instead of the single default.

   Why a Node script and not an Astro route: the Cloudflare adapter prerenders
   pages in a V8 isolate with no node built-ins (no node:crypto, no node:fs), so
   astro-og-canvas / canvaskit can't run as a route here. This runs out of
   process before `astro build` (same pattern as generate-placeholders.mjs and
   generate-og-default.mjs), using opentype.js to draw Bebas Neue glyph outlines
   as SVG paths and sharp to rasterize, so the result is the real brand typeface
   on any build host.

   Output (committed, like og-default.png and the placeholder JSON):
     public/og/<page>.png            e.g. public/og/index.png, /og/work.png
     public/og/work/<slug>.png       one per case study
     public/og/journal/<slug>.png    one per PUBLISHED journal entry (generated at
                                     build time from the feed, not committed)

   WHERE THE CASE STUDIES COME FROM (changed with the EmDash migration)
   Case studies no longer live in git, so the case-study cards are built from
   the PUBLISHED entries of the EmDash instance named by the EMDASH_URL env var.
   The EmDash REST content API (/_emdash/api/content/...) needs a login, so this
   script reads only what an anonymous visitor can read:
     - /rss.xml                          the slug and title of every published
                                         case study (server-rendered from EmDash)
     - /work/<slug>/                     the first <img> is the cover; its href
                                         carries the public media URL
                                         (/_emdash/api/media/file/<id>.png)
     - /_emdash/api/media/file/<id>.png  the original cover bytes
   If the instance is unreachable, or returns no case studies, the script keeps
   every already-committed public/og/work/*.png, prints a warning and carries on
   (exit 0): a CMS outage must never fail the build or delete a card.

   JOURNAL ENTRIES come from the same feed (CMS-DESIGN PR 12). /rss.xml lists the
   published journal entries next to the case studies; a /journal/<slug>/ link is a
   journal entry, so its slug and title give a type-only paper card at
   public/og/journal/<slug>.png (no cover fetch). Drafts are not in the feed, so they
   never get a card. An empty journal (the normal state until the first entry is
   published) builds no journal cards and is not a warning; a feed that cannot be
   read warns once and builds none. Nothing is ever deleted. A card exists only for
   entries published before the build, so a new entry shows no card until the next
   deploy (the same as a new case study).
   EMDASH_URL defaults to the production site (flipped at the 2026-10 EmDash
   cutover). On the very first production build the live site is still the old
   static one, which has no CMS media, so the script keeps the committed cards.
   Point it at the CI sample with EMDASH_URL=https://ncs-ci.nathanjnixon86.workers.dev.

   BaseLayout.astro maps the current pathname to /og/<slug>.png ('' -> index).
   Output is deterministic, so re-running with unchanged content produces
   identical bytes (no git churn).

   Run: node scripts/generate-og.mjs   (chained into `npm run build`)
   ============================================================================ */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { renderCard } from './lib/brand-card.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

// Card design (redesign 2026): survey paper with the contour ground, the official
// logo lockup, a Bebas headline with the italic voice in marker red, and for a case
// study the real cover screenshot printed as a framed print. All drawing lives in
// scripts/lib/brand-card.mjs (shared with generate-og-default.mjs).

// Seeds the hand-drawn marker stroke so each card's underline differs a little but
// the same card is always byte-identical.
const seedOf = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 9973, 7);

async function writeCard(relPath, spec, cover) {
  // `cover` is the original cover image as a Buffer (or undefined: type-only card).
  const png = await renderCard({ ...spec, print: cover, seed: seedOf(relPath) });
  const outPath = resolve(projectRoot, 'public/og', `${relPath}.png`);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, png);
  return outPath;
}

// --- Case studies from EmDash ------------------------------------------------
// See the header for why this reads public pages instead of the REST API.
// CUTOVER: flip this default to https://nixoncreativestudio.com.
const EMDASH_URL = (process.env.EMDASH_URL || 'https://www.nixoncreativestudio.com').replace(
  /\/+$/,
  '',
);
const FETCH_TIMEOUT_MS = 20_000;

async function getText(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.text();
}

const decodeXml = (t) =>
  t
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

// The published items of /rss.xml as [{ link, title }], or [] (never throws): one
// read feeds both the case-study and the journal cards. /work/<slug>/ links are case
// studies, /journal/<slug>/ links are journal entries (src/pages/rss.xml.js keeps
// those two shapes). A failed read warns once; the caller then keeps the committed
// cards and builds no journal cards.
async function readFeedItems() {
  try {
    const rss = await getText(`${EMDASH_URL}/rss.xml`);
    return [...rss.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => ({
      link: m[1].match(/<link>([^<]+)<\/link>/)?.[1] ?? '',
      title: decodeXml(m[1].match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '').trim(),
    }));
  } catch (err) {
    console.warn(`[og] could not read the feed from ${EMDASH_URL} (${err.message})`);
    return [];
  }
}

// Returns [{ route, title, coverBuf }] (never throws): the caller treats an empty
// result as "keep the committed cards".
async function emdashCaseStudies(feed) {
  const out = [];
  for (const { link, title } of feed) {
    const slug = link.match(/\/work\/([^/]+)\/?$/)?.[1];
    if (!slug || !title) continue;
    const entry = { route: `work/${slug}`, head: title, kicker: 'Case study', coverBuf: undefined };
    try {
      const html = await getText(`${EMDASH_URL}/work/${slug}/`);
      // The cover is the first <img> whose src points at the CMS media file (the
      // header logo and other site furniture are <img> too, so skip those).
      let media;
      for (const m of html.matchAll(/<img[^>]*\ssrc="([^"]+)"/g)) {
        const decoded = decodeURIComponent(m[1].replace(/&amp;/g, '&'));
        media = decoded.match(/\/_emdash\/api\/media\/file\/[A-Za-z0-9._-]+/)?.[0];
        if (media) break;
      }
      if (media) {
        const res = await fetch(`${EMDASH_URL}${media}`, {
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (res.ok) entry.coverBuf = Buffer.from(await res.arrayBuffer());
      }
    } catch (err) {
      console.warn(`[og] ${slug}: cover not fetched (${err.message})`);
    }
    out.push(entry);
  }
  return out;
}

// Journal entries from the same feed: [{ route, title }] with no cover, so each gets
// the type-only card (the page's own og:image is /og/journal/<slug>.png). An empty
// journal is the normal state, not a warning.
function emdashJournal(feed) {
  return feed.flatMap(({ link, title }) => {
    const slug = link.match(/\/journal\/([^/]+)\/?$/)?.[1];
    return slug && title
      ? [{ route: `journal/${slug}`, head: title, kicker: 'From the journal' }]
      : [];
  });
}

// --- Pages -----------------------------------------------------------------
// Headline = Bebas `head` + italic `voice` (DESIGN.md: every big headline turns
// into the voice for its last phrase). Home, About, Photography, Contact and 404 read
// their words from the committed CMS fallback JSON (cms/content/page_*.json), the
// same text the pages show; the rest are set here.
function pageJson(name) {
  try {
    return JSON.parse(readFileSync(resolve(projectRoot, `cms/content/page_${name}.json`), 'utf8'))
      .data;
  } catch {
    return {};
  }
}
const home = pageJson('home');
const about = pageJson('about');
const photo = pageJson('photography');
const contact = pageJson('contact');

const STATIC_PAGES = [
  {
    route: 'index',
    head: home.hero_heading || 'I make websites that',
    voice: home.hero_heading_accent || 'pull their weight.',
  },
  { route: 'work', head: 'Selected', voice: 'work.' },
  { route: 'services', head: 'Strategy, web design', voice: 'and photography.' },
  {
    route: 'about',
    head: about.heading || 'The person you meet on day one',
    voice: about.heading_accent || 'is the same person who hands you the finished site.',
  },
  {
    route: 'photography',
    head: photo.heading || 'Photography that matches the',
    voice: photo.heading_accent || 'website it lives on.',
  },
  { route: 'journal', head: 'Notes from', voice: 'the studio.' },
  {
    route: 'contact',
    head: contact.heading || 'Start a project, or just',
    voice: contact.heading_accent || 'say hello.',
  },
  { route: 'colophon', head: 'How this site', voice: 'is made.' },
  { route: 'privacy', head: 'What I do with', voice: 'your information.' },
  { route: 'accessibility', head: 'Accessibility', voice: 'statement.' },
  {
    route: '404',
    head: 'That page',
    voice: 'wandered off.',
  },
];

const feed = await readFeedItems();
const caseStudies = await emdashCaseStudies(feed);
if (caseStudies.length === 0) {
  console.warn(
    `[og] WARNING: no published case studies from ${EMDASH_URL}. Keeping the committed ` +
      'public/og/work/*.png cards as they are (nothing deleted, build not failed).',
  );
} else {
  console.log(`[og] ${caseStudies.length} case studies read from ${EMDASH_URL}`);
}

const journal = emdashJournal(feed);
console.log(`[og] ${journal.length} journal entries read from ${EMDASH_URL}`);

const pages = [...STATIC_PAGES, ...caseStudies, ...journal];

let count = 0;
for (const page of pages) {
  // A case study whose cover could not be fetched keeps its committed card
  // rather than being overwritten by a type-only fallback.
  if (page.route.startsWith('work/') && !page.coverBuf) {
    console.warn(`[og] ${page.route}: no cover, keeping the committed card`);
    continue;
  }
  const { route, coverBuf, ...spec } = page;
  await writeCard(route, spec, coverBuf);
  count += 1;
}
console.log(`Generated ${count} OG cards into public/og/`);
