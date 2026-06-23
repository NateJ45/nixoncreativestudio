// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';
import expressiveCode from 'astro-expressive-code';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import partytown from '@astrojs/partytown';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';

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
//   - partytown : runs the Cloudflare Web Analytics beacon in a web worker so
//                 it stays off the main thread (the beacon script carries
//                 type="text/partytown" in Analytics.astro)
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
  // The standalone /now page was merged into the About page (its Currently
  // section). Keep old links and bookmarks working with a static redirect.
  redirects: {
    '/now': '/about/#now',
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
  integrations: [
    // Themed code blocks for MDX. Dark theme is tied to the site's .dark class
    // so a code sample flips with the theme toggle instead of prefers-color-scheme.
    expressiveCode({
      themes: ['github-dark', 'github-light'],
      themeCssSelector: (theme) => (theme.name === 'github-dark' ? '.dark' : ':root'),
      styleOverrides: { borderRadius: '0.5rem' },
    }),
    mdx(),
    sitemap(),
    // Run the Cloudflare analytics beacon in a worker. forward is empty: the
    // beacon fires its own requests and exposes no global push API to proxy.
    partytown({ config: { forward: [] } }),
    react(),
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});
