import { test, expect } from '@playwright/test';

// =============================================================================
// /contact (overhaul package 2.7)
// =============================================================================
// Site-owned. The inquiry form is the studio's lead pipeline, so this pins:
//   - it posts natively to Web3Forms with JavaScript off (right action,
//     method, required fields, browser validation left on);
//   - the URL prefill (?org_type ?tier ?service ?from) fills the select, the
//     budget chip and the hidden origin fields;
//   - the brief card is a plain summary, not a live region (ruling 17);
//   - the success panel takes focus and links two studies from the sector;
//   - the clock line, and that the page makes no third-party map request.
// Nothing here ever reaches Web3Forms: every request to it is intercepted.
// =============================================================================

const WEB3FORMS = 'https://api.web3forms.com/submit';

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the form posts natively to Web3Forms with the required fields', async ({ page }) => {
    let posted: { method: string; body: string } | null = null;
    await page.route(`${WEB3FORMS}**`, async (route) => {
      posted = { method: route.request().method(), body: route.request().postData() ?? '' };
      await route.fulfill({ status: 200, contentType: 'text/html', body: '<p>ok</p>' });
    });

    await page.goto('/contact/');
    const form = page.locator('form[data-contact-form]');
    await expect(form).toHaveAttribute('action', WEB3FORMS);
    await expect(form).toHaveAttribute('method', 'post');
    // Browser validation stays on without the script.
    expect(await form.getAttribute('novalidate')).toBeNull();

    for (const name of ['name', 'email', 'org_type', 'message']) {
      await expect(form.locator(`[name="${name}"]`)).toHaveAttribute('required', '');
    }
    // Budget and the optional details are optional.
    for (const name of ['phone', 'current_website', 'timeline', 'heard_from', 'organization']) {
      expect(await form.locator(`[name="${name}"]`).getAttribute('required')).toBeNull();
    }
    expect(await form.locator('[name="budget"]').first().getAttribute('required')).toBeNull();
    // The optional details start closed.
    await expect(form.locator('details[data-optional-details]')).not.toHaveAttribute('open', '');
    // The no-JS success path.
    await expect(form.locator('input[name="redirect"]')).toHaveAttribute(
      'value',
      /\/contact\/\?sent=1#sent$/,
    );
    // The clock renders its static line.
    await expect(page.locator('[data-contact-clock]')).toHaveText('Cincinnati (Eastern time)');

    // An empty submit is stopped by the browser.
    await page.getByRole('button', { name: 'Send' }).click();
    expect(posted).toBeNull();

    // A filled one goes straight to Web3Forms (intercepted above).
    await page.getByLabel('Your name').fill('Test Person');
    await page.getByLabel('Email', { exact: true }).fill('test@example.com');
    await page.getByLabel('Organization type').selectOption('church');
    await page
      .getByLabel('What are you hoping to build?')
      .fill('A new site for our congregation, with sermons and events kept current.');
    await Promise.all([
      page.waitForURL(`${WEB3FORMS}**`),
      page.getByRole('button', { name: 'Send' }).click(),
    ]);
    expect(posted).not.toBeNull();
    expect(posted!.method).toBe('POST');
    for (const field of ['name=Test', 'org_type=church', 'access_key=', 'botcheck=']) {
      expect(posted!.body).toContain(field);
    }
  });

  test('the #sent redirect target shows the success panel', async ({ page }) => {
    await page.goto('/contact/?sent=1#sent');
    await expect(page.getByRole('heading', { name: 'Thanks, your message is in.' })).toBeVisible();
    await expect(page.locator('form[data-contact-form]')).toBeHidden();
    await expect(page.locator('[data-success-studies="any"] a')).toHaveCount(2);
  });
});

test.describe('with JavaScript', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem('ncs-contact-draft'));
  });

  test('prefill fills the select, the budget chip and the origin fields', async ({ page }) => {
    await page.goto(
      '/contact/?from=first-presbyterian-orangeburg&org_type=church&tier=signature&service=photography',
    );
    const form = page.locator('form[data-contact-form]');
    await expect(form.locator('select[name="org_type"]')).toHaveValue('church');
    await expect(form.locator('input[name="budget"]:checked')).toHaveValue('7k-12k');
    await expect(form.locator('input[name="from"]')).toHaveValue('first-presbyterian-orangeburg');
    await expect(form.locator('input[name="tier"]')).toHaveValue('signature');
    await expect(form.locator('input[name="service"]')).toHaveValue('photography');
    await expect(form.locator('input[name="origin_org_type"]')).toHaveValue('church');
  });

  test('values that are not slugs are ignored', async ({ page }) => {
    await page.goto('/contact/?from=%3Cscript%3E&tier=nope&org_type=castle');
    const form = page.locator('form[data-contact-form]');
    await expect(form.locator('input[name="from"]')).toHaveValue('');
    await expect(form.locator('select[name="org_type"]')).toHaveValue('');
    await expect(form.locator('input[name="budget"]:checked')).toHaveCount(0);
  });

  test('the brief card assembles from the fields and is not a live region', async ({ page }) => {
    await page.goto('/contact/?from=stone-steps-50k');
    const brief = page.locator('[data-brief]');
    await expect(brief).toBeVisible();
    await expect(brief).not.toHaveAttribute('aria-hidden', /.*/);
    await expect(brief.locator('[data-brief-list]')).toHaveAttribute('aria-live', 'off');
    await page.getByLabel('Your name').fill('Sam');
    await page.getByLabel('Organization type').selectOption('nonprofit');
    await page.getByText('Not sure yet').click();
    await expect(brief).toContainText('Sam');
    await expect(brief).toContainText('Nonprofit');
    await expect(brief).toContainText('Not sure yet');
    await expect(brief).toContainText('Stone Steps');
  });

  test('a sent form moves focus to the success heading and links sector studies', async ({
    page,
  }) => {
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

    const heading = page.getByRole('heading', { name: 'Thanks, your message is in.' });
    await expect(heading).toBeFocused();
    const links = page.locator('[data-success-studies="church"] a');
    await expect(links).toHaveCount(2);
    await expect(links.first()).toBeVisible();
    await expect(page.locator('form[data-contact-form]')).toBeHidden();
  });

  test('the clock reads the time in Cincinnati', async ({ page }) => {
    await page.goto('/contact/');
    await expect(page.locator('[data-contact-clock]')).toHaveText(
      /^It's \d{1,2}:\d{2} (am|pm) in Cincinnati\.$/,
    );
  });

  test('no third-party map request, even after scrolling the map into view', async ({ page }) => {
    const thirdParty: string[] = [];
    page.on('request', (req) => {
      if (/google\.com\/maps|maps\.google|maps\.gstatic|openstreetmap/.test(req.url())) {
        thirdParty.push(req.url());
      }
    });
    await page.goto('/contact/');
    await page.locator('.contact-map').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await expect(page.locator('iframe')).toHaveCount(0);
    expect(thirdParty).toEqual([]);
  });
});
