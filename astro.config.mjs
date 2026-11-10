// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { journalOpen } from './src/data/journal-gate.ts';
import { photographyOpen } from './src/data/photography-gate.ts';
import { frontmatterLastmod } from './src/lib/sitemap-dates.ts';

// The /photography gate (overhaul 2.8). The sitemap filter runs before the
// content layer exists, so count the photos collection's JSON files here, the
// same files its glob loader reads. The rule itself lives in
// src/data/photography-gate.ts, shared with the nav and the page's noindex.
const photoFiles = readdirSync(new URL('./src/content/photos/', import.meta.url), {
  recursive: true,
}).filter((name) => String(name).endsWith('.json')).length;
const photographyIsOpen = photographyOpen(photoFiles);

// The /journal gate: the same idea, counting published entries (drafts stay out).
const journalDir = new URL('./src/content/journal/', import.meta.url);
const journalEntries = existsSync(journalDir)
  ? readdirSync(journalDir, { recursive: true })
      .map(String)
      .filter((name) => /\.mdx?$/.test(name))
      .filter(
        (name) =>
          !/^draft:\s*true/m.test(
            readFileSync(new URL(name.replaceAll('\\', '/'), journalDir), 'utf8'),
          ),
      ).length
  : 0;
const journalIsOpen = journalOpen(journalEntries);

// Real dates for the sitemap's <lastmod>: case studies and journal entries, read from their
// frontmatter. Pages with no date in their content get no lastmod (src/lib/sitemap-dates.ts).
const lastmodByPath = new Map();
for (const [folder, base] of [
  ['./src/content/case-studies/', '/work/'],
  ['./src/content/journal/', '/journal/'],
]) {
  const dir = new URL(folder, import.meta.url);
  if (!existsSync(dir)) continue;
  for (const name of readdirSync(dir).filter((file) => file.endsWith('.mdx'))) {
    const date = frontmatterLastmod(readFileSync(new URL(name, dir), 'utf8'));
    if (date) lastmodByPath.set(`${base}${name.replace(/\.mdx$/, '')}/`, date);
  }
}

// =============================================================================
// Astro config
// =============================================================================
// `site` is the canonical production URL. Sitemap and OG tags read from it.
//
// `output: 'static'` prerenders every page to plain HTML at build time. The
// Cloudflare adapter stays installed so individual pages can opt into server
// rendering later via `export const prerender = false`, but in the static
// default it's effectively inert for this site.
//
//   - mdx       : powers the case-studies + journal content collections
//   - sitemap   : emits sitemap-index.xml and sitemap-0.xml at build time
//
// prefetch: links preload as they enter the viewport, so a page load feels instant
// and the cross-document view transition (kit.css) has the next page ready.
// =============================================================================
export default defineConfig({
  site: 'https://nixoncreativestudio.com',
  output: 'static',
  // Every page lives at /x/ (canonical and sitemap agree); a slashless internal
  // link is a 307 on Cloudflare and Search Console reports it (PORTS Card 89).
  trailingSlash: 'always',
  // Keep the whitespace in the markup: the headline's words are inline spans, and
  // compression joins two words that the formatter put on separate lines.
  compressHTML: false,
  // Astro 7's adapter no longer forces server mode; this site never used sessions.
  session: false,
  // The standalone /now page was merged into the About page. Keep old links and
  // bookmarks working with a static redirect.
  redirects: {
    '/now': '/about/',
    // A retired case study (2026-10-01). Send any old links or search results
    // to the work index instead of a 404.
    '/work/west-chester-preschool': '/work/',
    // /work/cincy-table is a 301 in public/_redirects (a real status code, not a meta refresh).
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
  // imageService: 'compile' makes Astro optimize <Image /> at BUILD time with
  // Sharp, emitting static .webp files into dist/_astro/. Without it the
  // Cloudflare adapter defaults to its runtime image service, so the built
  // HTML points at a /_image?... endpoint that only works if the Cloudflare
  // Images binding is configured on the Pages project. On this fully-static
  // site that runtime dependency left every case-study cover stuck on its
  // blur-up placeholder in production. Build-time images need no binding and
  // work on any host.
  adapter: cloudflare({ imageService: 'compile' }),
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
    },
  },
  integrations: [
    mdx(),
    // /coming-soon/ is the pre-launch gate page, not content: it is noindex
    // (see src/pages/coming-soon.astro), and a sitemap must not list a
    // noindex page (Search Console flags the mismatch).
    // Out of the sitemap: the Coming Soon gate and, while their gates are closed, the
    // noindex /photography/ and /journal/ pages.
    sitemap({
      filter: (page) =>
        !page.includes('/coming-soon') &&
        !page.includes('/text/') &&
        (photographyIsOpen || !page.includes('/photography')) &&
        (journalIsOpen || !page.includes('/journal')),
      serialize: (item) => {
        const lastmod = lastmodByPath.get(new URL(item.url).pathname);
        return lastmod ? { ...item, lastmod } : item;
      },
    }),
  ],
});
