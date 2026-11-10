import { test, expect } from '@playwright/test';

// =============================================================================
// [data-build]: a big line below the fold builds, word by word, as you scroll
// =============================================================================
// kit.js wraps the words in .bw spans and lifts them in, tied to the scroll. The
// heading keeps its plain sentence as its accessible name. Words never start at
// opacity 0 (they start at .15), and they are all home once the line's top has
// reached 40 percent of the screen. Reduced motion and a page that loads already
// scrolled leave the line simply set, with no spans at all.
// =============================================================================

const LINES = [
  { route: '/', name: 'Eight selected case studies.' },
  { route: '/about/', name: 'One person.' },
  { route: '/churches/', name: 'Churches I have built for' },
];

for (const { route, name } of LINES) {
  test(`${route}: the big line builds on scroll and keeps its name`, async ({ browser }) => {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: 'no-preference',
    });
    const page = await ctx.newPage();
    await page.goto(route, { waitUntil: 'load' });
    const line = page.locator('[data-build]');
    await expect(line).toHaveAttribute('aria-label', name);
    await expect(page.getByRole('heading', { name })).toHaveCount(1);
    const words = line.locator('.bw');
    expect(await words.count()).toBe(name.split(' ').length);
    // Below the fold the words wait low but at full ink, so an audit at load meets no faded text.
    await expect
      .poll(() => words.last().evaluate((w) => (w as HTMLElement).style.transform))
      .toContain('translateY');
    expect(await words.last().evaluate((w) => (w as HTMLElement).style.opacity)).toBe('');
    // Just in sight: the last word is faint, from .15 and never 0.
    await page.evaluate(() => {
      const el = document.querySelector('[data-build]')!;
      scrollTo(0, el.getBoundingClientRect().top + scrollY - innerHeight * 0.97);
    });
    await expect
      .poll(() => words.last().evaluate((w) => Number((w as HTMLElement).style.opacity)))
      .toBeCloseTo(0.15, 2);
    // Scroll the line's top to 35 percent of the screen: every word is home.
    await page.evaluate(() => {
      const el = document.querySelector('[data-build]')!;
      scrollTo(0, el.getBoundingClientRect().top + scrollY - innerHeight * 0.35);
    });
    await expect
      .poll(() =>
        words.evaluateAll((ws) => ws.every((w) => (w as HTMLElement).style.opacity === '')),
      )
      .toBe(true);
    await ctx.close();
  });
}

test('under reduced motion the big line is simply set', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('/', { waitUntil: 'load' });
  await expect(page.locator('[data-build] .bw')).toHaveCount(0);
  await ctx.close();
});
