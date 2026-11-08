import { test, expect, type Page } from '@playwright/test';

// =============================================================================
// WCAG 2.2: the three new AA criteria a machine can actually check here
// =============================================================================
// axe (a11y.spec.ts) runs the wcag22aa tag, but its `target-size` rule only
// sees what is on screen at load, and nothing in axe checks 2.4.11 or 2.5.7.
// So this file drives the page the way a person does:
//
//   2.4.11 Focus Not Obscured: Tab (and Shift+Tab) through long pages and check
//          each focused control is at least partly visible, by hit-testing a
//          grid of points on it with elementFromPoint. The floating dock, the
//          top line pills, the sticky care-table headers and the /work filter
//          bar are the things that could cover it.
//   2.5.7  Dragging Movements: the before/after slider and the course line move
//          with one click or tap, no drag.
//   2.5.8  Target Size (Minimum): the dock, the pills, the light and dark switch,
//          the /work filter pills, the tier quiz options and every contact form
//          control (Change buttons included) are at least 24 by 24 CSS px.
// Chromium only: the WebKit project runs the axe sweep.
// =============================================================================

/** How much of the focused control is on screen and not under something else. */
async function focused(page: Page) {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return null;
    let pts = 0;
    let seen = 0;
    let cover = '';
    for (const r of [...el.getClientRects()]) {
      const x0 = Math.max(0, r.left);
      const x1 = Math.min(innerWidth, r.right);
      const y0 = Math.max(0, r.top);
      const y1 = Math.min(innerHeight, r.bottom);
      if (x1 - x0 < 1 || y1 - y0 < 1) continue;
      for (let i = 0; i < 5; i++)
        for (let j = 0; j < 5; j++) {
          pts++;
          const hit = document.elementFromPoint(
            x0 + ((x1 - x0) * (i + 0.5)) / 5,
            y0 + ((y1 - y0) * (j + 0.5)) / 5,
          );
          if (hit && (hit === el || el.contains(hit) || hit.contains(el))) seen++;
          else if (hit) cover = `${hit.tagName.toLowerCase()}.${[...hit.classList].join('.')}`;
        }
    }
    const name = (el.getAttribute('aria-label') || el.textContent || el.tagName)
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, 40);
    return { name, seen, pts, cover };
  });
}

/** Scroll down, then a little back up, the way that brings the top line back as pills. Each
    scroll gets its own frames, or the browser folds them into one scroll down and nothing shows. */
async function pillsOut(page: Page, from = 1200) {
  const frames = () =>
    page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), from);
  await frames();
  await page.evaluate((y) => scrollTo({ top: y - 100, behavior: 'instant' }), from);
  await frames();
  await expect(page.locator('[data-top]')).toHaveClass(/float/);
}

/** Where focus came to rest. The page scrolls smoothly, so a long focus scroll (Tab wrapping from
    the foot of a page back to the skip link) takes a second or two: wait for the scroll to stop,
    then for any spring still settling, before calling a control covered. */
