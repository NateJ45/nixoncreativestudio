// @ts-check
import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';

import cloudflare from '@astrojs/cloudflare';
import expressiveCode from 'astro-expressive-code';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import emdash from 'emdash/astro';
import { cacheCloudflare } from '@astrojs/cloudflare/cache';
import { d1, r2, sandbox } from '@emdash-cms/cloudflare';

// =============================================================================
// Astro config
// =============================================================================
// `site` is the canonical production URL. Sitemap and OG tags read from it.
//
// `output: 'server'`: every page renders on the Worker per request (CMS-DESIGN
// PR 2). Nothing is prerendered, so no page can show a stale copy of content
// that lives in EmDash (contact email, legal pages, case studies). Speed comes
// from the route cache (`cache` below), not from static files.
//
// Integrations (order matters: expressiveCode must precede mdx):
//   - expressiveCode : themed code blocks in MDX. UNUSED since CMS-DESIGN PR 12: the
//                      journal moved into EmDash (Portable Text, code blocks via
//                      JournalCode.astro) and no .mdx file is left. Kept installed
//                      until PR 14 decides whether to drop the dependency.
//   - mdx       : UNUSED since PR 12 (the MDX content collections are gone); kept
//                      with expressiveCode for the same reason
//   - sitemap   : emits sitemap-index.xml and sitemap-0.xml at build time
//   - (partytown removed 2026-09-04: its sandbox cost more main-thread time
//                 than the one small beacon it isolated; Analytics.astro now
//                 loads the beacon with `defer`)
//   - react     : enables React islands (shadcn/ui, photo lightbox, motion,
//                 the WebGL hero)
//
// prefetch: links preload as they enter the viewport, so navigation feels
// instant and pairs with the View Transitions router.
//
// Tailwind 4 wires in via Vite plugin (not the older @astrojs/tailwind
// integration). Theme tokens live in src/styles/globals.css via @theme.
// =============================================================================
export default defineConfig({
  site: 'https://nixoncreativestudio.com',
  output: 'server',
  // Route cache on Cloudflare's Workers Cache. A page opts in by calling
  // Astro.cache.set(): BaseLayout sets the lifetime for every page that uses
  // it, and the CMS readers (src/lib/caseStudies.ts) add the tags of the rows
  // each page rendered. A publish in the EmDash admin purges those tags, so an
  // edit is live on the next request. The cache is partitioned by Worker
  // version, so every deploy starts cold. Deliberately NO global `routeRules`
  // entry (the design sketch had '/[...path]'): that rule also matches
  // /_emdash/** and would make signed-in admin responses cacheable. See
  // docs/EMDASH.md, "Route cache".
  cache: { provider: cacheCloudflare() },
  // Sessions are ON for the EmDash trial: admin sign-in needs a session driver.
  // The Cloudflare adapter supplies one (KV binding "SESSION") when `session`
  // is left unset. The live static site had `session: false`.
  // NO `redirects` here since CMS-DESIGN PR 13: they live in EmDash Redirects
  // (cms/content/redirects.json, loaded by `npm run cms:production-load`), so Nathan
  // can add one in the admin when he renames or retires a page. The two that used to be
  // here (/now to /about/#now, the retired /work/west-chester-preschool) have a code
  // fallback in src/lib/redirectFallback.ts, applied by src/worker.ts only when the
  // site would answer 404, until production holds the rows.
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
  // Astro's image service only resizes images from hosts it has been told to
  // trust. CMS media is served from the site's own origin (/_emdash/api/media/...),
  // so list the origins that serve it (the production domain and the ncs-ci Worker).
  image: {
    remotePatterns: [
      { protocol: 'https', hostname: 'nixoncreativestudio.com' },
      { protocol: 'https', hostname: 'www.nixoncreativestudio.com' },
      // Every Worker address on this account: ncs-ci, the production
      // workers.dev URL, and the CI preview aliases (ci-pr-N-..., lh-pr-N-...).
      // Found 2026-10-02: a host missing from this list is not an error. Astro
      // silently serves the full-size original instead of a resized WebP, which
      // made Lighthouse CI measure LCP at 8 to 11 s on pages that are fine when
      // the host is listed.
      { protocol: 'https', hostname: '**.nathanjnixon86.workers.dev' },
    ],
  },
  // EmDash trial: keep build-time optimization for the site's own images, and
  // add the Cloudflare Images binding at runtime so CMS images stored in R2 get
  // real resized WebP srcsets (EmDash passes them through Astro's image service;
  // with 'compile' alone every srcset entry pointed at the full-size original).
  adapter: cloudflare({ imageService: { build: 'compile', runtime: 'cloudflare-binding' } }),
  integrations: [
    // Themed code blocks for MDX (unused since PR 12, see the header). Dark theme is
    // tied to the site's .dark class so a code sample would flip with the theme toggle.
    expressiveCode({
      themes: ['github-dark', 'github-light'],
      themeCssSelector: (theme) => (theme.name === 'github-dark' ? '.dark' : ':root'),
      styleOverrides: { borderRadius: '0.5rem' },
    }),
    mdx(),
    // @astrojs/sitemap only lists PRERENDERED routes, and since CMS-DESIGN PR 2
    // nothing is prerendered, so EVERY public page is listed by hand via
    // customPages. Add a line here when a page ships. Journal entries come from
    // src/pages/sitemap-posts.xml.ts (a wrapper like the case-studies one, valid
    // and empty while nothing is published; CMS-DESIGN PR 12). Same set the prerendered sitemap listed before PR 2. The
    // case studies themselves come from
    // EmDash's own per-collection sitemap (needs the `seo` support and a
    // `/work/{slug}/` URL pattern on the case_studies collection), added to the
    // same sitemap-index.xml via customSitemaps so robots.txt and Search
    // Console keep pointing at the one URL they already know.
    sitemap({
      customPages: [
        'https://nixoncreativestudio.com/',
        'https://nixoncreativestudio.com/work/',
        'https://nixoncreativestudio.com/about/',
        'https://nixoncreativestudio.com/services/',
        'https://nixoncreativestudio.com/photography/',
        'https://nixoncreativestudio.com/journal/',
        'https://nixoncreativestudio.com/contact/',
        'https://nixoncreativestudio.com/colophon/',
        'https://nixoncreativestudio.com/privacy/',
        'https://nixoncreativestudio.com/accessibility/',
        'https://nixoncreativestudio.com/coming-soon/',
      ],
      customSitemaps: [
        'https://nixoncreativestudio.com/sitemap-case_studies.xml',
        'https://nixoncreativestudio.com/sitemap-posts.xml',
      ],
    }),
    react(),
    // EmDash CMS trial: D1 for content, R2 for media, admin at /_emdash/admin.
    emdash({
      database: d1({ binding: 'DB' }),
      storage: r2({ binding: 'MEDIA' }),
      sandboxRunner: sandbox(),
      // Public HTML is identical for everyone, so the route cache can serve it
      // to editors too. Editors get an Edit pill that reloads the page with
      // ?_edit, which is always rendered fresh and never cached.
      toolbar: 'client',
    }),
  ],

  vite: {
    plugins: [
      tailwindcss(),
      // EmDash/zustand compatibility (found 2026-10-02, EmDash 1.1.0).
      // EmDash aliases `use-sync-external-store/shim/with-selector.js` to its
      // own ESM shim, which only has a NAMED export. zustand (pulled in by
      // @react-three/fiber for the WebGL hero) does a DEFAULT import of that
      // file, so the build dies with MISSING_EXPORT. Rewriting zustand's import
      // to a namespace import of the same shim keeps both sides happy.
      {
        name: 'ncs-zustand-sync-store-shim',
        enforce: 'pre',
        transform(code, id) {
          if (!/zustand[\\/]esm[\\/]traditional\.mjs/.test(id)) return null;
          const shim = fileURLToPath(
            new URL(
              './node_modules/emdash/src/astro/integration/shims/use-sync-external-store-with-selector.js',
              import.meta.url,
            ),
          ).replace(/\\/g, '/');
          return code.replace(
            /import useSyncExternalStoreExports from 'use-sync-external-store\/shim\/with-selector\.js';/,
            `import * as useSyncExternalStoreExports from '${shim}';`,
          );
        },
      },
    ],
  },
});
