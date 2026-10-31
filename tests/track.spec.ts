import { test, expect, type Page } from '@playwright/test';

/* GA4 events (overhaul 4.1). The real tag never runs in a test browser (the
   PORTABLE GoogleAnalytics.astro skips WebDriver and non-production hosts), so
   each test stubs window.gtag before the page loads and reads back what
   src/lib/track.ts sent. Web3Forms is intercepted, never reached. Chromium
   only (the WebKit project runs a fixed list of specs). */

const WEB3FORMS = 'https://api.web3forms.com/submit';

type Sent = [string, string, Record<string, unknown>];

async function stubGtag(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __gaEvents: unknown[]; gtag: (...a: unknown[]) => void };
    w.__gaEvents = [];
    w.gtag = (...args: unknown[]) => {
      w.__gaEvents.push(args);
    };
  });
}

async function events(page: Page): Promise<Sent[]> {
  return page.evaluate(() => (window as unknown as { __gaEvents: Sent[] }).__gaEvents);
}

test('a sent contact form fires generate_lead, with no field values', async ({ page }) => {
  await stubGtag(page);
  await page.route(`${WEB3FORMS}**`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' }),
  );
  await page.goto('/contact/');
  await page.getByLabel('Your name').fill('Test Person');
  await page.getByLabel('Email', { exact: true }).fill('test@example.com');
  await page.getByLabel('Organization type').selectOption('church');
  await page
    .getByLabel('What are you hoping to build?')
    .fill('A new site for our congregation, with sermons and events kept current.');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByRole('heading', { name: 'Thanks, your message is in.' })).toBeFocused();

  const sent = await events(page);
  const leads = sent.filter(([, name]) => name === 'generate_lead');
  expect(leads).toHaveLength(1);
  const all = JSON.stringify(sent);
  for (const value of ['Test Person', 'test@example.com', 'congregation', 'church']) {
    expect(all, `no event carries "${value}"`).not.toContain(value);
  }
});

test('a failed post fires no generate_lead', async ({ page }) => {
  await stubGtag(page);
  await page.route(`${WEB3FORMS}**`, (route) => route.fulfill({ status: 500, body: '' }));
  await page.goto('/contact/');
  await page.getByLabel('Your name').fill('Test Person');
  await page.getByLabel('Email', { exact: true }).fill('test@example.com');
  await page.getByLabel('Organization type').selectOption('church');
  await page
    .getByLabel('What are you hoping to build?')
    .fill('A new site for our congregation, with sermons and events kept current.');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.locator('[data-contact-submit]')).toBeEnabled();
  expect((await events(page)).filter(([, n]) => n === 'generate_lead')).toHaveLength(0);
});

test('the study Visit link fires visit_client_site with the host only', async ({
  page,
  context,
}) => {
  await stubGtag(page);
  // The click opens a new tab; keep it from loading the real client site.
  await context.route(/stonesteps50k\.com/, (route) => route.abort());
  await page.goto('/work/stone-steps-50k/');
  await page.locator('a[data-cta="visit_client_site"]').first().click();
  await expect
    .poll(async () => (await events(page)).find(([, n]) => n === 'visit_client_site')?.[2])
    .toEqual({ cta_location: 'title', link_domain: 'stonesteps50k.com' });
});

test('a mailto link fires contact_click without the address', async ({ page }) => {
  await stubGtag(page);
  await page.goto('/contact/');
  // Stop the mailto from leaving the page; the listener runs in the capture phase first.
  await page.evaluate(() =>
    document.addEventListener('click', (e) => e.preventDefault(), { once: true }),
  );
  await page.locator('footer a[href^="mailto:"]').first().click();
  const click = (await events(page)).find(([, n]) => n === 'contact_click');
  expect(click?.[2]).toEqual({ cta_location: 'footer', method: 'mailto' });
  expect(JSON.stringify(click)).not.toContain('@');
});

test('pricing_view fires once when the pricing block scrolls in', async ({ page }) => {
  await stubGtag(page);
  await page.goto('/');
  expect((await events(page)).filter(([, n]) => n === 'pricing_view')).toHaveLength(0);
  await page.locator('[data-track-view="pricing_view"]').scrollIntoViewIfNeeded();
  await expect
    .poll(async () => (await events(page)).filter(([, n]) => n === 'pricing_view').length)
    .toBe(1);
  await page.mouse.wheel(0, -4000);
  await page.locator('[data-track-view="pricing_view"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const views = (await events(page)).filter(([, n]) => n === 'pricing_view');
  expect(views).toHaveLength(1);
  expect(views[0][2]).toEqual({ pricing_variant: 'teaser' });
});

test('without gtag nothing breaks and nothing is queued', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/services/');
  await page.locator('[data-track-view="pricing_view"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => typeof (window as { dataLayer?: unknown }).dataLayer)).toBe(
    'undefined',
  );
});
