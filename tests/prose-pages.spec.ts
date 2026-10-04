import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// =============================================================================
// Privacy, Accessibility and Colophon: the page IS the CMS entry (PR 10 gate)
// =============================================================================
// The words of the three long-text pages come from the `pages` collection and are
// drawn by one template (src/components/ProsePage.astro). Three things must not
// change in the move, and these tests pin them:
//
//   1. Every anchor the old pages exposed still exists, so an inbound link such as
//      /accessibility/#report keeps landing on its section. OLD_ANCHORS is the list
//      the hand-written pages carried; it is typed in here on purpose (not read from
//      the JSON) so a change to the content file cannot quietly redefine "old".
//   2. The "On this page" list is built from the headings, so every link in it points
//      at a heading that exists.
//   3. The scroll-spy still binds on a first load AND after a View Transitions
//      navigation (the page script registers on astro:page-load with a re-bind guard).
//
// The expected words come from cms/content/pages.json, the same file the CI dataset
// (`ncs-ci`) is generated from and production serves as its fallback until its data
// is loaded. Run against production after an admin edit and the word checks will
// (correctly) notice the text moved: update the JSON in the same change.

const OLD_ANCHORS: Record<string, string[]> = {
  '/privacy/': ['contact-form', 'analytics', 'server-logs', 'cookies', 'your-data', 'changes'],
  '/accessibility/': ['the-standard', 'in-practice', 'how-its-checked', 'where-it-stops', 'report'],
};

interface PtBlock {
  style?: string;
  children?: { text: string }[];
}
interface PageEntry {
  slug: string;
  data: {
    heading: string;
    summary: string;
    content?: PtBlock[];
    rows?: { label: string; detail: string }[];
  };
}
const entries = JSON.parse(
  readFileSync(join(process.cwd(), 'cms/content/pages.json'), 'utf8'),
) as PageEntry[];
const entry = (slug: string) => entries.find((e) => e.slug === slug)!.data;
const h2s = (slug: string) =>
  (entry(slug).content ?? [])
    .filter((b) => b.style === 'h2')
    .map((b) => (b.children ?? []).map((c) => c.text).join(''));

for (const [path, ids] of Object.entries(OLD_ANCHORS)) {
  const slug = path.replace(/\//g, '');

  test.describe(`${path} sections`, () => {
    test.use({ javaScriptEnabled: false });

    test('every old anchor still resolves to a heading', async ({ page }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      for (const id of ids) {
        await expect(page.locator(`h2#${id}`), `#${id}`).toHaveCount(1);
        // The matching "On this page" entry links to it.
        await expect(page.locator(`nav[aria-label="On this page"] a[href="#${id}"]`)).toHaveCount(
          1,
        );
      }
    });

    test('the headings are the CMS words, in order, and the list matches them', async ({
      page,
    }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('main h1')).toHaveText(entry(slug).heading);
      await expect(page.locator('main h2')).toHaveText(h2s(slug));
      await expect(page.locator('nav[aria-label="On this page"] a')).toHaveText(h2s(slug));
    });

    test('every link in the list points at an element that exists', async ({ page }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      const targets = await page.$$eval('nav[aria-label="On this page"] a', (links) =>
        links.map((a) => a.getAttribute('href') ?? ''),
      );
      expect(targets.length).toBeGreaterThan(0);
      for (const href of targets) {
        expect(href.startsWith('#'), href).toBe(true);
        await expect(page.locator(`[id="${href.slice(1)}"]`), href).toHaveCount(1);
      }
    });
  });
}

test.describe('/colophon/ rows', () => {
  test.use({ javaScriptEnabled: false });

  test('the rows are the CMS words, then the computed Last built row', async ({ page }) => {
    await page.goto('/colophon/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main h1')).toHaveText('Colophon');
    const rows = entry('colophon').rows ?? [];
    await expect(page.locator('main dl dt')).toHaveText([
      ...rows.map((r) => r.label),
      'Last built',
    ]);
    for (const row of rows) {
      await expect(page.getByText(row.detail, { exact: true })).toBeVisible();
    }
    // "Last built" is a month and year, stamped at render time.
    await expect(page.locator('main dl dd').last()).toHaveText(/^[A-Z][a-z]+ \d{4}$/);
    // The header and footer carry the same CTA, so look inside <main> only.
    await expect(
      page.locator('main').getByRole('link', { name: 'Start a project' }),
    ).toHaveAttribute('href', '/contact/');
  });

  test('the colophon no longer says the pages are static HTML', async ({ page }) => {
    await page.goto('/colophon/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main')).not.toContainText(/static html/i);
  });
});

test.describe('the prose pages carry no mono labels or eyebrows', () => {
  for (const path of ['/privacy/', '/accessibility/', '/colophon/']) {
    test(`${path} uses plain headings`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      // Code in the prose (the Privacy page's `_ga` cookie name) is rightly monospace: it is
      // content, not a label, so <code> and <pre> are left out (2026-10-04).
      await expect(
        page.locator('main .font-mono:not(code, pre), main [class*="uppercase"]:not(code, pre)'),
      ).toHaveCount(0);
      // The first thing in the page is the headline, not a label above it.
      await expect(page.locator('main h1')).toHaveCount(1);
    });
  }
});

test.describe('/privacy/ links and meta', () => {
  test('external links open in a new tab safely, the email link does not', async ({ page }) => {
    await page.goto('/privacy/', { waitUntil: 'domcontentloaded' });
    const external = page.locator('main a[href^="https://"]');
    expect(await external.count()).toBeGreaterThanOrEqual(4);
    for (const a of await external.all()) {
      await expect(a).toHaveAttribute('target', '_blank');
      await expect(a).toHaveAttribute('rel', 'noopener noreferrer');
    }
    const mail = page.locator('main a[href^="mailto:"]').first();
    await expect(mail).not.toHaveAttribute('target', /.+/);
  });

  test('title and description come from the entry', async ({ page }) => {
    await page.goto('/privacy/', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle('Privacy | Nixon Creative Studio');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      entry('privacy').summary,
    );
  });
});

test.describe('scroll-spy script', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('binds on a direct load', async ({ page }) => {
    await page.goto('/accessibility/');
    await expect(page.locator('nav[aria-label="On this page"]')).toHaveAttribute(
      'data-spy-bound',
      'true',
    );
  });

  test('marks the section being read, and re-binds after a client-side navigation', async ({
    page,
  }) => {
    // Land on the colophon (no list), then use the footer to reach Privacy through
    // the View Transitions router: the script must bind on astro:page-load.
    await page.goto('/colophon/');
    await page.locator('footer a[href="/privacy/"]').first().click();
    await page.waitForURL(/\/privacy\/?$/);
    const toc = page.locator('nav[aria-label="On this page"]');
    await expect(toc).toHaveAttribute('data-spy-bound', 'true');

    // Scroll the third section to reading position: its list entry becomes current.
    await page.locator('h2#server-logs').scrollIntoViewIfNeeded();
    await page.evaluate(() => {
      const el = document.getElementById('server-logs');
      if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 160);
    });
    await expect(toc.locator('a[aria-current="true"]')).toHaveText('Server logs');
  });
});
