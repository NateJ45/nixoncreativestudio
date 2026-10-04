import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { settle } from './helpers';
import { journalEmpty, journalDraftSlug } from './routes';

// =============================================================================
// /work, /photography, /journal and the 404 page: the words ARE the CMS words,
// and the photo gallery reads the `photos` collection (CMS-DESIGN PR 11 gate)
// =============================================================================
// The expected words come from cms/content/page_*.json. The CI dataset (`ncs-ci`)
// is generated from the same files (scripts/ci-dataset/cms-fixtures.mjs) and
// production serves them as its fallback until its data is loaded, so one set of
// expectations holds on both paths.
//
// THE PHOTO. The CI dataset carries exactly one `photos` entry, written by hand in
// scripts/ci-dataset/ci-content/photos.json (production carries none). With it the
// gallery renders and is axe-checked by the normal sweeps (a11y.spec.ts and
// the axe sweep covers /photography). The "zero photos" page is the SAME render
// the page gave before this PR; it cannot be asserted here while the test photo
// exists, so it is proved by the parity run and by src/lib/photos.test.ts (an empty
// collection groups to nothing and has no hero).

const read = <T>(file: string): T =>
  JSON.parse(readFileSync(join(process.cwd(), file), 'utf8')) as T;

interface WorkData {
  heading: string;
  intro: string;
  live_heading: string;
  live_body: string;
}
interface PhotographyData {
  heading: string;
  heading_accent: string;
  intro: string;
  events_title: string;
  events_intro: string;
  empty_heading: string;
  cta_title: string;
}
interface JournalData {
  heading: string;
  intro: string;
  empty_kicker: string;
  empty_heading: string;
  empty_body: string;
}
interface NotFoundData {
  label: string;
  heading: string;
  body: string;
  links: { label: string; href: string }[];
}
const work = read<{ data: WorkData }>('cms/content/page_work.json').data;
const photography = read<{ data: PhotographyData }>('cms/content/page_photography.json').data;
const journal = read<{ data: JournalData }>('cms/content/page_journal.json').data;
const notFound = read<{ data: NotFoundData }>('cms/content/page_not_found.json').data;
const testPhoto = read<{ data: { title: string; alt: string; caption: string } }[]>(
  'scripts/ci-dataset/ci-content/photos.json',
)[0].data;

// -----------------------------------------------------------------------------
// /work
// -----------------------------------------------------------------------------
test.describe('/work', () => {
  test('shows the CMS words, with the real project count in front of the intro', async ({
    page,
  }) => {
    await page.goto('/work/', { waitUntil: 'domcontentloaded' });
    // The headline is the CMS heading; its last word is set in the italic voice.
    await expect(page.locator('h1')).toHaveText(work.heading);
    // Every study is on the page once: the lead, the live sheet, or the Also built strip.
    const shown =
      (await page.locator('[data-work-item]').count()) +
      (await page.locator('[data-work-also]').count());
    expect(shown, 'the CI dataset holds three case studies').toBeGreaterThan(0);
    // "3 projects for churches, ..." : the number is computed, the rest is the CMS text.
    const intro = page.locator('header p', { hasText: work.intro.slice(0, 30) });
    await expect(intro).toHaveText(
      new RegExp(`^\\s*${shown}\\s+projects?\\s+${work.intro.slice(0, 30)}`),
    );
  });

  test('a live study leads, and nothing that is not live is presented as live', async ({
    page,
  }) => {
    await page.goto('/work/', { waitUntil: 'domcontentloaded' });
    const lead = page.locator('[data-work-lead] [data-work-item]');
    if ((await lead.count()) > 0) {
      await expect(lead).toHaveAttribute('data-status', 'live');
    }
    // The live sheet only ever holds live studies.
    for (const item of await page.locator('[data-work-item]').all()) {
      await expect(item).toHaveAttribute('data-status', 'live');
    }
    // Each Also built entry carries its status label and links to its case study.
    for (const item of await page.locator('[data-work-also]').all()) {
      await expect(item.locator('.w-also-status')).toHaveText(
        /Launching soon|In progress|Built, not launched/,
      );
      await expect(item.locator('a[href^="/work/"]').first()).toBeVisible();
    }
    // The live sheet's heading and line are the Work page's live fields.
    if ((await page.locator('#work-live').count()) > 0) {
      await expect(page.locator('#work-live')).toHaveText(work.live_heading);
      await expect(page.getByText(work.live_body)).toBeAttached();
    }
    // No filter chips and no React island any more.
    await expect(page.locator('astro-island')).toHaveCount(0);
  });
});

