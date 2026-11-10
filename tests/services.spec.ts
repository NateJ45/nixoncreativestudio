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

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('secondary sections fold, prices stay open, and a button opens one', async ({ page }) => {
      await page.goto('/services/');
      // The tiers, add-ons and care plans are open.
      await expect(page.locator('#websites .t-price').first()).toBeVisible();
      await expect(page.locator('#add-ons .addon').first()).toBeVisible();
      await expect(page.locator('#care')).not.toHaveClass(/shut/);
      // The rest are a list of headings.
      const toggle = page.getByRole('button', { name: 'What it costs over five years' });
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await expect(page.locator('#costs table')).toBeHidden();
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await expect(page.locator('#costs table')).toBeVisible();
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      // Raised from 14000 in the clarity pass (Nov 2026): the open costs fold now carries the cost
      // bars, and the always-open care cards spell out edit time, rate and replies in words.
      // Raised again to 17500 in the motion pack (Nov 2026): the costs fold now ends on the live
      // receipt, and the care section carries the weeks strip, one row per client.
      // Raised to 18500 (Nov 2026): each cost row has a "Show on the receipt" button, the cost
      // bars have their 1, 3 and 5 year radios, and the care section ends on the reply rows.
      expect(height).toBeLessThan(18500);
    });

    test('a jump link and an address open the fold they point into', async ({ page }) => {
      await page.goto('/services/');
      await page.locator('.jump a[href="#costs"]').click();
      await expect(page.locator('#costs table')).toBeVisible();
      await page.goto('/services/#why-not');
      await expect(page.locator('#why-not')).not.toHaveClass(/shut/);
    });

    test('each home price card lands on its own tier, not the top of the list', async ({
      page,
    }) => {
      await page.goto('/');
      for (const tier of ['launch', 'signature', 'flagship']) {
        await expect(page.locator(`[data-prices] a[href="/services/#${tier}"]`)).toHaveCount(1);
      }
      await page.locator('[data-prices] a[href="/services/#flagship"]').click();
      await expect(page).toHaveURL(/\/services\/#flagship$/);
      const top = () =>
        page.locator('#flagship').evaluate((el) => Math.round(el.getBoundingClientRect().top));
      await expect.poll(top).toBeGreaterThanOrEqual(0);
      await expect.poll(top).toBeLessThan(120);
    });

    test('the picker works once its fold is open', async ({ page }) => {
      await page.goto('/services/');
      await page.getByRole('button', { name: /Three questions/ }).click();
      const pick = page.locator('[data-pick]');
      await pick.getByRole('radio', { name: 'The essential pages' }).check();
      await pick.getByRole('radio', { name: 'A few pages' }).check();
      await expect(pick).toBeVisible();
    });

    test('with JavaScript off nothing is folded', async ({ browser }) => {
      const context = await browser.newContext({
        javaScriptEnabled: false,
        viewport: { width: 390, height: 844 },
      });
      const page = await context.newPage();
      await page.goto('/services/');
      await expect(page.locator('#costs table')).toBeVisible();
      await expect(page.locator('.mfold-btn')).toHaveCount(0);
      await context.close();
    });
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
    await expect(page.locator('[data-pick-price]')).toHaveText('$6,500');
    const go = page.locator('[data-pick-go]');
    await expect(go).toBeVisible();
    await expect(go).toHaveAttribute('href', '/contact/?tier=signature');
    await expect(page.locator('[data-pick-why]')).toHaveText(
      'Why: you said it connects to other services.',
    );
  });

  test('the quiz only suggests Flagship when custom tools are asked for', async ({ page }) => {
    await page.goto('/services/');
    const pick = page.locator('[data-pick]');
    const answer = async (size: string, who: string, tools: string) => {
      for (const [n, v] of [
        ['size', size],
        ['who', who],
        ['tools', tools],
      ]) {
        await pick.locator(`input[name="${n}"][value="${v}"]`).check({ force: true });
      }
    };
    // A large site that mostly informs people tops out at Signature, and says why.
    await answer('2', '2', '0');
    await expect(page.locator('[data-pick-name]')).toHaveText('Signature');
    await expect(page.locator('[data-pick-why]')).toContainText('Flagship is for custom tools');
    await answer('0', '0', '2');
    await expect(page.locator('[data-pick-name]')).toHaveText('Flagship');
    await expect(page.locator('[data-pick-why]')).toHaveText(
      'Why: you said it needs custom tools.',
    );
    await answer('0', '0', '0');
    await expect(page.locator('[data-pick-name]')).toHaveText('Launch');
  });

  test('the care table reads from the plans', async ({ page }) => {
    await page.goto('/services/');
    const heads = page.locator('table.care thead th');
    await expect(heads).toHaveCount(4);
    await expect(heads.first()).toContainText('$200');
    await expect(page.locator('table.care')).toContainText('Same business day replies');
    // Security is never gated: security updates are in every plan, from Hosting up.
    const security = page.locator('table.care tr', { hasText: 'Security updates' });
    await expect(security.locator('td.n')).toHaveCount(0);
    await expect(security.locator('td.y')).toHaveCount(4);
    // Routine software updates are care work: Light Care and up.
    const software = page.locator('table.care tr', { hasText: 'Software updates' });
    await expect(software.locator('td.n')).toHaveCount(1);
    await expect(software.locator('td.y')).toHaveCount(3);
    // Every cell says it in words: no bare tick or dash.
    for (const cell of await page.locator('table.care td.y, table.care td.n').all()) {
      await expect(cell).toHaveText(/^(Included|Not included)$/);
    }
    // One row for the hourly rate, with no tick next to a rate.
    const rate = page.locator('table.care tr', { hasText: 'Rate for extra changes' });
    expect(await rate.locator('td').allInnerTexts()).toEqual([
      '$100 an hour',
      '$85 an hour',
      '$85 an hour',
      '$85 an hour',
    ]);
    await expect(rate.locator('td.y, td.n')).toHaveCount(0);
    const edits = page.locator('table.care tr', { hasText: 'Changes I make for you each month' });
    expect(await edits.locator('td').allInnerTexts()).toEqual([
      'None',
      '30 minutes',
      '1 hour',
      '3 hours',
    ]);
    // Hosting answers in words when something breaks; the care plans keep "at no extra charge".
    const replies = page.locator('table.care tr', {
      hasText: 'Replies, and when something breaks',
    });
    const said = await replies.locator('td').allInnerTexts();
    expect(said[0]).toContain('If the site goes down, I investigate and fix it.');
    for (const s of said.slice(1)) {
      expect(s).toContain('Fixes when something breaks, at no extra charge');
    }
    await expect(page.locator('table.care caption')).toBeVisible();
  });

  test('every table has a visible caption', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/services/');
    for (const t of ['.fit-table', '.cost-table', 'table.care']) {
      await expect(page.locator(`${t} caption`), t).toBeVisible();
    }
  });

  test('the price cards show every list, with no toggle and no corner letters', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/services/');
    await expect(page.locator('#websites button')).toHaveCount(0);
    await expect(page.locator('#websites .pip, #add-ons .pip, #behind .pip')).toHaveCount(0);
    await page.locator('#signature').hover();
    for (const item of await page.locator('.t-list li').all()) await expect(item).toBeVisible();
    await expect(page.locator('#flagship .t-range')).toContainText(
      'Custom tools need Care or Care+',
    );
  });

  test('the cost bars print their numbers in words', async ({ page }) => {
    await page.goto('/services/');
    const parts = await page.locator('.bars-parts').allInnerTexts();
    // Hand-worked: Hosting is $200 for years two to five; care is 12 months x 5 years.
    expect(parts).toEqual([
      'Build $3,500, Hosting $800, Light Care $3,540. Total $7,840.',
      'Build $6,500, Hosting $800, Care $7,740. Total $15,040.',
      'Build $12,500, Hosting $800, Care+ $15,540. Total $28,840.',
    ]);
    await expect(page.locator('.bars-bar').first()).toHaveAttribute('aria-hidden', 'true');
  });

  test('the FAQ agrees with the care table on carry-over and rates', async ({ page }) => {
    await page.goto('/services/');
    const faq = (await page.locator('.faq').textContent()) ?? '';
    expect(faq).toContain(
      'Light Care minutes carry over for three months; Care and Care+ hours do not.',
    );
    expect(faq).not.toMatch(/unused hours do not roll over/i);
    expect(faq).toContain('$100 an hour');
    expect(faq).toContain('$85 an hour');
    expect(faq).toContain('$150 an hour');
  });

  test('the first screen meets the tiers before the big number', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/services/');
    const glance = page.locator('.glance > li');
    await expect(glance).toHaveCount(3);
    await expect(glance.first()).toContainText('Launch');
    await expect(glance.first()).toContainText('$3,500+');
    // The lede comes first, the tiers next, and all of them inside the first screen.
    const lede = (await page.locator('.price-head .lede').boundingBox())!;
    const row = (await page.locator('.glance').boundingBox())!;
    const big = (await page.locator('.from-num').boundingBox())!;
    expect(row.y).toBeGreaterThan(lede.y);
    expect(big.y).toBeGreaterThan(row.y + row.height - 1);
    expect(row.y + row.height).toBeLessThan(900);
    await expect(page.locator('.from-num')).toHaveText('$3,500');
    // The ongoing cost is on the first screen too.
    const after = page.locator('.after-one');
    await expect(after).toContainText(
      'After year one: Hosting $200 a year. Optional care from $59 a month.',
    );
    const afterBox = (await after.boundingBox())!;
    expect(afterBox.y + afterBox.height).toBeLessThan(900);
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
    // Launch and Signature: Hosting only ($200 a year from year two), then care on top from month
    // one. Flagship has no Hosting-only row: custom tools need Care or Care+.
    await expect(rows).toHaveCount(6);
    const cells = (i: number) => rows.nth(i).locator('td').allInnerTexts();
    expect(await cells(0)).toEqual(['$3,500', '$3,900', '$4,300']);
    expect(await cells(1)).toEqual(['$4,208', '$6,024', '$7,840']);
    expect(await cells(2)).toEqual(['$6,500', '$6,900', '$7,300']);
    expect(await cells(3)).toEqual(['$8,048', '$11,544', '$15,040']);
    // Flagship plus Care, by hand: 12,500 + 1,548 a year + $200 Hosting from year two.
    expect(await cells(4)).toEqual(['$14,048', '$17,544', '$21,040']);
    expect(await cells(5)).toEqual(['$15,608', '$22,224', '$28,840']);
    await expect(rows.first()).toContainText('Hosting only, $200 per year');
    await expect(rows.nth(1)).toContainText('Light Care, $59 per month');
    await expect(rows.nth(1)).toContainText('on top of Hosting');
    const flagship = page.locator('.cost-table tbody').nth(2);
    await expect(flagship).not.toContainText('Hosting only');
    await expect(flagship).toContainText('Custom tools need Care or Care+');
    const heads = await page.locator('.cost-table thead th').allTextContents();
    expect(heads.slice(1)).toEqual([
      'First year, build and hosting',
      'Total after 3 years',
      'Total after 5 years',
    ]);
    await expect(page.locator('#costs')).toContainText('Year one hosting is included');
    await expect(page.locator('#costs')).toContainText('Prices as of November 2026');
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
      'Every site I look after sits on one status board. It checks every 15 minutes that the site is up, and tracks how fast it answers, whether updates and backups ran, known security alerts in its software, and domain renewals where I manage the domain. If a site goes down, my phone tells me, so I usually know before you do.',
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
      await expect(page.locator('.t-price').first()).toHaveText('$3,500+');
      await expect(page.locator('.faq details')).toHaveCount(8);
      await expect(page.locator('[data-sites] a.tile')).toHaveCount(4);
    });
  });
});
