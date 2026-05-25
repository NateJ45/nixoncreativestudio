// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
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
// Integrations:
//   - mdx       : powers the case-studies content collection
//   - sitemap   : emits sitemap-index.xml and sitemap-0.xml at build time
//   - react     : enables React islands (shadcn/ui, photo lightbox, motion)
//
// Tailwind 4 wires in via Vite plugin (not the older @astrojs/tailwind
// integration). Theme tokens live in src/styles/globals.css via @theme.
// =============================================================================
export default defineConfig({
  site: 'https://nixoncreativestudio.com',
  output: 'static',
  adapter: cloudflare(),
  integrations: [mdx(), sitemap(), react()],

  vite: {
    plugins: [tailwindcss()],
  },
});
