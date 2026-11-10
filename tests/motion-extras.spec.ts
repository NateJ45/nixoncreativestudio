import { test, expect } from '@playwright/test';

// =============================================================================
// Four small motion pieces (2026-11)
// =============================================================================
// 1. Home ledger: a "Websites for:" word deals its sector's client windows.
// 2. Quote band: a quote's `highlight` phrase is marked, word for word.
// 3. Case study: the dock rail carries a tick a chapter and names the chapter.
// 4. 404: the numerals are a drawing with its points showing.
//
// Each is decoration on top of something real (a link, a quote, a heading), so
// these tests check two things every time: the real thing is untouched, and
// the decoration stays out of the way where it should (touch widths, keyboard
// focus, reduced motion).
// =============================================================================

test.describe('home: a sector deals its own windows', () => {
  test('focusing a sector link shows that sector, and only real clients', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    const box = page.locator('.lf', { has: page.locator('a[href="/churches/"]') });
    // Nothing is fetched until someone reaches for it.
    await expect(box.locator('.lf-card img')).toHaveCount(0);
    await page.locator('.ledger-for a[href="/schools/"]').focus();
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('.ledger-for a[href="/churches/"]')).toBeFocused();
    await expect(box).toHaveClass(/\bon\b/);
    // Two church studies on file: First Baptist Muncie and First Presbyterian Orangeburg.
    const srcs = await box
      .locator('.lf-card img')
      .evaluateAll((imgs) => imgs.map((i) => i.getAttribute('src')));
    expect(srcs).toEqual([
      '/assets/first-baptist-muncie-m-320.webp',
      '/assets/first-presbyterian-orangeburg-m-320.webp',
    ]);
    await expect(box.locator('.lf-stack')).toHaveAttribute('aria-hidden', 'true');
    await expect(box.locator('.lf-stack')).toBeVisible();
    // Escape puts it away without moving focus, and the link is still the link.
    await page.keyboard.press('Escape');
    await expect(box).not.toHaveClass(/\bon\b/);
    await expect(page.locator('.ledger-for a[href="/churches/"]')).toBeFocused();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
    ).toBeLessThanOrEqual(0);
  });

  test('at 320px the word is a plain link and nothing is dealt', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto('/');
    await page.locator('.ledger-for a[href="/schools/"]').focus();
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('.lf.on')).toHaveCount(0);
    await expect(page.locator('.lf-stack').first()).toBeHidden();
    await expect(page.locator('.lf-card img')).toHaveCount(0);
  });
});

test.describe('quote band: the key phrase', () => {
  test('every marked phrase is in its quote, and the words are unchanged', async ({ page }) => {
    await page.goto('/');
    const quotes = await page
      .locator('.home-band blockquote')
      .evaluateAll((qs) =>
        qs.map((q) => ({ text: q.textContent ?? '', mark: q.querySelector('.hl')?.textContent })),
      );
    expect(quotes.length).toBeGreaterThan(1);
    for (const q of quotes) {
      expect(q.mark, 'every quote on file names a phrase today').toBeTruthy();
      expect(q.text).toContain(q.mark as string);
      // The mark adds no white space of its own around the words.
      expect(q.text).not.toMatch(/\s{2,}/);
    }
    expect(quotes[0].text.startsWith('Nathan Nixon transformed our website')).toBe(true);
  });

  test('the marker draws once the band is on screen', async ({ page }) => {
    await page.goto('/');
    const band = page.locator('.home-band');
    await expect(band).toHaveClass(/hl-wait/);
    await expect(band).not.toHaveClass(/hl-on/);
    await band.scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 400);
    await expect(band).toHaveClass(/hl-on/);
    // Drawn: the marker has reached the end of the phrase.
    await expect
      .poll(() =>
        band
          .locator('.band-s:not([inert]) .hl')
          .evaluate((el) => getComputedStyle(el).getPropertyValue('--hl').trim()),
      )
      .toBe('100%');
  });
});

