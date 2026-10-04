import { test, expect } from '@playwright/test';
import { journalDraftSlug, journalEmpty, journalSlugs } from './routes';

// =============================================================================
// The journal reads the CMS `posts` collection (CMS-DESIGN PR 12 gate)
// =============================================================================
// The CI dataset carries one published entry and one draft, written by hand in
// scripts/ci-dataset/ci-content/posts.json (production carries neither). This spec
// proves, on the deployed Worker:
//   - the published entry renders its headings, list, quote, code block, tag and
//     cover, with the shared prose styling;
//   - the DRAFT is not visible anywhere: not its own address (smoke.spec.ts also
//     checks the 404), not /journal, not /rss.xml, not the sitemap, not the nav;
//   - the feed and the journal sitemap list the published entry and nothing else;
//   - with JOURNAL_EMPTY=1 (CI journal rebuilt with no test content, the state
//     production is in) the sitemap is a valid empty one and the feed has no journal
//     item.
//
// The axe sweep (a11y.spec.ts) covers /journal and the entry page through
// tests/routes.ts.

const entry = journalSlugs[0];
const DRAFT_TEXT = 'must never be visible';

test.describe('/journal/<entry>', () => {
  test.skip(journalEmpty, 'the CI journal has no test entry in this run (JOURNAL_EMPTY=1)');

  test('renders the entry: heading, body blocks, tag, cover and card meta', async ({ page }) => {
    const resp = await page.goto(`/journal/${entry}/`, { waitUntil: 'domcontentloaded' });
    expect(resp?.status()).toBe(200);
    await expect(page).toHaveTitle('A CI test journal entry | Nixon Creative Studio');
    await expect(page.locator('h1')).toHaveText('A CI test journal entry');
    await expect(page.locator('article')).toContainText('min read');
    await expect(page.locator('article')).toContainText('Updated');

    const prose = page.locator('[data-prose]');
    // h2 and h3 carry ids (the heading anchors work as on case studies).
    await expect(prose.locator('h2#a-section-heading')).toHaveText('A section heading');
    await expect(prose.locator('h3#a-subsection')).toHaveText('A subsection');
    await expect(prose.locator('ul li')).toHaveText(['The first item', 'The second item']);
    await expect(prose.locator('blockquote')).toContainText('A quote is set apart');
    await expect(prose.locator('a[href="https://example.com/"]')).toHaveText('link');
    await expect(prose.locator('strong')).toHaveText('journal');

    // The code block is plain, readable and keyboard-focusable (axe's scrollable-region rule).
    const pre = prose.locator('pre');
    await expect(pre).toHaveAttribute('tabindex', '0');
    await expect(pre.locator('code')).toHaveText("const greeting = 'hello';");
    // No leading whitespace inside the <pre> (it would indent the first line).
    expect(await pre.evaluate((el) => el.textContent)).toBe("const greeting = 'hello';");

    // Tag chips in the header and the "Filed under" footer.
    await expect(page.locator('article li', { hasText: 'CI notes' })).toHaveCount(2);

    // The cover is a resized WebP, not the original.
    const cover = page.locator('article img').first();
    await expect(cover).toHaveAttribute('src', /\/_image\?href=.*&w=\d+&f=webp/);

    // The reading-progress bar and the share card.
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      new RegExp(`/og/journal/${entry}\\.png$`),
    );
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
    const ld = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((els) => els.map((e) => e.textContent ?? ''));
    expect(
      ld.some((t) => t.includes('"@type":"Article"') && t.includes('A CI test journal entry')),
    ).toBe(true);
  });

  test('the Journal link is in the header and the footer menus', async ({ page }) => {
    await page.goto('/about/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('header nav[aria-label="Primary"] a[href="/journal/"]')).toHaveCount(
      1,
    );
    await expect(page.locator('footer a[href="/journal/"]')).toHaveCount(1);
  });
});

test.describe('a draft is never visible', () => {
  test('not on /journal, in the nav, or on its own address', async ({ page, request }) => {
    const list = await page.goto('/journal/', { waitUntil: 'domcontentloaded' });
    expect(list?.status()).toBe(200);
    const html = await page.content();
    expect(html).not.toContain(journalDraftSlug);
    expect(html).not.toContain(DRAFT_TEXT);

    const own = await request.get(`/journal/${journalDraftSlug}/`, { maxRedirects: 0 });
    expect(own.status()).toBe(404);
    expect(await own.text()).not.toContain(DRAFT_TEXT);
    // The slashless address redirects to the slashed one (the worker's own rule) or 404s;
    // either way it must never serve the draft.
    const slashless = await request.get(`/journal/${journalDraftSlug}`, { maxRedirects: 5 });
    expect(slashless.status()).toBe(404);
  });

  test('not in /rss.xml or the journal sitemap', async ({ request }) => {
    const rss = await (await request.get('/rss.xml')).text();
    expect(rss).not.toContain(journalDraftSlug);
    expect(rss).not.toContain(DRAFT_TEXT);
    const sitemap = await (await request.get('/sitemap-posts.xml')).text();
    expect(sitemap).not.toContain(journalDraftSlug);
  });
});

test.describe('feed and sitemap', () => {
  test('/rss.xml lists the published entry beside the case studies', async ({ request }) => {
    const res = await request.get('/rss.xml');
    expect(res.status()).toBe(200);
    const rss = await res.text();
    // Case studies are always there.
    expect(rss).toContain('/work/second-presbyterian-chicago/');
    if (journalEmpty) {
      expect(rss).not.toContain('/journal/');
    } else {
      expect(rss).toContain(`/journal/${entry}/`);
      expect(rss).toContain('A CI test journal entry');
    }
  });

  test('/sitemap-posts.xml is valid XML, with trailing slashes, and empty when nothing is published', async ({
    request,
  }) => {
    const res = await request.get('/sitemap-posts.xml');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('xml');
    const xml = await res.text();
    expect(xml).toContain('<urlset');
    if (journalEmpty) {
      expect(xml).not.toContain('<url>');
    } else {
      expect(xml).toMatch(new RegExp(`<loc>[^<]*/journal/${entry}/</loc>`));
    }
  });

  test('the sitemap index points at the journal sitemap', async ({ request }) => {
    const res = await request.get('/sitemap-index.xml');
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain('/sitemap-posts.xml');
  });
});