async function settledFocus(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((done) => {
        let last = -1;
        let still = 0;
        const t0 = performance.now();
        const tick = () => {
          still = scrollY === last ? still + 1 : 0;
          last = scrollY;
          if (still >= 4 || performance.now() - t0 > 4000) done();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
  );
  let f = await focused(page);
  for (let wait = 0; f && f.seen === 0 && wait < 4; wait++) {
    await page.waitForTimeout(250);
    f = await focused(page);
  }
  return f;
}

/** Press a key until focus comes back round (or `max` presses), checking each stop. */
async function walk(page: Page, key: 'Tab' | 'Shift+Tab', max = 260) {
  const hidden: string[] = [];
  let first = '';
  let stops = 0;
  for (let i = 0; i < max; i++) {
    await page.keyboard.press(key);
    const f = await settledFocus(page);
    if (!f) continue;
    if (f.seen === 0) hidden.push(`${f.name} (under ${f.cover || 'the edge of the screen'})`);
    // Back at the first stop: the walk has gone all the way round.
    if (i > 10 && f.name === first) break;
    if (!first) first = f.name;
    stops++;
  }
  return { hidden, stops };
}

test.describe('2.4.11 Focus Not Obscured', () => {
  for (const vp of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ])
    // /churches/ carries the price cards that stack on a phone.
    for (const route of ['/services/', '/work/', '/work/stone-steps-50k/', '/churches/'])
      test(`${route} at ${vp.width}: every Tab stop is at least partly in view`, async ({
        page,
      }) => {
        test.setTimeout(120_000);
        await page.setViewportSize(vp);
        await page.goto(route);
        await page.evaluate(() => document.fonts.ready);
        const fwd = await walk(page, 'Tab');
        expect(fwd.stops, 'the walk reached the controls').toBeGreaterThan(15);
        expect(fwd.hidden, 'focused but fully covered, Tab').toEqual([]);
        // Backwards: scrolling up is what brings the top line back as pills.
        const back = await walk(page, 'Shift+Tab');
        expect(back.hidden, 'focused but fully covered, Shift+Tab').toEqual([]);
      });

  test('with the pills out, Shift+Tab up a long page is never hidden by them', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    // The same scroll that chrome.spec.ts uses to bring the pills out.
    await page.goto('/about/');
    await pillsOut(page);
    // Start from the first control below the top of the screen, then walk up the page from it.
    const started = await page.evaluate(() => {
      const next = [...document.querySelectorAll<HTMLElement>('main :is(a[href], button)')].find(
        (e) => e.getBoundingClientRect().top > 0 && e.offsetParent !== null,
      );
      next?.focus({ preventScroll: true });
      return !!next;
    });
    expect(started).toBe(true);
    const hidden: string[] = [];
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Shift+Tab');
      const f = await settledFocus(page);
      if (f && f.seen === 0)
        hidden.push(`${f.name} (under ${f.cover || 'the edge of the screen'})`);
    }
    expect(hidden).toEqual([]);
    // Still the pills at the end of it: the walk was checked against them, not a bare page top.
    expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0);
  });

  test('the "Text or email" card: every link in it is in view', async ({ page }) => {
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: width > 500 ? 900 : 720 });
      await page.goto('/services/');
      await page.locator('.top .status').focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('[data-reach]')).toBeVisible();
      for (let i = 0; i < 3; i++) {
        await page.keyboard.press('Tab');
        const f = await focused(page);
        expect(f && f.seen, `${width}: ${f?.name}`).toBeGreaterThan(0);
      }
    }
  });
});

test.describe('2.5.7 Dragging Movements: one click or tap does what a drag does', () => {
  test('the before/after slider moves to a click', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/work/stone-steps-50k/');
    const frame = page.locator('.ba-f').first();
    await frame.scrollIntoViewIfNeeded();
    // Let the arrival nudge finish so it cannot move the line after the click.
    await page.waitForTimeout(1500);
    const box = (await frame.boundingBox())!;
    await page.mouse.click(box.x + box.width * 0.2, box.y + box.height / 2);
    await expect(frame.locator('input')).toHaveValue('20');
    await expect(frame).toHaveAttribute('style', /--v:\s*20\b/);
    await expect(frame.locator('input')).toHaveAttribute('aria-valuetext', /20 percent/);
    await page.mouse.click(box.x + box.width * 0.75, box.y + box.height / 2);
    await expect(frame.locator('input')).toHaveValue('75');
    // The hint says so, in words.
    await expect(page.locator('.ba-hint .ba-js').first()).toContainText('tap anywhere');
  });

  test('on a touch screen, a tap moves the slider and the course line', async ({ browser }) => {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    const page = await ctx.newPage();
    await page.goto('/work/stone-steps-50k/');
    const frame = page.locator('.ba-f').first();
    await frame.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
    let box = (await frame.boundingBox())!;
    await page.touchscreen.tap(box.x + box.width * 0.3, box.y + box.height / 2);
    await expect(frame.locator('input')).toHaveValue('30');

    const course = page.locator('[data-course] .course-p');
    await course.scrollIntoViewIfNeeded();
    box = (await course.boundingBox())!;
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    const v = Number(await page.locator('[data-range]').inputValue());
    const max = Number(await page.locator('[data-range]').getAttribute('max'));
    expect(Math.abs(v - max / 2)).toBeLessThan(1);
    await ctx.close();
  });
});

/** Every visible target under `scope` whose box is under 24 by 24, with its size. */
async function small(page: Page, selector: string) {
  return page.evaluate((sel) => {
    return [...document.querySelectorAll<HTMLElement>(sel)]
      .filter((e) => {
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden';
      })
      .map((e) => {
        // A radio counts by its label, which is what you press.
        const box = e as HTMLInputElement;
        const t = /^(radio|checkbox)$/.test(box.type) ? (box.labels?.[0] ?? e) : e;
        const r = t.getBoundingClientRect();
        return {
          name: (e.getAttribute('aria-label') || t.textContent || e.tagName).trim().slice(0, 40),
          w: Math.round(r.width),
          h: Math.round(r.height),
        };
      })
      .filter((s) => s.w < 24 || s.h < 24);
  }, selector);
}

