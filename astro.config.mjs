// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// =============================================================================
// Astro config
// =============================================================================
// `site` is the canonical production URL. The sitemap integration uses it to
// emit absolute URLs in the generated sitemap files, and other integrations
// (RSS, canonical link tags) read from it too. Keep this in sync with the
// custom domain after Phase 13 cutover. Before the domain is live, the
// sitemap entries will point at nixoncreativestudio.com; that's fine because
// the production DNS will resolve there once the cutover completes.
// =============================================================================
export default defineConfig({
  site: 'https://nixoncreativestudio.com',
  adapter: cloudflare(),
  integrations: [mdx(), sitemap()],
});
