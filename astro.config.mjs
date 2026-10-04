// @ts-check
import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import emdash from 'emdash/astro';
import { cacheCloudflare } from '@astrojs/cloudflare/cache';
import { d1, r2, sandbox } from '@emdash-cms/cloudflare';
// The reusable admin help plugin (first-run tour, Help page, dashboard widget, per-screen
// notes). Its words all come from cms/help/tour.json. See plugins/studio-help/README.md.
import { studioHelp } from './plugins/studio-help/src/descriptor.ts';

// Read as text and parsed here (not a JSON import) so a JSON typo is reported by
// studioHelp() with the file name and every problem, not by the bundler.
const helpContent = JSON.parse(
  readFileSync(fileURLToPath(new URL('./cms/help/tour.json', import.meta.url)), 'utf8'),
);

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
// Integrations:
//   - (expressive-code and mdx removed in CMS-DESIGN PR 14: both were unused after the journal
//                 moved into EmDash in PR 12; the journal renders code blocks with JournalCode.astro)
//   - sitemap   : emits sitemap-index.xml and sitemap-0.xml at build time
//   - (partytown removed 2026-09-04: its sandbox cost more main-thread time
//                 than the one small beacon it isolated; Analytics.astro now
//                 loads the beacon with `defer`)
//   - react     : enables React islands (the photo gallery and lightbox, the
//                 testimonial carousel, reading progress, the /work filter)
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
  // Inline every stylesheet into the HTML (redesign 2026-10-04). Render-blocking
  // CSS was the one non-JS lever C-performance-forensics found (about -1 s LCP),
  // and the foundation measured it locally on the production build, mobile
  // Lighthouse x3: home 94-97 to 97-97-97 (LCP 2.45-2.77 s to 2.43-2.49 s),
  // /services 98 to 99 (LCP 2.16 s to 1.82 s). Cost: about 25 KB of CSS in
  // every HTML response, not cached across pages. Delete this line to go back
  // to stylesheet files. DESIGN.md "Measured" has the table.
  build: { inlineStylesheets: 'always' },
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
  // here (/now to /about/#now, the retired /work/west-chester-preschool) are rows in
  // production now; a config redirect would shadow them.
  // Hover (and keyboard focus) strategy since the 2026-10-04 performance pass: the
  // viewport strategy fetched every page whose link scrolled into view (25 to 36 KB
  // each, 6 to 9 pages on the home page) whether or not anyone clicked. A hover
  // still gives about 100 to 300 ms of head start, and a cached page answers in
  // about 80 ms, so a click is just as quick and no bytes are spent on links
  // nobody follows. Gotcha 19 (reusable caching, trailing slashes) still applies.
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
    // @astrojs/sitemap only lists PRERENDERED routes, and since CMS-DESIGN PR 2
    // nothing is prerendered, so EVERY public page is listed by hand via
    // customPages. Add a line here when a page ships. Journal entries come from
    // src/pages/sitemap-posts.xml.ts (a wrapper like the case-studies one, valid
    // and empty while nothing is published; CMS-DESIGN PR 12). Same set the prerendered sitemap listed before PR 2. The
    // case studies themselves come from
    // EmDash's own per-collection sitemap (needs the `seo` support and a
    // `/work/{slug}/` URL pattern on the case_studies collection), added to the
    // same sitemap-index.xml via customSitemaps so robots.txt and Search
    // Console keep pointing at the one URL they already know. /coming-soon/ is
    // NOT listed: it is the pre-launch gate page, not content (redesign 2026, E #12).
    sitemap({
      customPages: [
        'https://nixoncreativestudio.com/',
        'https://nixoncreativestudio.com/work/',
        'https://nixoncreativestudio.com/about/',
        'https://nixoncreativestudio.com/services/',
        // The search landing pages (src/lib/landingPage.ts LANDING_SLUGS).
        // /cincinnati-event-photography/ is left out on purpose: it is noindex
        // until an Events photo is published (photographyRobots()), and a sitemap
        // must not list a noindex page. Add it here once event photos are live.
        'https://nixoncreativestudio.com/church-websites/',
        'https://nixoncreativestudio.com/nonprofit-websites/',
        'https://nixoncreativestudio.com/school-websites/',
        'https://nixoncreativestudio.com/photography/',
        'https://nixoncreativestudio.com/journal/',
        'https://nixoncreativestudio.com/contact/',
        'https://nixoncreativestudio.com/colophon/',
        'https://nixoncreativestudio.com/privacy/',
        'https://nixoncreativestudio.com/accessibility/',
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
      // Admin-only help layer (a trusted plugin: it ships React for the admin screens, so it
      // cannot be sandboxed; the LOADER binding in wrangler.jsonc is for sandboxed plugins
      // and is not used by this one). Adds no byte to any public page.
      plugins: [studioHelp({ content: helpContent })],
    }),
  ],

  vite: {
    // (The EmDash/zustand shim plugin and its optimizeDeps exclusion were removed in the
    // 2026-10-04 performance pass: zustand only came in with @react-three/fiber, which was
    // uninstalled with the WebGL hero, and `npm ls zustand` is empty. If a future package
    // brings zustand back and the build dies with MISSING_EXPORT on
    // use-sync-external-store/shim/with-selector.js, restore the shim from git history.)
    // Ground textures (src/assets/grounds, DESIGN.md "Grounds") must stay
    // separate files. Vite inlines assets under 4 KB as base64, which put the
    // wall and ink-board tiles INSIDE the render-blocking stylesheet, defeating
    // the point of attaching them after the load event (2026-10-04). Everything
    // else keeps Vite's default.
    build: {
      assetsInlineLimit: (file) => (file.includes('/assets/grounds/') ? false : undefined),
    },
    plugins: [tailwindcss()],
  },
});
