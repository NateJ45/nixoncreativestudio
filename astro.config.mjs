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
import { d1, r2, sandbox } from '@emdash-cms/cloudflare';

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
// Integrations (order matters: expressiveCode must precede mdx):
//   - expressiveCode : themed code blocks in MDX (journal dev posts). Maps its
//                      dark theme to the site's .dark class so code follows the
//                      site theme.
//   - mdx       : powers the case-studies + journal content collections
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
  output: 'static',
  // Sessions are ON for the EmDash trial: admin sign-in needs a session driver.
  // The Cloudflare adapter supplies one (KV binding "SESSION") when `session`
  // is left unset. The live static site had `session: false`.
  // The standalone /now page was merged into the About page (its Currently
  // section). Keep old links and bookmarks working with a static redirect.
  redirects: {
    '/now': '/about/#now',
    // A retired case study (2026-10-01). Send any old links or search results
    // to the work index instead of a 404.
    '/work/west-chester-preschool': '/work/',
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
  // Astro's image service only resizes images from hosts it has been told to
  // trust. CMS media is served from the site's own origin (/_emdash/api/media/...),
  // so list the origins that serve it (the production domain and the trial Worker).
  image: {
    remotePatterns: [
      { protocol: 'https', hostname: 'nixoncreativestudio.com' },
      { protocol: 'https', hostname: 'www.nixoncreativestudio.com' },
      // Every Worker address on this account: the trial, the production
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
    // Themed code blocks for MDX. Dark theme is tied to the site's .dark class
    // so a code sample flips with the theme toggle instead of prefers-color-scheme.
    expressiveCode({
      themes: ['github-dark', 'github-light'],
      themeCssSelector: (theme) => (theme.name === 'github-dark' ? '.dark' : ':root'),
      styleOverrides: { borderRadius: '0.5rem' },
    }),
    mdx(),
    // @astrojs/sitemap only lists PRERENDERED routes. Pages that read the CMS
    // (home, /work/, /about/, /services/) are server-rendered now, so they are
    // listed by hand via customPages. The case studies themselves come from
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
      ],
      customSitemaps: ['https://nixoncreativestudio.com/sitemap-case_studies.xml'],
    }),
    react(),
    // EmDash CMS trial: D1 for content, R2 for media, admin at /_emdash/admin.
    emdash({
      database: d1({ binding: 'DB' }),
      storage: r2({ binding: 'MEDIA' }),
      sandboxRunner: sandbox(),
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