test.describe('2.5.8 Target Size (Minimum): 24 by 24 CSS px', () => {
  for (const width of [1440, 390, 320])
    test(`the dock, the pills and the switches at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: width > 500 ? 900 : 720 });
      await page.goto('/work/');
      expect(await small(page, 'nav.dock a, nav.dock button, .top a, .top button')).toEqual([]);
      // The /work filter and view pills.
      expect(await small(page, '[data-filters] button, [data-views] button')).toEqual([]);
      // The light and dark switch, both copies.
      expect(await small(page, '[data-theme-flip]')).toEqual([]);
      // The pills, once they float. On /work a wide screen keeps them in while the filter bar is
      // stuck, so they are brought out on /about/.
      await page.goto('/about/');
      await pillsOut(page);
      expect(await small(page, '.top a, .top button')).toEqual([]);
    });

  // axe misreads the turned cards (a11y.spec.ts explains), so this measures what a finger meets:
  // for every card in the dealt hand, the biggest square of the screen where a tap lands on it.
  for (const vp of [
    { width: 320, height: 720 },
    { width: 390, height: 844 },
  ])
    test(`every card in the home hand keeps a 24px square uncovered at ${vp.width}`, async ({
      browser,
    }) => {
      const ctx = await browser.newContext({ viewport: vp, hasTouch: true, isMobile: true });
      const page = await ctx.newPage();
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);
      // Let the deal land: the cards spring in over about a second.
      await page.waitForTimeout(2500);
      const squares = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('[data-grid] .tile')].map((t) => {
          const b = t.getBoundingClientRect();
          const x0 = Math.max(0, Math.floor(b.left));
          const x1 = Math.min(innerWidth, Math.ceil(b.right));
          const y0 = Math.max(0, Math.floor(b.top));
          const y1 = Math.min(innerHeight, Math.ceil(b.bottom));
          // Largest all-hit square, by the classic running-minimum table, one CSS px per cell.
          let prev = new Int32Array(x1 - x0 + 1);
          let best = 0;
          for (let y = y0; y < y1; y++) {
            const cur = new Int32Array(x1 - x0 + 1);
            for (let x = x0; x < x1; x++) {
              const hit = document.elementFromPoint(x + 0.5, y + 0.5);
              if (hit && (hit === t || t.contains(hit))) {
                const i = x - x0 + 1;
                cur[i] = 1 + Math.min(prev[i], cur[i - 1], prev[i - 1]);
                best = Math.max(best, cur[i]);
              }
            }
            prev = cur;
          }
          return { slug: t.dataset.slug, best };
        }),
      );
      expect(squares).toHaveLength(8);
      for (const s of squares) expect(s.best, s.slug).toBeGreaterThanOrEqual(24);
      await ctx.close();
    });

  test('the tier quiz options on /services', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/services/');
    expect(await small(page, '[data-pick] input, [data-pick] button')).toEqual([]);
  });

  test('every contact form control, including the Change buttons', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/contact/');
    const controls =
      'form[data-contact-form] :is(input:not([type=hidden]):not(#botcheck), select, textarea, button)';
    const seen: { name: string; w: number; h: number }[] = [];
    seen.push(...(await small(page, controls)));
    // Step through: each question's controls are measured while it is the one showing.
    await page.getByLabel("What's your name?").fill('Test Person');
    await page.getByRole('button', { name: 'Next' }).click();
    seen.push(...(await small(page, controls)));
    await page.getByLabel("What's your email?").fill('test@example.com');
    await page.getByRole('button', { name: 'Next' }).click();
    seen.push(...(await small(page, controls)));
    await page.getByRole('radio', { name: 'Church' }).check();
    await page.getByRole('button', { name: 'Next' }).click();
    await page
      .getByLabel('What are you hoping to build?')
      .fill('A new website for the congregation, with room for the weekly news.');
    await page.getByRole('button', { name: 'Next' }).click();
    seen.push(...(await small(page, controls)));
    await page.getByRole('button', { name: /Next|Skip/ }).click();
    seen.push(...(await small(page, controls)));
    await page.getByRole('button', { name: /Next|Skip/ }).click();
    seen.push(...(await small(page, controls)));
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(
      page.getByRole('heading', { name: 'Check your answers before sending' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /^Change/ }).first()).toBeVisible();
    seen.push(...(await small(page, controls)));
    expect(seen).toEqual([]);
  });
});