// -----------------------------------------------------------------------------
// /photography
// -----------------------------------------------------------------------------
test.describe('/photography', () => {
  test('shows the CMS words and no "in progress" note once a photo exists', async ({ page }) => {
    await page.goto('/photography/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toContainText(photography.heading);
    await expect(page.locator('h1 span')).toHaveText(photography.heading_accent);
    await expect(page.getByText(photography.intro)).toBeVisible();
    await expect(page.locator('#cta-banner-title')).toHaveText(photography.cta_title);
    await expect(page.getByText(photography.empty_heading)).toHaveCount(0);
    // Only the group that has a photo gets a section and a card.
    await expect(page.locator('#events-heading')).toHaveText(photography.events_title);
    await expect(page.getByText(photography.events_intro).first()).toBeVisible();
    await expect(page.locator('#portraits')).toHaveCount(0);
    await expect(page.locator('#environments')).toHaveCount(0);
    await expect(page.locator('a[href="#events"]')).toContainText('1 photo');
  });

  test('is indexable once a photo exists (noindex only while the gallery is empty)', async ({
    page,
  }) => {
    // The CI dataset carries one photo, so the page must NOT ask to stay out of search.
    // The empty-gallery side (noindex, follow) is unit-tested in src/lib/photos.test.ts
    // (photographyRobots) and measured with NCS_CI_NO_TEST_CONTENT=1.
    await page.goto('/photography/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  });

  test('is a service page: the rate, how booking works and a clear ask', async ({ page }) => {
    await page.goto('/photography/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('from $900', { exact: false }).first()).toBeVisible();
    await expect(page.locator('#booking-heading')).toContainText('How booking');
    await expect(page.locator('main ol li')).toHaveCount(4);
    const ask = page.locator('main').getByRole('link', { name: 'Ask about a shoot' });
    await expect(ask.first()).toHaveAttribute('href', '/contact/');
  });

  test('the gallery renders the test photo with width-only resizer URLs', async ({ page }) => {
    await page.goto('/photography/', { waitUntil: 'domcontentloaded' });
    const gallery = page.locator('#events [data-photo-gallery]');
    await gallery.scrollIntoViewIfNeeded();
    const img = gallery.locator('img');
    await expect(img).toHaveCount(1);
    await expect(img).toHaveAttribute('alt', testPhoto.alt);
    // Every image URL on the page asks for a width and never a height (the 4096 px trap).
    const urls = await page.evaluate(() =>
      Array.from(document.querySelectorAll('img'))
        .flatMap((i) => [
          i.getAttribute('src') ?? '',
          ...(i.getAttribute('srcset') ?? '').split(','),
        ])
        .map((s) => s.trim().split(' ')[0])
        .filter((s) => s.startsWith('/_image')),
    );
    expect(urls.length).toBeGreaterThan(0);
    for (const u of urls) {
      expect(u, u).toMatch(/&w=\d+&f=webp$/);
      expect(u, u).not.toMatch(/[?&]h=/);
    }
    // And the resizer really answers WebP for one of them (not the untouched original).
    const resp = await page.request.get(urls[urls.length - 1]);
    expect(resp.status()).toBe(200);
    expect(resp.headers()['content-type']).toBe('image/webp');
  });

  test('opening a photo shows the full-screen viewer, and Escape closes it', async ({ page }) => {
    await page.goto('/photography/', { waitUntil: 'domcontentloaded' });
    await settle(page);
    // The grid hydrates when it scrolls into view (client:visible), so bring it there first.
    await page.locator('#events [data-photo-gallery]').scrollIntoViewIfNeeded();
    const photo = page.locator('#events .react-photo-album img');
    await expect(photo).toHaveCount(1);
    // Retry the click until the island has bound it.
    await expect(async () => {
      await photo.click();
      await expect(page.locator('.yarl__container')).toBeVisible({ timeout: 1500 });
    }).toPass({ timeout: 15000 });
    // The viewer's slide carries the photo's description and a width-only resizer URL.
    const slide = page.locator('.yarl__slide_image').first();
    await expect(slide).toHaveAttribute('alt', testPhoto.alt);
    expect(await slide.getAttribute('src')).toMatch(/^\/_image\?href=.*&w=\d+&f=webp$/);
    await page.keyboard.press('Escape');
    await expect(page.locator('.yarl__container')).toHaveCount(0);
  });
});

// -----------------------------------------------------------------------------
// The photo gallery under axe, AFTER it has hydrated
// -----------------------------------------------------------------------------
// The shared sweep (a11y.spec.ts) audits /photography as it loads, when the
// gallery is still the server copy (one per layout breakpoint, all but one hidden
// by a container query; see PhotoGallery.tsx). The island hydrates on scroll
// (client:visible) and keeps one copy, so this audits the hydrated grid and the
// viewer, which the sweep never sees. It scrolls the gallery in, waits for the picture, and audits the page,
// then again with the full-screen viewer open. (One theme since the 2026
// redesign; this used to run twice, light and dark.)
test.describe('/photography gallery: no axe violations once rendered', () => {
  {
    test('the hydrated gallery and the open viewer pass axe', async ({ page }) => {
      await page.goto('/photography/', { waitUntil: 'domcontentloaded' });
      await page.locator('#events [data-photo-gallery]').scrollIntoViewIfNeeded();
      await expect(page.locator('#events .react-photo-album img')).toHaveCount(1);
      await settle(page);

      const audit = async (label: string) => {
        const results = await new AxeBuilder({ page }).analyze();
        expect(
          results.violations,
          `${label}: ` +
            results.violations
              .map(
                (v) =>
                  `[${v.impact ?? 'unknown'}] ${v.id}: ${v.help}\n    selectors: ${v.nodes
                    .map((n) => n.target.join(' '))
                    .join(', ')}`,
              )
              .join('\n'),
        ).toEqual([]);
      };

      await audit('gallery');

      await expect(async () => {
        await page.locator('#events .react-photo-album img').click();
        await expect(page.locator('.yarl__container')).toBeVisible({ timeout: 1500 });
      }).toPass({ timeout: 15000 });
      await audit('viewer open');
    });
  }
});

// -----------------------------------------------------------------------------
// /journal
// -----------------------------------------------------------------------------
test.describe('/journal', () => {
  // The CI journal holds one published test entry and one draft (posts.json). With
  // JOURNAL_EMPTY=1 it was rebuilt with neither, which is production's state.
  test(
    journalEmpty
      ? 'shows the CMS words and the empty-state card while nothing is published'
      : 'shows the CMS words and lists the published entry, never the draft',
    async ({ page }) => {
      await page.goto('/journal/', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('h1')).toHaveText(journal.heading);
      await expect(page.getByText(journal.intro)).toBeVisible();
      if (journalEmpty) {
        await expect(page.getByText(journal.empty_kicker, { exact: true })).toBeVisible();
        await expect(page.locator('h2', { hasText: journal.empty_heading })).toBeVisible();
        await expect(page.getByText(journal.empty_body)).toBeVisible();
      } else {
        await expect(page.getByText(journal.empty_kicker, { exact: true })).toHaveCount(0);
        const card = page.locator('main a[href="/journal/ci-test-entry/"]');
        await expect(card).toHaveCount(1);
        await expect(card.locator('h2')).toHaveText('A CI test journal entry');
        await expect(card).toContainText('min read');
        await expect(card).toContainText('CI notes');
      }
      // A draft is never listed, on either path.
      await expect(page.locator(`a[href*="${journalDraftSlug}"]`)).toHaveCount(0);
      await expect(page.getByText('must never be visible')).toHaveCount(0);
    },
  );
});

// -----------------------------------------------------------------------------
// The not-found page
// -----------------------------------------------------------------------------
test.describe('the not-found page', () => {
  test('an unknown URL answers a REAL 404 with the CMS words and links', async ({ page }) => {
    const resp = await page.goto('/this-page-does-not-exist-pr11/', {
      waitUntil: 'domcontentloaded',
    });
    expect(resp?.status(), 'unknown URL HTTP status').toBe(404);
    await expect(page).toHaveTitle(/Page not found \| Nixon Creative Studio/);
    await expect(page.locator('#notfound-heading')).toHaveText(notFound.heading);
    await expect(page.getByText(notFound.label, { exact: true })).toBeVisible();
    await expect(page.getByText(notFound.body)).toBeVisible();
    const links = await page
      .locator('main .notfound-actions a')
      .evaluateAll((as) => as.map((a) => [a.textContent?.trim(), a.getAttribute('href')]));
    expect(links).toEqual(notFound.links.map((l) => [l.label, l.href]));
  });

  test('offers the site menu as next links, and no Journal link while there are no posts', async ({
    page,
  }) => {
    await page.goto('/this-page-does-not-exist-pr11/', { waitUntil: 'domcontentloaded' });
    const nav = page.locator('nav[aria-label="Pages on this site"] a');
    expect(await nav.count()).toBeGreaterThan(2);
    for (const href of await nav.evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''))) {
      expect(href, href).toMatch(/^\/.*\/$|^\/$/);
      if (journalEmpty) expect(href).not.toContain('/journal');
    }
  });

  test('/404/ by name answers 200 so Lighthouse can audit the template', async ({ page }) => {
    const resp = await page.goto('/404/', { waitUntil: 'domcontentloaded' });
    expect(resp?.status()).toBe(200);
    await expect(page.locator('#notfound-heading')).toHaveText(notFound.heading);
  });
});
