import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { site } from '../src/data/site';

// =============================================================================
// The behaviour the after-launch audits fixed, kept fixed
// =============================================================================

test.describe('The client sheet and Back', () => {
  const sheet = '[data-sheet]';

  async function openFirst(page: import('@playwright/test').Page) {
    await page.goto('/work/');
    const tile = page.locator('[data-grid] a.tile').first();
    await tile.scrollIntoViewIfNeeded();
    await expect(tile).toHaveAttribute('aria-haspopup', 'dialog');
    await tile.click();
    await expect(page.locator(sheet)).toHaveJSProperty('open', true);
  }

  test('browser Back closes the sheet and stays on the page', async ({ page }) => {
    await page.goto('/about/');
    await openFirst(page);
    await page.goBack();
    await expect(page.locator(sheet)).toHaveJSProperty('open', false);
    expect(new URL(page.url()).pathname).toBe('/work/');
    await page.goBack();
    await expect(page).toHaveURL(/\/about\/$/);
  });

  test('closing by hand steps off the history entry too', async ({ page }) => {
    await page.goto('/about/');
    await openFirst(page);
    await page.locator('[data-back]').click();
    await expect(page.locator(sheet)).toHaveJSProperty('open', false);
    await page.goBack();
    await expect(page).toHaveURL(/\/about\/$/);
  });

  test('Back from the case study returns to the sheet', async ({ page }) => {
    await openFirst(page);
    await page.locator('[data-st]').click();
    await expect(page).toHaveURL(/\/work\/[a-z0-9-]+\/$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/work\/$/);
    await expect(page.locator(sheet)).toHaveJSProperty('open', true);
    await page.goBack();
    await expect(page.locator(sheet)).toHaveJSProperty('open', false);
    await expect(page).toHaveURL(/\/work\/$/);
  });

  test('the looping clip has a pause button', async ({ page }) => {
    await openFirst(page);
    const btn = page.locator('[data-pv-toggle]');
    await expect(btn).toHaveText('Pause video');
    await btn.click();
    await expect(btn).toHaveText('Play video');
    await expect(page.locator('[data-pv]')).toHaveJSProperty('paused', true);
  });
});

test.describe('Prices', () => {
  test('the picker rebuilds its card when the radios come back checked', async ({ page }) => {
    await page.goto('/services/');
    for (const n of ['size', 'who', 'tools']) {
      await page.locator(`input[name="${n}"][value="1"]`).check({ force: true });
    }
    await expect(page.locator('[data-pick-go]')).toBeVisible();
    await page.goto('/about/');
    await page.goBack();
    await expect(page.locator('input[name="size"][value="1"]')).toBeChecked();
    await expect(page.locator('[data-pick-name]')).toHaveText('Signature');
    await expect(page.locator('[data-pick-go]')).toBeVisible();
    await expect(page.locator('[data-pick-go]')).toHaveText(/Start with\s+Signature/);
  });

  test('care plans are cards on a phone, with the table hidden', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/services/');
    await expect(page.locator('table.care')).toBeHidden();
    const cards = page.locator('.care-card');
    await expect(cards).toHaveCount(4);
    await expect(cards.first()).toBeVisible();
    await expect(cards.first()).toContainText('Hosting');
    await expect(cards.last()).toContainText('Same business day replies');
  });

  test('the care table fits a tablet with no sideways scroll', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/services/');
    await expect(page.locator('.care-card').first()).toBeHidden();
    const box = page.locator('.tbox');
    await expect(box).toBeVisible();
    const over = await box.evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(over).toBeLessThanOrEqual(0);
  });

  test('the jump nav fits one line at 1440, and its anchors exist', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/services/');
    const tops = await page
      .locator('.jump a')
      .evaluateAll(
        (els) => new Set(els.map((e) => Math.round(e.getBoundingClientRect().top))).size,
      );
    expect(tops).toBe(1);
    for (const a of await page.locator('.jump a').all()) {
      const id = (await a.getAttribute('href'))!;
      await expect(page.locator(id)).toHaveCount(1);
    }
  });
});

