import { defineConfig, devices } from '@playwright/test';

// =============================================================================
// Visual-baseline config (overhaul 4.3). NOT part of `npm test` and NOT run by
// ci.yml: playwright.config.ts ignores tests/visual.spec.ts, and only the
// manual workflow .github/workflows/visual.yml (workflow_dispatch) runs this.
//
// Why a separate config: the baselines are Linux-only PNGs. Windows and macOS
// draw the same fonts with different hinting and anti-aliasing, so a baseline
// captured on Nathan's PC would fail on CI and the reverse. Snapshot names carry
// the platform ({arg}-{projectName}-{platform}.png), so a local Windows run
// never compares against the committed linux files; it writes win32 files that
// .gitignore keeps out of the repo. Regenerate the committed set only through
// the workflow (`gh workflow run visual.yml -f update=true`).
//
// One chromium project. The spec sets viewport, colour scheme and reduced
// motion per test, so the matrix (route x 1440/390 x light/dark) lives there.
// =============================================================================

const PORT = 4321;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests',
  testMatch: /visual\.spec\.ts$/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    ...devices['Desktop Chrome'],
    reducedMotion: 'reduce',
  },
  projects: [{ name: 'chromium' }],
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
      // A hair of tolerance for sub-pixel text anti-aliasing between runs of the
      // same runner image. A real layout change moves far more than this.
      maxDiffPixelRatio: 0.002,
    },
  },
  webServer: {
    command: 'npm run build && npm run serve:dist',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
