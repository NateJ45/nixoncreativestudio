import { test, expect, type Page } from '@playwright/test';

// =============================================================================
// /contact: the real form, one question at a time
// =============================================================================
// Posts to the site's own endpoint are intercepted, so these never send anything.
// (The test server is static, so the real endpoint is not there anyway.)

const ENDPOINT = '/api/contact/';
const ENDPOINT_GLOB = '**/api/contact/';

/** Walk the questions the way a visitor does, ending on "Check your answers". */
async function fillAll(page: Page, sector = 'Church') {
  await page.getByLabel("What's your name?").fill('Test Person');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByLabel("What's your email?").fill('test@example.com');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('radio', { name: sector }).check();
  await page.getByRole('button', { name: 'Next' }).click();
  await page
    .getByLabel('What are you hoping to build?')
    .fill('A new website for the congregation, with room for the weekly news.');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: /Next|Skip/ }).click();
  await page.getByRole('button', { name: /Next|Skip/ }).click();
  // The optional details, then the check step.
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(
    page.getByRole('heading', { name: 'Check your answers before sending' }),
  ).toBeVisible();
}

test.describe('Without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test("the form posts natively to the site's own endpoint with the required fields", async ({
    page,
  }) => {
    let posted: string | null = null;
    await page.route(ENDPOINT_GLOB, async (route) => {
      posted = route.request().postData();
      await route.fulfill({ status: 200, contentType: 'text/html', body: 'ok' });
    });
    await page.goto('/contact/');
    const form = page.locator('form[data-contact-form]');
    await expect(form).toHaveAttribute('action', ENDPOINT);
    await expect(form).toHaveAttribute('method', 'post');
    for (const name of ['name', 'email', 'message']) {
      await expect(form.locator(`[name="${name}"]`)).toHaveAttribute('required', '');
    }
    await expect(form.locator('[name="org_type"]').first()).toHaveAttribute('required', '');
    for (const name of ['organization', 'phone', 'current_website', 'timeline', 'heard_from']) {
      expect(await form.locator(`[name="${name}"]`).getAttribute('required')).toBeNull();
    }
    expect(await form.locator('[name="budget"]').first().getAttribute('required')).toBeNull();
    // The endpoint, not the form, owns the redirect, and no key ships in the page.
    await expect(form.locator('input[name="access_key"]')).toHaveCount(0);
    await expect(form.locator('input[name="rendered_at"]')).toHaveAttribute('value', '');

    // Every question shows at once, and the check step, which needs the script, does not.
    await expect(page.getByLabel('Phone')).toBeVisible();
    await expect(page.getByLabel("What's your name?")).toBeVisible();
    await expect(page.locator('.q-check')).toBeHidden();

    await page.getByLabel("What's your name?").fill('Test Person');
    await page.getByLabel("What's your email?").fill('test@example.com');
    await page.getByRole('radio', { name: 'Church' }).check();
    await page
      .getByLabel('What are you hoping to build?')
      .fill('A new website for the congregation, with room for the weekly news.');
    await Promise.all([
      page.waitForURL(ENDPOINT_GLOB),
      page.getByRole('button', { name: 'Send' }).click(),
    ]);
    expect(posted).toContain('Test+Person');
  });

  test('the #sent redirect target shows the success panel', async ({ page }) => {
    await page.goto('/contact/?sent=1#sent');
    await expect(page.getByRole('heading', { name: 'Thanks, your message is in.' })).toBeVisible();
    await expect(page.locator('form[data-contact-form]')).toBeHidden();
    await expect(page.locator('[data-success-studies="any"] a')).toHaveCount(2);
  });
});

