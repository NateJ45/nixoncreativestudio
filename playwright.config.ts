import { defineConfig, devices } from '@playwright/test';

// =============================================================================
// Playwright config (family standard, copied from WCP's shape)
// =============================================================================
// Tests run against a URL, set in PLAYWRIGHT_BASE_URL. This is a HYBRID site
// now: / , /work/ , /work/[slug] , /about/ , /services/ and /rss.xml are
// server-rendered from EmDash (D1 + R2), so `dist/client` is no longer the
// whole site and a static file server cannot serve those pages. The URL is one
// of:
//   - CI: the Worker VERSION preview URL that ci.yml uploads (without promoting
//     it) with `wrangler versions upload --preview-alias`.
//   - Local: the ncs-ci Worker or any other deployed URL, for example
//       PLAYWRIGHT_BASE_URL=https://ncs-ci.nathanjnixon86.workers.dev
// No webServer is started. With the variable unset this config throws a clear
// message instead of silently testing a half-site. (A local `wrangler dev`
// cannot stand in: it starts with an EMPTY local D1/R2, so every server page
// would render without data; `--remote` would read the live bindings, which a
// test run should not do. See CLAUDE.md Gotcha 12.)
//
// tests/routes.ts lists the routes, prerendered and server-rendered alike.
// =============================================================================

const baseURL = process.env.PLAYWRIGHT_BASE_URL?.replace(/\/+$/, '');
if (!baseURL) {
  throw new Error(
    'PLAYWRIGHT_BASE_URL is not set. The site is hybrid (server-rendered pages read EmDash), ' +
      'so the tests need a deployed URL, not dist/client. Set it, for example:\n' +
      '  PLAYWRIGHT_BASE_URL=https://ncs-ci.nathanjnixon86.workers.dev npx playwright test\n' +
      'CI sets it from the Worker version preview URL (see .github/workflows/ci.yml).',
  );
}

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Against a deployed Worker (cold isolates, D1 reads) one retry also absorbs a
  // slow first hit; locally a failure should be loud.
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  // Chromium runs everything. A real WebKit iPhone profile runs the
  // viewport-agnostic suites (smoke, both axe sweeps, reduced-motion): Safari's engine finds
  // layout and JS issues Chromium never will, and the WebGL hero, Lenis and
  // Embla islands are exactly the kind of client code that behaves differently
  // there. reflow.spec.ts drives its own explicit viewport widths
  // (320/768/1024/1440), which fights device emulation, so it is chromium-only.
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'webkit-iphone',
      use: { ...devices['iPhone 14'] },
      // reduced-motion added 2026-09-30 (starter PORTS.md card 61): WebKit is the
      // engine that strands a 0.01ms transition, so that is where it must run.
      testMatch: /(smoke|a11y|reduced-motion)\.spec\.ts$/,
    },
  ],
});
