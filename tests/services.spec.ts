import { test, expect } from '@playwright/test';

// =============================================================================
// /services: the Prices page
// =============================================================================

test.describe('Prices', () => {
  test('every tier links the form with its name', async ({ page }) => {
    await page.goto('/services/');
    for (const tier of ['launch', 'signature', 'flagship']) {
      await expect(page.locator(`#websites a[href="/contact/?tier=${tier}"]`)).toHaveCount(1);
    }
  });

  test('the on-this-page links land on a section, and open a closed one', async ({ page }) => {
    await page.goto('/services/');
    for (const a of await page.locator('.jump a').all()) {
      const id = ((await a.getAttribute('href')) ?? '').slice(1);
      await expect(page.locator(`[id="${id}"]`), id).toHaveCount(1);
    }
    await page.locator('.jump a[href="#why"]').click();
    await expect(page.locator('details#why')).toHaveJSProperty('open', true);
  });

  test('three questions deal a card, and it links the form', async ({ page }) => {
    await page.goto('/services/');
    const pick = page.locator('[data-pick]');
    await pick.scrollIntoViewIfNeeded();
    await pick.getByRole('radio', { name: 'The essential pages' }).check();
    await pick.getByRole('radio', { name: 'A few pages' }).check();
    await expect(page.locator('[data-pick-go]')).toBeHidden();
    await pick.getByRole('radio', { name: 'Connect to other services' }).check();
    await expect(page.locator('[data-pick-name]')).toHaveText('Signature');
    await expect(page.locator('[data-pick-price]')).toHaveText('$9,000');
    const go = page.locator('[data-pick-go]');
    await expect(go).toBeVisible();
    await expect(go).toHaveAttribute('href', '/contact/?tier=signature');
  });

  test('the care table reads from the plans', async ({ page }) => {
    await page.goto('/services/');
    const heads = page.locator('table.care thead th');
    await expect(heads).toHaveCount(4);
    await expect(heads.first()).toContainText('$180');
    await expect(page.locator('table.care')).toContainText('Same business day replies');
    // Software updates start at Light Care: not included in Hosting, included after.
    const row = page.locator('table.care tr', { hasText: 'Software and security updates' });
    await expect(row.locator('td.n')).toHaveCount(1);
    await expect(row.locator('td.y')).toHaveCount(3);
  });

  test('the first screen meets the tiers before the big number', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/services/');
    const glance = page.locator('.glance > li');
    await expect(glance).toHaveCount(3);
    await expect(glance.first()).toContainText('Launch');
    await expect(glance.first()).toContainText('$5,000+');
    // The lede comes first, the tiers next, and all of them inside the first screen.
    const lede = (await page.locator('.price-head .lede').boundingBox())!;
    const row = (await page.locator('.glance').boundingBox())!;
    const big = (await page.locator('.from-num').boundingBox())!;
    expect(row.y).toBeGreaterThan(lede.y);
    expect(big.y).toBeGreaterThan(row.y + row.height - 1);
    expect(row.y + row.height).toBeLessThan(900);
    await expect(page.locator('.from-num')).toHaveText('$5,000');
    await expect(glance.first().locator('a')).toHaveAttribute('href', '#launch');
    await expect(page.locator('#launch')).toHaveCount(1);
  });

  test('each tier leads with who it fits, and ends on its features', async ({ page }) => {
    await page.goto('/services/');
    for (const tier of await page.locator('.tier').all()) {
      const order = await tier.locator('.t-card').evaluate((card) => {
        const at = (sel: string) =>
          [...card.querySelectorAll('*')].indexOf(card.querySelector(sel) as Element);
        return [at('.t-fits'), at('.t-price'), at('.t-keep'), at('.t-list')];
      });
      expect(order).toEqual([...order].sort((a, b) => a - b));
      await expect(tier.locator('.t-h').first()).toHaveText('Who it fits');
      await expect(tier.locator('.t-fits').nth(1)).toContainText('take responsibility for');
    }
  });

  test('every tier has the same move-on block, and no claim about whose accounts they are', async ({
    page,
  }) => {
    await page.goto('/services/');
    const blocks = await page.locator('.t-keep').allInnerTexts();
    expect(blocks).toHaveLength(3);
    expect(new Set(blocks).size).toBe(1);
    expect(blocks[0]).toContain('I host it');
    expect(blocks[0]).toContain('code, content and documentation go with you');
    // Nathan runs the hosting and repos on purpose: see the comment on freeToMove in src/data/pricing.ts.
    expect(blocks[0]).not.toMatch(/your name|backup|your accounts|your domain/i);
    const main = await page.locator('main').innerText();
    expect(main).not.toMatch(/in your name|backup person|never locked out/i);
  });

  test('the sounds-like-you table sits above the quiz, one row per sector', async ({ page }) => {
    await page.goto('/services/');
    const rows = page.locator('.fit-table tbody tr');
    await expect(rows).toHaveCount(4);
    await expect(page.locator('.fit-table thead th')).toHaveCount(3);
    for (const href of ['/churches/', '/schools/', '/nonprofits/', '/small-business/']) {
      await expect(page.locator(`.fit-table a[href="${href}"]`)).toHaveCount(1);
    }
    const fit = (await page.locator('#fit').boundingBox())!;
    const pick = (await page.locator('#pick').boundingBox())!;
    expect(fit.y).toBeLessThan(pick.y);
  });

  test('the five-year sums are computed with year one hosting included', async ({ page }) => {
    await page.goto('/services/');
    const rows = page.locator('.cost-table tbody tr');
    await expect(rows).toHaveCount(3);
    const cells = (i: number) => rows.nth(i).locator('td').allInnerTexts();
    expect(await cells(0)).toEqual(['$5,000', '$6,656', '$8,312']);
    expect(await cells(1)).toEqual(['$9,000', '$12,576', '$16,152']);
    expect(await cells(2)).toEqual(['$18,000', '$25,176', '$32,352']);
    await expect(rows.first()).toContainText('Light Care');
    await expect(page.locator('#costs')).toContainText('year one hosting included');
  });

  test('a line says what moves a price within a tier', async ({ page }) => {
    await page.goto('/services/');
    await expect(page.locator('#moves')).toContainText('What moves a price within a tier');
  });

  test('the platform question concedes first, and never claims custom saves money', async ({
    page,
  }) => {
    await page.goto('/services/');
    const box = page.locator('#why-not');
    await expect(box.locator('h2')).toHaveText('Why not a cheaper platform?');
    await expect(box).toContainText('Choose a platform if');
    await expect(box.locator('.checks dt')).toHaveCount(5);
    const words = await box.innerText();
    expect(words).not.toMatch(/saves? (you )?money|pays for itself|cheaper in the long run/i);
    // Squarespace and Wix are named on purpose: leaving them usually means a rebuild.
    expect(words).toMatch(/leaving squarespace or wix usually means rebuilding/i);
    expect(words).not.toMatch(/wordpress\.com|nucleus|subsplash/i);
  });

  test('the status board paragraph stays as written', async ({ page }) => {
    await page.goto('/services/');
    const care = (await page.locator('#care').innerText()).replace(/\s+/g, ' ');
    expect(care).toContain(
      'Every site I look after sits on one status board. It checks every 15 minutes that the site is up, and tracks how fast it answers, whether deploys and backups ran, known security alerts in its software, and domain renewals where I manage the domain. If a site goes down, my phone tells me, so I usually know before you do.',
    );
  });

  test('the FAQPage JSON-LD equals the visible FAQ', async ({ page }) => {
    await page.goto('/services/');
    const graph = await page
      .locator('script[type="application/ld+json"]')
      .first()
      .evaluate((s) => JSON.parse(s.textContent ?? '{}'));
    const faq = (graph['@graph'] as { '@type': string; mainEntity: { name: string }[] }[]).find(
      (n) => n['@type'] === 'FAQPage',
    );
    const asked = await page.locator('.faq summary').allTextContents();
    expect(faq?.mainEntity.map((q) => q.name)).toEqual(asked.map((t) => t.trim()));
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });
    test('the tiers, care plans and FAQ are all in the markup', async ({ page }) => {
      await page.goto('/services/');
      await expect(page.locator('.tier')).toHaveCount(3);
      await expect(page.locator('.t-price').first()).toHaveText('$5,000+');
      await expect(page.locator('.faq details')).toHaveCount(8);
      await expect(page.locator('[data-sites] a.tile')).toHaveCount(4);
    });
  });
});
