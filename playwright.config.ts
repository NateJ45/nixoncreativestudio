import { defineConfig, devices } from '@playwright/test';

// =============================================================================
// Playwright config (family standard, copied from WCP's shape)
// =============================================================================
// Tests run against the REAL production build (dist/client) served statically,
// not `astro dev`: the Cloudflare workerd dev runtime is flakier and can serve
// error pages that a naive check would read as "fine". Fresh build + no-cache
// serve each run avoids stale-CSS false results.
//
// This site is fully static (astro.config.mjs: output: 'static', no page opts
// out with prerender = false), so dist/client IS the whole site and every
// public route is reachable here. tests/routes.ts lists them.
// =============================================================================

const PORT = 4321;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests',
  // tests/unit holds node --test suites (npm run test:copy), not Playwright specs.
  // Visual baselines (overhaul 4.3) are Linux-only: visual.yml runs them through
  // playwright.visual.config.ts, never `npm test`.
  testIgnore: ['**/unit/**', '**/visual.spec.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  // Chromium runs everything. A real WebKit iPhone profile runs the
  // viewport-agnostic suites (smoke, both axe sweeps, reduced-motion): Safari's engine finds
  // layout and JS issues Chromium never will, and the WebGL hero and the
  // React islands are exactly the kind of client code that behaves differently
  // there. reflow.spec.ts drives its own explicit viewport widths
  // (320/768/1024/1440), which fights device emulation, so it is chromium-only.
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'webkit-iphone',
      use: { ...devices['iPhone 14'] },
      // reduced-motion added 2026-09-30 (starter PORTS.md card 61): WebKit is the
      // engine that strands a 0.01ms transition, so that is where it must run.
      testMatch: /(smoke|a11y|a11y-dark|reduced-motion)\.spec\.ts$/,
    },
  ],
  webServer: {
    command: 'npm run build && npm run serve:dist',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    // A cold build encodes every image as AVIF and WebP (overhaul 4.4): about two
    // minutes on a CI runner before the image cache is warm, so allow five.
    timeout: 300_000,
  },
});
