import { test, expect } from '@playwright/test';

// =============================================================================
// /services: the printed receipt, a row sent to it, the cost bars at 1, 3 and 5
// years, the reply slip, the quiz card's stub and the FAQ replies
// =============================================================================
// The sums are unit tested (src/lib/cost-views.test.ts, reply-order.test.ts,
// receipt.test.ts). This checks the page: every number a moving part shows is
// the cost table's or the care table's own, each control is a real one, and
// reduced motion and no-script both get the finished state.
// =============================================================================

// The usual pairing for each tier is the row the bars draw: Launch with Light Care, Signature with
// Care, Flagship with Care+ (rows 1, 3 and 5 of the cost table).
const USUAL_ROWS = [1, 3, 5];
const VIEWS = [
  { years: '1', label: 'First year' },
  { years: '3', label: 'After 3 years' },
  { years: '5', label: 'After 5 years' },
];

test.describe('/services motion', () => {
  test('the cost bars at 1, 3 and 5 years print the cost table totals', async ({ page }) => {
    await page.goto('/services/');
    const rows = page.locator('.cost-table tbody tr');
    for (const view of VIEWS) {
      await page.locator(`input[name="bars-years"][value="${view.years}"]`).check({ force: true });
      for (const [i, row] of USUAL_ROWS.entries()) {
        const cell = (
          await rows.nth(row).locator(`td[data-label="${view.label}"]`).innerText()
        ).trim();
        const bar = page.locator('.bars > li').nth(i);
        const said = bar.locator(`p[data-v="${view.years}"]`);
        await expect(said).toBeVisible();
        await expect(said).toContainText(`Total ${cell}.`);
        await expect(bar.locator(`.bars-sum[data-v="${view.years}"]`)).toContainText(cell);
        // Only the chosen view shows: one sentence and one total a bar.
        await expect(bar.locator('p[data-v]:visible')).toHaveCount(1);
        await expect(bar.locator('.bars-sum:visible')).toHaveCount(1);
      }
    }
    // Year one: Hosting is included, said in words, and its part of the bar is gone.
    await page.locator('input[name="bars-years"][value="1"]').check({ force: true });
    await expect(page.locator('.bars > li').first().locator('p[data-v="1"]')).toContainText(
      'Hosting included in year one',
    );
    await expect(page.locator('.bar-key span:visible')).toHaveText([
      'Build, one-time',
      'Hosting, included in year one',
      'Care plan, 1 year',
    ]);
    await expect(page.locator('.bars-bar i.k-host:visible')).toHaveCount(0);
    // A bar grows with the years on one scale: the widest bar is five years of Flagship.
    const width = () =>
      page
        .locator('.bars-bar')
        .last()
        .evaluate((el) =>
          [...el.children].reduce((sum, c) => sum + c.getBoundingClientRect().width, 0),
        );
    await expect.poll(width).toBeGreaterThan(0);
    const one = await width();
    await page.locator('input[name="bars-years"][value="5"]').check({ force: true });
    await expect.poll(width, { timeout: 4000 }).toBeGreaterThan(one * 1.5);
  });

  test('a cost table row goes to the receipt, which prints that row', async ({ page }) => {
    await page.goto('/services/');
    const rows = page.locator('.cost-table tbody tr');
    // The page opens with the receipt on Signature with Care, so that row's button is the pressed one.
    await expect(page.locator('.row-send[aria-pressed="true"]')).toHaveCount(1);
    await expect(rows.nth(3).locator('.row-send')).toHaveAttribute('aria-pressed', 'true');
    for (const i of [0, 5]) {
      const row = rows.nth(i);
      const btn = row.locator('.row-send');
      await expect(btn).toHaveAccessibleName(/^Show on the receipt for .+, 5 years$/);
      await btn.click();
      await expect(page.locator('.rcpt [data-line="total"] dd')).toHaveText(
        (await row.locator('td[data-label="After 5 years"]').innerText()).trim(),
      );
      await expect(page.locator('[data-rcpt-years]')).toHaveText('5 years');
      await expect(btn).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('.row-send[aria-pressed="true"]')).toHaveCount(1);
      // Focus goes to the receipt, the slip is gone and the paper is whole again.
      await expect(page.locator('[data-rcpt-card]')).toBeFocused();
      await expect(page.locator('.row-ghost')).toHaveCount(0, { timeout: 4000 });
      await expect
        .poll(() =>
          page.locator('[data-rcpt-card]').evaluate((el) => getComputedStyle(el).clipPath),
        )
        .toBe('none');
      await expect(page.locator('[data-rcpt-card]')).toBeInViewport();
    }
    // Flagship with Care+: the form shows it, with the plans Flagship cannot take still off.
    await expect(page.locator('.rcpt input[value="Flagship"]')).toBeChecked();
    await expect(page.locator('.rcpt input[name="r-plan"][value="Care+"]')).toBeChecked();
    await expect(page.locator('.rcpt input[name="r-plan"][value="Hosting"]')).toBeDisabled();
  });

  test('the receipt waits with its heading out, then prints whole', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/services/');
    const card = page.locator('[data-rcpt-card]');
    await expect(card).toHaveClass(/rcpt-wait/);
    await card.scrollIntoViewIfNeeded();
    await expect(card).not.toHaveClass(/rcpt-wait/);
    await expect.poll(() => card.evaluate((el) => getComputedStyle(el).clipPath)).toBe('none');
    // A change reprints, and the paper is whole again afterwards.
    await page.locator('#rcpt-years').fill('2');
    await expect(page.locator('[data-rcpt-years]')).toHaveText('2 years');
    await expect.poll(() => card.evaluate((el) => getComputedStyle(el).clipPath)).toBe('none');
  });

  test('the reply rows say what the care table says, and the slip follows the plan', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/services/');
    const reply = page.locator('[data-reply]');
    await expect(reply.locator('.reply-rows b')).toHaveText([
      'Care+',
      'Care',
      'Light Care',
      'Hosting',
    ]);
    // Each row is the start of that plan's own cell in the care table's replies row.
    const cells = page
      .locator('table.care tbody tr', { hasText: 'Replies, and when something breaks' })
      .locator('td');
    const table = await cells.allInnerTexts();
    const plans = await page.locator('table.care thead .pl').allTextContents();
    for (const li of await reply.locator('.reply-rows li').all()) {
      const name = (await li.locator('b').innerText()).trim();
      const says = (await li.locator('.reply-says').innerText()).trim();
      const cell = table[plans.findIndex((p) => p.trim() === name)];
      if (name === 'Hosting') {
        expect(says).toBe(
          'No reply time is written into Hosting. If the site goes down, I investigate and fix it.',
        );
        expect(cell).not.toMatch(/business day/);
      } else expect(cell.startsWith(says), `${name}: ${says}`).toBe(true);
    }
    // Opens on Care; choosing Care+ puts the slip in the first row, and Hosting in the last.
    const slipRow = () =>
      reply
        .locator('[data-reply-note]')
        .evaluate((n) => n.closest('li')?.getAttribute('data-reply-row'));
    expect(await slipRow()).toBe('Care');
    await reply.getByRole('radio', { name: 'Care+' }).check({ force: true });
    expect(await slipRow()).toBe('Care+');
    await expect(reply.locator('[data-reply-say]')).toHaveText('Care+: Same business day replies.');
    await reply.getByRole('radio', { name: 'Hosting only' }).check({ force: true });
    expect(await slipRow()).toBe('Hosting');
    await expect(reply.locator('.reply-slot').first()).toHaveAttribute('aria-hidden', 'true');
  });

  test('the quiz card grows a stub, and the link still reaches the form with the tier', async ({
    page,
  }) => {
    await page.goto('/services/');
    const pick = page.locator('[data-pick]');
    await expect(page.locator('[data-pick-stub]')).toBeHidden();
    await pick.getByRole('radio', { name: 'The essential pages' }).check();
    await pick.getByRole('radio', { name: 'A few pages' }).check();
    await pick.getByRole('radio', { name: 'Connect to other services' }).check();
    const stub = page.locator('[data-pick-stub]');
    await expect(stub).toBeVisible();
    await expect(stub).toHaveAttribute('aria-hidden', 'true');
    await expect(stub.locator('b')).toHaveText('Signature');
    await page.locator('[data-pick-go]').click();
    await page.waitForURL('**/contact/?tier=signature');
  });

  test('an FAQ answer is a native disclosure that opens as a signed reply', async ({ page }) => {
    await page.goto('/services/');
    const first = page.locator('.faq details').first();
    await expect(first).not.toHaveAttribute('open', '');
    await first.locator('summary').click();
    await expect(first).toHaveAttribute('open', '');
    await expect(first.locator('.faq-reply .faq-from')).toHaveText('Nathan');
    await expect(first.locator('.faq-reply p').last()).toBeVisible();
    // Ruled, never boxed: no background and no border but the rule on its left.
    const box = await first.locator('.faq-reply').evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        bg: cs.backgroundColor,
        top: cs.borderTopWidth,
        right: cs.borderRightWidth,
        left: cs.borderLeftWidth,
      };
    });
    expect(box).toEqual({ bg: 'rgba(0, 0, 0, 0)', top: '0px', right: '0px', left: '2px' });
    await first.locator('summary').press('Enter');
    await expect(first).not.toHaveAttribute('open', '', { timeout: 3000 });
  });

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });
    test('nothing feeds, travels or tears: the finished state, with changed lines tinted', async ({
      page,
    }) => {
      await page.goto('/services/');
      const card = page.locator('[data-rcpt-card]');
      await expect(card).not.toHaveClass(/rcpt-wait/);
      await page.locator('.cost-table tbody tr').first().locator('.row-send').click();
      await expect(page.locator('.row-ghost')).toHaveCount(0);
      expect(await card.evaluate((el) => getComputedStyle(el).clipPath)).toBe('none');
      await expect(page.locator('.rcpt [data-line="total"] dd')).toHaveText('$4,300');
      await expect(page.locator('.rcpt-line.fresh').first()).toBeVisible();
      await expect(page.locator('.rcpt-line.fresh')).toHaveCount(0, { timeout: 3000 });
      // The bars jump to the view.
      await page.locator('input[name="bars-years"][value="1"]').check({ force: true });
      const host = page.locator('.bars-bar i.k-host').first();
      await expect(host).toBeHidden();
      // The stub is there, and the link is a plain link.
      const pick = page.locator('[data-pick]');
      await pick.getByRole('radio', { name: 'The essential pages' }).check();
      await pick.getByRole('radio', { name: 'A few pages' }).check();
      await pick.getByRole('radio', { name: 'Mostly inform people' }).check();
      await expect(page.locator('[data-pick-stub] b')).toHaveText('Launch');
      await page.locator('[data-pick-go]').click();
      await page.waitForURL('**/contact/?tier=launch');
    });
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });
    test('the controls that need a script are gone and the five-year view stays', async ({
      page,
    }) => {
      await page.goto('/services/');
      await expect(page.locator('.row-send').first()).toBeHidden();
      await expect(page.locator('.bars-pick')).toBeHidden();
      await expect(page.locator('.reply-form')).toBeHidden();
      await expect(page.locator('[data-reply-note]')).toBeHidden();
      await expect(page.locator('.reply-rows li')).toHaveCount(4);
      await expect(page.locator('.reply-rows li').first()).toBeVisible();
      await expect(page.locator('.bars-parts:visible')).toHaveCount(3);
      await expect(page.locator('.bars-alt:visible')).toHaveCount(0);
      // The FAQ is still native details, with its answers in the markup.
      await expect(page.locator('.faq details .faq-reply')).toHaveCount(8);
    });
  });
});