test.describe('Home', () => {
  test('a phone URL bar collapsing does not resize the hand', async ({ page }) => {
    // A real phone's vh units hold still for this; only a test's resize moves them, so this
    // reads what home.js itself would have changed: the room it keeps for the hand.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.evaluate(() => scrollTo({ top: 600, behavior: 'instant' }));
    await page.waitForTimeout(800);
    const room = () =>
      page
        .locator('[data-space]')
        .evaluate((s) => (s as HTMLElement).style.getPropertyValue('--stackh'));
    const before = await room();
    await page.setViewportSize({ width: 390, height: 784 });
    await page.waitForTimeout(300);
    expect(await room()).toBe(before);
    expect(before).not.toBe('');
  });

  test('a card keeps its hover while the pointer is near where it rested', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/#prices');
    await page.waitForTimeout(1200);
    const card = page.locator('[data-prices] > li').nth(1);
    const box = (await card.boundingBox())!;
    const x = box.x + box.width / 2;
    await page.mouse.move(x, box.y + box.height - 6);
    await expect(card).toHaveCSS('z-index', '5');
    // Below the card, inside the margin: still held.
    await page.mouse.move(x, box.y + box.height + 25);
    await page.waitForTimeout(250);
    await expect(card).toHaveCSS('z-index', '5');
    // Well clear of it: let go.
    await page.mouse.move(x, box.y + box.height + 120);
    await expect(card).not.toHaveCSS('z-index', '5');
  });

  test('a reload part way down does not replay the deal', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.evaluate(() => scrollTo({ top: 1600, behavior: 'instant' }));
    await page.waitForTimeout(600);
    await page.reload();
    await page.waitForFunction(() => scrollY > 0);
    await page.waitForTimeout(150);
    const t = await page
      .locator('[data-grid] .tile')
      .first()
      .evaluate((el) => (el as HTMLElement).style.transform);
    expect(t).toMatch(/translate3d\(0px, 0px/);
  });
});

test.describe('With JavaScript off', () => {
  test.use({ javaScriptEnabled: false });

  test('home and prices show no dead controls', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-draw]')).toBeHidden();
    await page.goto('/services/');
    await expect(page.locator('#pick')).toBeHidden();
  });

  test('a case study shows before and after in turn', async ({ page }) => {
    await page.goto('/work/foundation-for-reformed-theology/');
    await expect(page.locator('.ba-f input')).toBeHidden();
    const [b, a] = await Promise.all(
      ['.ba-b', '.ba-a'].map((s) =>
        page
          .locator(s)
          .first()
          .evaluate((el) => el.getBoundingClientRect().top),
      ),
    );
    expect(b).toBeLessThan(a);
  });
});

test.describe('Metadata and files', () => {
  test('the share image says how big it is and what it shows', async ({ page }) => {
    await page.goto('/about/');
    await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute(
      'content',
      '1200',
    );
    await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute(
      'content',
      '630',
    );
    await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute('content', /About/);
  });

  test('the 404 declares no canonical and no og:url', async ({ page }) => {
    await page.goto('/not-a-page/');
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
    await expect(page.locator('meta[property="og:url"]')).toHaveCount(0);
  });

  test('security.txt uses the address in site.ts', async ({ request }) => {
    const text = await (await request.get('/.well-known/security.txt')).text();
    expect(text).toContain(`Contact: mailto:${site.email}`);
    expect(new Date(/Expires: (.+)/.exec(text)![1]).getTime()).toBeGreaterThan(Date.now());
  });

  test('retired addresses are redirected, with and without a slash', () => {
    const file = readFileSync('public/_redirects', 'utf8');
    for (const [from, to] of [
      ['/church-websites', '/churches/'],
      ['/nonprofit-websites', '/work/'],
      ['/school-websites', '/work/'],
      ['/cincinnati-event-photography', '/photography/'],
      ['/colophon/parts', '/colophon/'],
      ['/work/crestview-presbyterian', '/work/'],
      ['/pricing', '/services/'],
    ]) {
      expect(file).toContain(`${from} ${to} 301`);
      expect(file).toContain(`${from}/ ${to} 301`);
    }
  });
});
