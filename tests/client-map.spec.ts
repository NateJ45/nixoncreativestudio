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
  test('deals a card per state, each studied client a link to its study, with the map hidden from readers', async ({
    page,
  }) => {
    await page.goto('/about/');
    const rows = page.locator('.sc');
    await expect(rows).toHaveCount(6);
    await expect(rows.first().locator('.sc-state')).toHaveText('Ohio, home');
    const links = page.locator('.sc-names a');
    await expect(links).toHaveCount(8);
    for (const href of await links.evaluateAll((as) => as.map((a) => a.getAttribute('href'))))
      expect(href).toMatch(/^\/work\/[a-z0-9-]+\/$/);
    // Photography clients with no study are plain names, tagged, with no link.
    const plain = page.locator('.sc-names .sc-plain');
    await expect(plain).toHaveCount(3);
    await expect(plain.locator('xpath=following-sibling::span[1]')).toHaveText(
      Array(3).fill('Photography'),
    );
    await expect(page.locator('.cm-svg')).toHaveAttribute('aria-hidden', 'true');
    // A nudge under the hand for anyone whose state is still grey.
    await expect(page.locator('.cm-more a')).toHaveAttribute('href', '/contact/');
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

    // The walked state's card lifts out of the hand and turns the studio blue once the light lands.
    const walked = await map.getAttribute('data-on');
    const card = page.locator(`.sc[data-st="${walked}"]`);
    await expect(card).toHaveClass(/\bon\b/);
    await expect
      .poll(() => card.locator('.sc-face').evaluate((el) => getComputedStyle(el).backgroundColor), {
        timeout: 3000,
      })
      .toBe('rgb(47, 63, 230)');

    // Hovering a row holds the highlight there.
    const sc = page.locator('.sc[data-st="45"]');
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

  test('a name raises its client home page above the card, and Escape or leaving puts it away', async ({
    page,
  }) => {
    await page.goto('/about/');
    await page.locator('[data-cm]').scrollIntoViewIfNeeded();
    // Let the hand be dealt first, so the cards hold still under the pointer.
    await expect(page.locator('[data-cm]')).not.toHaveClass(/cm-stacked|cm-dealing/, {
      timeout: 5000,
    });
    const pk = page.locator('.pk[data-for="theology-matters"]');
    await expect(pk).toBeHidden();
    // Nothing in the stage is fetched before it is shown.
    expect(await pk.locator('img').getAttribute('src')).toBeNull();
    const link = page.locator('.sc-names a[data-slug="theology-matters"]');
    await link.hover();
    await expect(pk).toBeVisible();
    await expect(pk.locator('img')).toHaveAttribute('src', /theology-matters/);
    // It stays up after the card lifts the name out from under a still pointer.
    await page.waitForTimeout(1200);
    await expect(pk).toBeVisible();
    // And the name that slides under the still pointer does not take over.
    await expect(page.locator('.pk:not([hidden])')).toHaveCount(1);
    await expect(page.locator('.pk[data-for="first-presbyterian-orangeburg"]')).toBeHidden();
    // It sits above the card it came from and never covers the name.
    const [l, w] = await Promise.all([link.boundingBox(), pk.boundingBox()]);
    expect(w!.y + w!.height).toBeLessThanOrEqual(l!.y);
    // The pointer can move onto it and it stays.
    await page.mouse.move(w!.x + w!.width / 2, w!.y + w!.height / 2, { steps: 4 });
    await page.waitForTimeout(400);
    await expect(pk).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(pk).toBeHidden();
    // Keyboard focus shows it too; leaving puts it away.
    await page.locator('.sc-names a[data-slug="reid-design"]').focus();
    await expect(page.locator('.pk[data-for="reid-design"]')).toBeVisible();
    await page.locator('.sc-names a[data-slug="reid-design"]').blur();
    await expect(page.locator('.pk[data-for="reid-design"]')).toBeHidden();
  });

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 390, height: 844 } });
    test('each card shows its clients home pages, and there is no hover preview', async ({
      page,
    }) => {
      await page.goto('/about/');
      await expect(page.locator('.sc-mini img')).toHaveCount(8);
      await expect(page.locator('.sc-mini').first()).toBeVisible();
      await expect(page.locator('.cm-peek')).toBeHidden();
    });
  });

  test.describe('under reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });
    test('rests on the East with no Pause button and nothing running', async ({ page }) => {
      await page.goto('/about/');
      const svg = page.locator('.cm-svg');
      await page.locator('[data-cm]').scrollIntoViewIfNeeded();
      await page.waitForTimeout(1500);
      await expect(page.locator('[data-cm]')).not.toHaveClass(/cm-stacked/);
      await expect(svg).toHaveAttribute('viewBox', (await svg.getAttribute('data-crop'))!);
      await expect(page.locator('[data-cm-pause]')).toBeHidden();
      await expect(page.locator('[data-cm]')).not.toHaveAttribute('data-live', '');
      expect(await page.evaluate(running)).toBe(0);
      // Focus still moves the highlight.
      await page.locator('.sc[data-st="37"] a').first().focus();
      await expect(page.locator('[data-cm]')).toHaveAttribute('data-on', '37');
    });
  });
});
