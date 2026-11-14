import { test, expect } from '@playwright/test';

// About's map (src/components/ClientMap.astro, src/scripts/client-map.js). The list is the content
// and the map follows it; the map moves only on screen, stops on Pause (WCAG 2.2.2), and stands
// down under reduced motion.

const running = () =>
  document.getAnimations().filter((a) => {
    const t = (a.effect as KeyframeEffect | null)?.target as Element | null;
    return a.playState === 'running' && !!t?.closest('[data-cm]');
  }).length;

test.describe('About: the client map', () => {
  test('lists every client by state, each a link to its study, with the map hidden from readers', async ({
    page,
  }) => {
    await page.goto('/about/');
    const rows = page.locator('.cm-row');
    await expect(rows).toHaveCount(4);
    await expect(rows.first().locator('.cm-state')).toHaveText('Ohio, home');
    const links = page.locator('.cm-names a');
    await expect(links).toHaveCount(8);
    for (const href of await links.evaluateAll((as) => as.map((a) => a.getAttribute('href'))))
      expect(href).toMatch(/^\/work\/[a-z0-9-]+\/$/);
    await expect(page.locator('.cm-svg')).toHaveAttribute('aria-hidden', 'true');
  });

  test('glides in, walks the states, holds on hover, and Pause stops everything', async ({
    page,
  }) => {
    await page.goto('/about/');
    const map = page.locator('[data-cm]');
    const svg = page.locator('.cm-svg');
    const crop = await svg.getAttribute('data-crop');
    await expect(svg).toHaveAttribute('viewBox', (await svg.getAttribute('data-full'))!);
    await map.scrollIntoViewIfNeeded();
    await expect(map).toHaveAttribute('data-live', '');
    await expect
      .poll(async () => (await svg.getAttribute('viewBox'))!.split(' ').map(Number), {
        timeout: 5000,
      })
      .toEqual(crop!.split(' ').map(Number));
    const first = await map.getAttribute('data-on');
    await expect.poll(() => map.getAttribute('data-on'), { timeout: 6000 }).not.toBe(first);
    expect(await page.evaluate(running)).toBeGreaterThan(0);

    // Hovering a row holds the highlight there.
    const sc = page.locator('.cm-row[data-st="45"]');
    await sc.hover();
    await expect(map).toHaveAttribute('data-on', '45');
    await expect(sc).toHaveClass(/\bon\b/);
    await page.waitForTimeout(4000);
    await expect(map).toHaveAttribute('data-on', '45');
    await page.mouse.move(0, 0);

    // Pause: nothing in the map moves and the walk stops.
    const pause = page.getByRole('button', { name: 'Pause the map' });
    await pause.click();
    await expect(page.getByRole('button', { name: 'Play the map' })).toBeVisible();
    await expect(map).not.toHaveAttribute('data-live', '');
    await page.waitForTimeout(300);
    expect(await page.evaluate(running)).toBe(0);
    const held = await map.getAttribute('data-on');
    await page.waitForTimeout(6500);
    await expect(map).toHaveAttribute('data-on', held!);
    await page.getByRole('button', { name: 'Play the map' }).click();
    await expect(map).toHaveAttribute('data-live', '');
  });

  test.describe('under reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });
    test('rests on the East with no Pause button and nothing running', async ({ page }) => {
      await page.goto('/about/');
      const svg = page.locator('.cm-svg');
      await page.locator('[data-cm]').scrollIntoViewIfNeeded();
      await page.waitForTimeout(1500);
      await expect(svg).toHaveAttribute('viewBox', (await svg.getAttribute('data-crop'))!);
      await expect(page.locator('[data-cm-pause]')).toBeHidden();
      await expect(page.locator('[data-cm]')).not.toHaveAttribute('data-live', '');
      expect(await page.evaluate(running)).toBe(0);
      // Focus still moves the highlight.
      await page.locator('.cm-row[data-st="37"] a').first().focus();
      await expect(page.locator('[data-cm]')).toHaveAttribute('data-on', '37');
    });
  });
});