test.describe('With JavaScript', () => {
  test('one question at a time, with validation in plain words', async ({ page }) => {
    await page.goto('/contact/');
    await expect(page.getByLabel("What's your name?")).toBeVisible();
    await expect(page.getByLabel("What's your email?")).toBeHidden();
    await expect(page.locator('[data-count]')).toHaveText('Question 1 of 7');
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.locator('#name-err')).toContainText('your name');
    await page.getByLabel("What's your name?").fill('Sam');
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByLabel("What's your email?")).toBeVisible();
    await expect(page.locator('[data-count]')).toHaveText('Question 2 of 7');
    // Errors say what to do, in the question's own words.
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.locator('#email-err')).toHaveText(
      'Enter your email address, so I can reply.',
    );
    await page.getByLabel("What's your email?").fill('sam@example');
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.locator('#email-err')).toHaveText(
      'Enter an email address like name@example.org.',
    );
  });

  test('Enter in the long answer makes a new line and never moves on', async ({ page }) => {
    await page.goto('/contact/');
    await page.getByLabel("What's your name?").fill('Sam');
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByLabel("What's your email?").fill('sam@example.org');
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('radio', { name: 'Church' }).check();
    await page.getByRole('button', { name: 'Next' }).click();
    const box = page.getByLabel('What are you hoping to build?');
    await box.click();
    await page.keyboard.type('First thought.');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Second thought.');
    await expect(box).toBeVisible();
    await expect(box).toHaveValue('First thought.\nSecond thought.');
    await expect(page.locator('[data-count]')).toHaveText('Question 4 of 7');
  });

  test('plain choices with one reassurance line, and budgets that never overlap', async ({
    page,
  }) => {
    await page.goto('/contact/');
    const budgets = await page.locator('input[name="budget"] + span').allInnerTexts();
    expect(budgets).toEqual([
      'Under $3,500',
      '$3,500 to $6,499',
      '$6,500 to $12,499',
      '$12,500 or more',
      'Not sure yet',
    ]);
    const runs = await page.locator('input[name="runs"] + span').allInnerTexts();
    expect(runs.join(' ')).not.toMatch(/custom tools|editor/i);
    await expect(page.locator('[data-step="budget"]')).toContainText(
      "Not sure? Pick the closest. I'll work it out with you.",
    );
    // The panel beside the form says what it is, so it never reads as a second form.
    await expect(page.getByRole('complementary', { name: 'Your answers so far' })).toHaveCount(1);
  });

  test('check your answers, change one, and come straight back', async ({ page }) => {
    await page.goto('/contact/');
    await fillAll(page);
    await expect(page.locator('[data-count]')).toHaveText('Check your answers');
    const list = page.locator('[data-check]');
    await expect(list).toContainText('test@example.com');
    await expect(list).toContainText('Not provided');
    await expect(page.getByRole('button', { name: 'Send' })).toBeVisible();
    await page.getByRole('button', { name: 'Change email' }).click();
    await page.getByLabel("What's your email?").fill('other@example.org');
    await page.getByRole('button', { name: 'Back to your answers' }).click();
    await expect(page.locator('[data-count]')).toHaveText('Check your answers');
    await expect(list).toContainText('other@example.org');
    // Answers are shown as plain text.
    await expect(list.locator('b, script')).toHaveCount(0);
  });

  test('prefill fills the radio, the budget and the origin fields', async ({ page }) => {
    await page.goto(
      '/contact/?from=first-presbyterian-orangeburg&tier=signature&service=photography&org_type=church',
    );
    const form = page.locator('form[data-contact-form]');
    await expect(form.locator('input[name="org_type"]:checked')).toHaveValue('church');
    await expect(form.locator('input[name="budget"]:checked')).toHaveValue('7k-12k');
    await expect(form.locator('input[name="from"]')).toHaveValue('first-presbyterian-orangeburg');
    await expect(form.locator('input[name="tier"]')).toHaveValue('signature');
    await expect(form.locator('input[name="service"]')).toHaveValue('photography');
    await expect(form.locator('input[name="origin_org_type"]')).toHaveValue('church');
    await expect(page.locator('[data-tier-note]')).toContainText('Signature');
  });

  test('the tier name works in any case', async ({ page }) => {
    await page.goto('/contact/?tier=Launch');
    await expect(page.locator('input[name="budget"]:checked')).toHaveValue('4k-7k');
    await expect(page.locator('input[name="tier"]')).toHaveValue('launch');
  });

  test('values that are not slugs are ignored', async ({ page }) => {
    await page.goto('/contact/?from=%3Cscript%3E&tier=nope&org_type=castle');
    const form = page.locator('form[data-contact-form]');
    await expect(form.locator('input[name="from"]')).toHaveValue('');
    await expect(form.locator('input[name="org_type"]:checked')).toHaveCount(0);
    await expect(form.locator('input[name="budget"]:checked')).toHaveCount(0);
  });

  test('a draft comes back after a reload, and a prefill does not override it', async ({
    page,
  }) => {
    await page.goto('/contact/');
    await page.getByLabel("What's your name?").fill('Sam Draft');
    await page.waitForTimeout(400);
    await page.goto('/contact/?org_type=church');
    await expect(page.getByLabel("What's your name?")).toHaveValue('Sam Draft');
    await expect(page.locator('input[name="org_type"]:checked')).toHaveValue('church');
    await page.evaluate(() =>
      localStorage.setItem(
        'ncs-contact-draft',
        JSON.stringify({ name: 'Sam Draft', org_type: 'school' }),
      ),
    );
    await page.goto('/contact/?org_type=church');
    await expect(page.locator('input[name="org_type"]:checked')).toHaveValue('school');
  });

  test('the brief is hidden when it would stack under the form', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/contact/');
    await expect(page.locator('[data-phone]')).toBeHidden();
    await expect(page.locator('.q-form .pip')).toHaveCount(0);
    await expect(page.locator('.direct a').first()).toBeVisible();
  });

  test('the brief assembles from the fields as plain text', async ({ page }) => {
    await page.goto('/contact/?from=stone-steps-50k');
    const brief = page.locator('[data-phone]');
    await page.getByLabel("What's your name?").fill('<b>Sam</b>');
    await expect(brief).toContainText('<b>Sam</b>');
    await expect(brief.locator('dd b')).toHaveCount(0);
    await expect(brief).toContainText('The Stone Steps 50K study');
  });

  test('a sent form moves focus to the success heading and links sector studies', async ({
    page,
  }) => {
    let body = '';
    await page.route(ENDPOINT_GLOB, async (route) => {
      body = route.request().postData() ?? '';
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
    await page.goto('/contact/');
    await fillAll(page);
    await page.getByRole('button', { name: 'Send' }).click();
    const heading = page.getByRole('heading', { name: 'Thanks, your message is in.' });
    await expect(heading).toBeFocused();
    await expect(page.locator('[data-success-studies="church"] a')).toHaveCount(2);
    await expect(page.locator('form[data-contact-form]')).toBeHidden();
    await expect(page.locator('[data-phone]')).toContainText('Sent to Nathan');
    // The load-time stamp rides along for the endpoint's timing check.
    expect(body).toMatch(/name="rendered_at"\r\n\r\n\d{13}/);
    expect(await page.evaluate(() => localStorage.getItem('ncs-contact-draft'))).toBeNull();
    await expect(page.locator('body')).not.toContainText(/preview/i);
  });

  test('a failed post shows the error panel and keeps the form', async ({ page }) => {
    await page.route(ENDPOINT_GLOB, (route) => route.fulfill({ status: 500, body: 'nope' }));
    await page.goto('/contact/');
    await fillAll(page);
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.locator('[data-contact-error]')).toBeVisible();
    await expect(page.locator('form[data-contact-form]')).toBeVisible();
    await expect(page.locator('[data-contact-submit]')).toBeEnabled();
  });

  test('the honeypot pretends and sends nothing', async ({ page }) => {
    let sent = false;
    await page.route(ENDPOINT_GLOB, async (route) => {
      sent = true;
      await route.fulfill({ status: 200, body: '{}' });
    });
    await page.goto('/contact/');
    await fillAll(page);
    await page.evaluate(() => {
      (document.getElementById('botcheck') as HTMLInputElement).value = 'bot';
    });
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.getByRole('heading', { name: 'Thanks, your message is in.' })).toBeVisible();
    expect(sent).toBe(false);
  });
});
