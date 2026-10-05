import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// =============================================================================
// /about copy, pictures and structured data: the page IS the CMS entry (PR 8 gate)
// =============================================================================
// The headline, intro, thesis, story, "Outside the studio" photos, principles, the
// Currently lists, the Testimonials heading and the Lighthouse numbers now come from
// the `page_about` entry, and the Person JSON-LD is built from the same entry. The
// acceptance gate for this PR is the pictures: the headshot and every photo must be
// served as a resized WebP from /_image, never the original file, whichever source
// they come from (CMS media on the CMS path, bundled files on the fallback path).
//
// The expected text comes from cms/content/page_about.json. The CI dataset (`ncs-ci`)
// is generated from the same file (scripts/ci-dataset/cms-fixtures.mjs) and
// production serves it as its fallback until its data is loaded. Run against
// production after an admin edit and this test will (correctly) notice the words
// moved: update the JSON in the same change.

interface About {
  heading: string;
  heading_accent: string;
  intro: string;
  headshot_alt: string;
  thesis_before: string;
  thesis_accent: string;
  thesis_after: string;
  story_heading: string;
  story_body: { children: { text: string }[] }[];
  outside_heading: string;
  photos: { caption: string; alt: string }[];
  principles_heading: string;
  principles: { title: string; body: string }[];
  currently_heading: string;
  working_on: { text: string }[];
  booking: { label: string; status: string; detail: string }[];
  reading: { title: string; author: string; note?: string }[];
  learning: { text: string }[];
  testimonials_heading: string;
  lighthouse_performance: number;
  lighthouse_accessibility: number;
  lighthouse_best_practices: number;
  lighthouse_seo: number;
  job_title: string;
}
const about = (
  JSON.parse(readFileSync(join(process.cwd(), 'cms/content/page_about.json'), 'utf8')) as {
    data: About;
  }
).data;
const storyParagraphs = about.story_body.map((b) => b.children.map((c) => c.text).join(''));

