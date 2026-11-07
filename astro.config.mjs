// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { readdirSync } from 'node:fs';
import { photographyOpen } from './src/data/photography-gate.ts';

// The /photography gate (overhaul 2.8). The sitemap filter runs before the
// content layer exists, so count the photos collection's JSON files here, the
// same files its glob loader reads. The rule itself lives in
// src/data/photography-gate.ts, shared with the nav and the page's noindex.
const photoFiles = readdirSync(new URL('./src/content/photos/', import.meta.url), {
  recursive: true,
}).filter((name) => String(name).endsWith('.json')).length;
const photographyIsOpen = photographyOpen(photoFiles);

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
    defaultStrategy: 'viewport',
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
    // Out of the sitemap: the Coming Soon gate and, while its gate is closed, the
    // noindex /photography/ page.
    sitemap({
      filter: (page) =>
        !page.includes('/coming-soon') &&
        (photographyIsOpen || !page.includes('/photography')),
    }),
  ],
});
