import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';

// =============================================================================
// Client quotes: only real ones, as blockquotes with a name
// =============================================================================
// src/lib/case-testimonials.test.ts guards the data; this guards the page.

const dir = 'src/content/case-studies/';
const files = readdirSync(dir)
  .filter((f) => f.endsWith('.mdx'))
  .map((f) => ({ slug: f.replace(/\.mdx$/, ''), text: readFileSync(dir + f, 'utf8') }));
// `count` is the study's own quotes (each counted once site-wide, as in the home band); `onPage`
// adds the quotes other studies share onto it with `alsoOn` (src/lib/study-quotes.ts).
const sharedOnto = (slug: string) =>
  files.reduce(
    (n, f) =>
      n +
      [...f.text.matchAll(/^\s+alsoOn: \[(.*)\]\s*$/gm)].filter((m) =>
        m[1]
          .split(',')
          .map((x) => x.trim())
          .includes(slug),
      ).length,
    0,
  );
// One slide per person in the home band (QuoteBand.astro), matched as samePerson does: first and
// last name, credentials after the comma ignored.
const person = (n: string) => {
  const w = n.split(',')[0].trim().toLowerCase().split(/\s+/);
  return `${w[0]} ${w[w.length - 1]}`;
};
const studies = files.map(({ slug, text }) => {
  const count = (text.match(/^\s*- quote:/gm) ?? []).length;
  const names = [...text.matchAll(/^\s+name: ['"]?(.+?)['"]?\s*$/gm)].map((m) => person(m[1]));
  return { slug, count, people: new Set(names).size, onPage: count + sharedOnto(slug) };
});
// Quotes that are not about a website (src/data/quotes.ts): in the home band with a photograph
// where a study's quote has the client's site.
const standalone = [
  ...readFileSync('src/data/quotes.ts', 'utf8').matchAll(/^\s{4}id: '([a-z0-9-]+)'/gm),
].map((m) => m[1]);
const bandTotal = studies.reduce((n, s) => n + s.count, 0) + standalone.length;
const slideTotal = studies.reduce((n, s) => n + s.people, 0) + standalone.length;

for (const { slug, onPage } of studies) {
  test(`/work/${slug}/ shows ${onPage} quote(s) with a name`, async ({ page }) => {
    await page.goto(`/work/${slug}/`);
    await expect(page.locator('figure.q blockquote')).toHaveCount(onPage);
    // One card per person (study/Quotes.astro), so one name per card, never per quote.
    const cards = await page.locator('figure.q').count();
    await expect(page.locator('figure.q figcaption b')).toHaveCount(cards);
    if (onPage === 0) await expect(page.locator('#in-their-words')).toHaveCount(0);
  });
}

test('the homepage band carries every quote, one at a time, starting with a public review', async ({
  page,
}) => {
  await page.goto('/');
  const band = page.locator('.home-band');
  await expect(band.locator('blockquote')).toHaveCount(bandTotal);
  await expect(band.locator('[data-q]')).toHaveCount(slideTotal);
  await expect(band.locator('[data-q]:not([inert])')).toHaveCount(1);
  // One name per slide, even where one person wrote twice (Richard Burnett, 2025 and 2026).
  await expect(band.locator('[data-q] .cite b, [data-q] .rv-who b')).toHaveCount(slideTotal);
  // Public reviews lead, and the window beside the first slide is that client's site.
  const lead = band.locator('[data-q]').first();
  await expect(lead.locator('a[href*="google.com/maps"]')).toHaveCount(1);
  await expect(band.locator('[data-tw]:not([inert]) a.tile').first()).toHaveAttribute(
    'href',
    `/work/${await lead.getAttribute('data-slug')}/`,
  );
});

test('Next and Previous step the home band through each client, color and window', async ({
  page,
}) => {
  await page.goto('/');
  const band = page.locator('.home-band');
  const n = slideTotal;
  const count = band.locator('[data-q-count]');
  await expect(count).toHaveText(`1 / ${n}`);
  const accent = () => band.evaluate((el) => el.style.getPropertyValue('--c'));
  const first = await accent();
  const seen = new Set<string>();
  for (let i = 2; i <= n; i++) {
    await band.locator('[data-q-next]').click();
    await expect(count).toHaveText(`${i} / ${n}`);
    const live = band.locator('[data-q]:not([inert])');
    await expect(live).toHaveCount(1);
    const slug = await live.getAttribute('data-slug');
    if (standalone.includes(slug!))
      await expect(band.locator('[data-tw]:not([inert]) .band-print').first()).toBeVisible();
    else
      await expect(band.locator('[data-tw]:not([inert]) a.tile').first()).toHaveAttribute(
        'href',
        `/work/${slug}/`,
      );
    expect(await accent()).toBe(await live.getAttribute('data-c'));
    seen.add(slug!);
  }
  expect(seen.size).toBeGreaterThan(1);
  await band.locator('[data-q-next]').click();
  await expect(count).toHaveText(`1 / ${n}`);
  expect(await accent()).toBe(first);
  await band.locator('[data-q-prev]').click();
  await expect(count).toHaveText(`${n} / ${n}`);
});

test('/churches/ shows the churches I photograph for, quote, name and face', async ({ page }) => {
  await page.goto('/churches/');
  const card = page.locator('.study-cam');
  await expect(card).toHaveCount(standalone.length);
  // The key sentence leads; the whole review, with its opening line, is folded under it.
  await expect(card.first().locator('blockquote')).toContainText('THE best');
  await expect(card.first().locator('.ch-more')).toContainText('Nathan is exceptional');
  await expect(card.first().locator('.rv-who b')).toHaveText('Jessica Sams');
  await expect(card.first().locator('.rv-face')).toHaveAttribute('src', /jessica-sams-96\.webp$/);
});

test('/about/ shows two quote bands', async ({ page }) => {
  await page.goto('/about/');
  await expect(page.locator('.band blockquote')).toHaveCount(2);
});

test('a quote band never touches the closing', async ({ page }) => {
  for (const route of ['/', '/about/', '/churches/']) {
    await page.goto(route);
    const touching = await page.evaluate(
      () =>
        document.querySelector('[data-end]')?.previousElementSibling?.classList.contains('band') ??
        false,
    );
    expect(touching, route).toBe(false);
  }
});

test('the home band shows a desktop window on a phone and the phone on a wide screen', async ({
  page,
}) => {
  const visible = () => page.locator('.home-band [data-tw]:not([inert]) a.tile:visible');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(visible()).toHaveCount(1);
  await expect(visible()).toHaveClass(/\bdesk\b/);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(visible()).toHaveCount(1);
  await expect(visible()).not.toHaveClass(/\bdesk\b/);
});