// A fresh context with scripts off: the page the no-JS visitor (or a crawler) gets.
test.describe('About copy without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('/about/: headline, intro, thesis and the story are the CMS words', async ({ page }) => {
    await page.goto('/about/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1#about-hero-heading')).toHaveText(
      `${about.heading} ${about.heading_accent}`,
    );
    await expect(page.getByText(about.intro, { exact: true })).toBeVisible();
    await expect(page.locator('section[aria-label="In short"] p').last()).toHaveText(
      `${about.thesis_before} ${about.thesis_accent} ${about.thesis_after}`,
    );
    await expect(page.locator('#about-story-heading')).toHaveText(about.story_heading);
    for (const paragraph of storyParagraphs) {
      await expect(page.getByText(paragraph, { exact: true })).toBeVisible();
    }
    await expect(page.locator('#about-outside-heading')).toHaveText(about.outside_heading);
    await expect(page.locator('#about-how-heading')).toHaveText(about.principles_heading);
    await expect(page.locator('#about-currently-heading')).toHaveText(about.currently_heading);
  });

  test('/about/: the principles and the Currently block are the CMS words', async ({ page }) => {
    await page.goto('/about/', { waitUntil: 'domcontentloaded' });
    await expect(
      page.locator('#about-how-heading').locator('xpath=ancestor::section[1]//li/h3'),
    ).toHaveText(about.principles.map((p) => p.title));

    const now = page.locator('#now');
    await expect(now.locator('#now-working ~ ul li')).toHaveText(
      about.working_on.map((w) => w.text),
    );
    await expect(now.locator('#now-booking ~ ul li p')).toHaveText(
      about.booking.map((b) => b.detail),
    );
    // Availability is never colour alone: each row prints its status word.
    await expect(now.locator('#now-booking ~ ul li').first()).toContainText(
      about.booking[0].status === 'open' ? 'Open' : 'Limited',
    );
    for (const book of about.reading) {
      await expect(now.getByText(book.title, { exact: false }).first()).toBeVisible();
      await expect(now.getByText(book.author, { exact: true })).toBeVisible();
    }
    await expect(now.locator('#now-learning ~ ul li')).toHaveText(
      about.learning.map((l) => l.text),
    );
    // The freshness pill and the stamp are derived from the "last updated" date.
    await expect(
      now.getByText(/^Updated (today|yesterday|\d+ (days|weeks|months?) ago)$/),
    ).toBeVisible();
    await expect(now.getByText(/^Last updated [A-Z][a-z]+ \d{1,2}, \d{4}\.$/)).toBeVisible();
  });

  test('/about/: the Lighthouse panel shows the four numbers from the entry', async ({ page }) => {
    await page.goto('/about/', { waitUntil: 'domcontentloaded' });
    const text = await page
      .locator('p.sr-only', { hasText: 'Lighthouse mobile scores' })
      .textContent();
    expect(text).toContain(`Performance ${about.lighthouse_performance} out of 100`);
    expect(text).toContain(`Accessibility ${about.lighthouse_accessibility} out of 100`);
    expect(text).toContain(`Best Practices ${about.lighthouse_best_practices} out of 100`);
    expect(text).toContain(`SEO ${about.lighthouse_seo} out of 100`);
  });

  test('/about/: the Person JSON-LD is built from the entry and the site settings', async ({
    page,
  }) => {
    await page.goto('/about/', { waitUntil: 'domcontentloaded' });
    const blocks = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((els) => els.map((e) => e.textContent ?? ''));
    const graph = blocks.flatMap((b) => {
      const parsed = JSON.parse(b) as Record<string, unknown> | Record<string, unknown>[];
      return Array.isArray(parsed) ? parsed : [parsed];
    });
    const person = graph.find((g) => g['@type'] === 'Person') as {
      '@id': string;
      name: string;
      jobTitle: string;
      worksFor: { '@id': string };
      url: string;
      sameAs: string[];
    };
    expect(person.jobTitle).toBe(about.job_title);
    expect(person.name).toBe('Nathan Nixon');
    expect(person['@id']).toMatch(/\/about\/#person$/);
    expect(person.url).toMatch(/\/about\/$/);
    expect(person.worksFor['@id']).toMatch(/#organization$/);
    expect(person.sameAs).toHaveLength(2);
  });
});

test('/about/: the title and meta description come from the about entry', async ({ page }) => {
  await page.goto('/about/', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveTitle(/^About \| Nixon Creative Studio$/);
  const description = await page.locator('meta[name="description"]').getAttribute('content');
  expect((description ?? '').length).toBeGreaterThanOrEqual(50);
});

// The PR 8 acceptance gate: pictures come out as resized WebP, never the original.
test('/about/: the headshot and every photo are resized WebP from /_image, with alt text', async ({
  page,
  request,
}) => {
  await page.goto('/about/', { waitUntil: 'domcontentloaded' });

  // The headshot is the first picture on the page, then the Outside-the-studio buttons.
  const headshot = page.locator('main img').first();
  const photos = page.locator('button[data-zoom] img');
  await expect(photos).toHaveCount(about.photos.length);
  await expect(headshot).toHaveAttribute('alt', about.headshot_alt);
  await expect(photos).toHaveCount(about.photos.length);
  for (const [i, photo] of about.photos.entries()) {
    await expect(photos.nth(i)).toHaveAttribute('alt', photo.alt);
  }

  const all = [headshot, ...Array.from({ length: about.photos.length }, (_, i) => photos.nth(i))];
  for (const img of all) {
    // Never the original file: the URL goes through the resizer.
    const src = (await img.getAttribute('src')) ?? '';
    expect(src, 'a resizer URL, not a raw media or asset file').toMatch(/^\/_image\?/);
    expect(await img.getAttribute('srcset')).toMatch(/\/_image\?/);
    // And what the resizer sends back is a WebP (a GET: HEAD requests skip the image cache).
    const res = await request.get(src.replace(/&amp;/g, '&'));
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toBe('image/webp');
  }
});