test.describe('case study: the dock knows the chapter', () => {
  const study = '/work/stone-steps-50k/';

  test('one tick a chapter, and the name shows as you scroll into it', async ({ page }) => {
    await page.goto(study);
    const chapters = await page.locator('.chap[id]').count();
    expect(chapters).toBeGreaterThan(1);
    await expect(page.locator('.dk-rail circle')).toHaveCount(chapters);
    await expect(page.locator('.dk-spy')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('.dk-spy')).toBeHidden();
    // Scroll by wheel, the way a reader would, to just past the second chapter's heading.
    await page.mouse.move(200, 200);
    await page.mouse.wheel(0, 40);
    const name = (await page.locator('.chap[id] h2').nth(1).textContent())?.trim();
    await page.evaluate(() => {
      const c = document.querySelectorAll('.chap[id]')[1];
      scrollTo(0, c.getBoundingClientRect().top + scrollY - innerHeight * 0.3);
    });
    await expect(page.locator('.dk-spy')).toHaveClass(/\bon\b/);
    await expect(page.locator('[data-spy-n]')).toHaveText('02');
    await expect(page.locator('[data-spy-t]')).toHaveText(name as string);
    await expect(page.locator('.dk-rail circle.past')).toHaveCount(2);
    await expect(page.locator('.dk-rail circle.now')).toHaveCount(1);
    // It is a moment, not a fixture.
    await expect(page.locator('.dk-spy')).not.toHaveClass(/\bon\b/, { timeout: 4000 });
  });

  test('the name stays away while the keyboard is on something in the page', async ({ page }) => {
    await page.goto(study);
    const link = page.locator('.s-facts a').first();
    await link.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await page.evaluate(() => {
      const c = document.querySelectorAll('.chap[id]')[1];
      scrollTo(0, c.getBoundingClientRect().top + scrollY - innerHeight * 0.3);
    });
    await expect(page.locator('.dk-rail circle.now')).toHaveCount(1);
    await expect(page.locator('.dk-spy')).not.toHaveClass(/\bon\b/);
  });

  test('at 320px the dock and its name fit the screen', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto(study);
    await page.mouse.move(100, 200);
    await page.mouse.wheel(0, 40);
    await page.evaluate(() => {
      const c = document.querySelectorAll('.chap[id]')[1];
      scrollTo(0, c.getBoundingClientRect().top + scrollY - innerHeight * 0.3);
    });
    await expect(page.locator('.dk-spy')).toHaveClass(/\bon\b/);
    const box = await page.locator('.dk-spy').boundingBox();
    expect(box && box.x >= 0 && box.x + box.width <= 320).toBe(true);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
    ).toBeLessThanOrEqual(0);
  });

  test('a page with no chapters gets no ticks', async ({ page }) => {
    await page.goto('/about/');
    await expect(page.locator('.dk-rail circle')).toHaveCount(0);
  });
});

test.describe('404: the drawing', () => {
  test('it is on the page in full, hidden from assistive tech', async ({ page }) => {
    await page.goto('/nope/');
    const art = page.locator('[data-nf]');
    await expect(art).toHaveAttribute('aria-hidden', 'true');
    await expect(art.locator('path')).toHaveCount(5);
    await expect(art).toBeVisible();
    expect(await art.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
  });

  test.describe('with reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });
    test('the points hold still, even when pressed', async ({ page }) => {
      await page.goto('/nope/');
      const outline = page.locator('[data-nf] .nf-o');
      const before = await outline.getAttribute('d');
      await page.locator('[data-nf]').click();
      await page.waitForTimeout(300);
      expect(await outline.getAttribute('d')).toBe(before);
    });
  });

  test('a press shakes the points and they come home', async ({ page }) => {
    await page.goto('/nope/');
    const outline = page.locator('[data-nf] .nf-o');
    // The arrival shake settles back to the drawing the page was built with.
    const rest = await page.evaluate(async () => {
      const html = await (await fetch(location.href)).text();
      return new DOMParser()
        .parseFromString(html, 'text/html')
        .querySelector('.nf-o')!
        .getAttribute('d');
    });
    await expect(outline).toHaveAttribute('d', rest as string, { timeout: 6000 });
    await page.locator('[data-nf]').click();
    await expect(outline).not.toHaveAttribute('d', rest as string);
    // The mouse is still on the drawing, and the points lean away from it: take it off.
    await page.mouse.move(4, 4);
    await expect(outline).toHaveAttribute('d', rest as string, { timeout: 6000 });
  });
});
