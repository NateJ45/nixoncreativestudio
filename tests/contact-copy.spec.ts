import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// =============================================================================
// /contact copy and form payload: the words ARE the CMS words, the form submits
// LABELS (CMS-DESIGN PR 9 gate)
// =============================================================================
// The headline, intro, sidebar lines and the Budget / Timeline / "How did you
// hear" choices now come from the `page_contact` entry. The decision behind this
// PR: each choice submits its visible label ("Under $4,000"), not a code, so the
// label is what arrives in Nathan's inquiry email.
//
// NOTHING IS EVER SENT. Every request to Web3Forms is intercepted with
// page.route() and answered locally, so these tests post no real message and
// need no access key. They assert on the intercepted payload instead.
//
// The expected text comes from cms/content/page_contact.json. The CI dataset
// (`ncs-ci`) is generated from the same file (scripts/ci-dataset/cms-fixtures.mjs)
// and production serves it as its fallback until its data is loaded.

interface Contact {
  heading: string;
  heading_accent: string;
  intro: string;
  budgets: { label: string }[];
  timelines: { label: string }[];
  heard_from: { label: string }[];
  next_steps: { text: string }[];
}
const contact = (
  JSON.parse(readFileSync(join(process.cwd(), 'cms/content/page_contact.json'), 'utf8')) as {
    data: Contact;
  }
).data;

const SUBMIT_URL = '**/api.web3forms.com/submit';

/** Answer the Web3Forms POST locally and remember the multipart body it carried. */
async function interceptSubmit(page: Page): Promise<{ bodies: string[] }> {
  const seen: { bodies: string[] } = { bodies: [] };
  await page.route(SUBMIT_URL, async (route) => {
    seen.bodies.push(route.request().postData() ?? '');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });
  return seen;
}

/** One field's value out of a multipart/form-data body. */
function field(body: string, name: string): string | undefined {
  const m = new RegExp(`name="${name}"\\r?\\n\\r?\\n([^\\r\\n]*)`).exec(body);
  return m?.[1];
}

async function fillRequired(page: Page): Promise<void> {
  await page.locator('#name').fill('Test Person');
  await page.locator('#email').fill('test@example.com');
  await page.locator('#org_type').selectOption('church');
  await page
    .locator('#message')
    .fill('This is only a test message, long enough to pass the thirty character minimum.');
}

test.describe('Contact copy without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('/contact/: headline, intro, choice lists and sidebar are the CMS words', async ({
    page,
  }) => {
    await page.goto('/contact/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1#contact-hero-heading')).toHaveText(
      `${contact.heading} ${contact.heading_accent}`,
    );
    await expect(page.getByText(contact.intro, { exact: true })).toBeVisible();

    // Each option's value IS its visible text: that is what Web3Forms emails.
    for (const [id, list] of [
      ['budget', contact.budgets],
      ['timeline', contact.timelines],
      ['heard_from', contact.heard_from],
    ] as const) {
      const options = await page
        .locator(`#${id} option:not([value=""])`)
        .evaluateAll((els) =>
          els.map((o) => [(o as HTMLOptionElement).value, o.textContent?.trim() ?? '']),
        );
      expect(options, `${id} options`).toEqual(list.map((l) => [l.label, l.label]));
    }

    const steps = page.locator('aside ol li');
    await expect(steps).toHaveText(contact.next_steps.map((s) => s.text));
  });

  test('/contact/: the title and meta description come from the contact entry', async ({
    page,
  }) => {
    await page.goto('/contact/', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/^Contact \| Nixon Creative Studio$/);
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect((description ?? '').length).toBeGreaterThanOrEqual(50);
  });
});

test('the honeypot and the Web3Forms hidden fields are still on the form', async ({ page }) => {
  await page.goto('/contact/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('form[data-contact-form] input[name="botcheck"]')).toHaveCount(1);
  await expect(page.locator('form[data-contact-form] input[name="access_key"]')).toHaveCount(1);
  await expect(page.locator('form[data-contact-form] input[name="subject"]')).toHaveCount(1);
  await expect(page.locator('form[data-contact-form] input[name="from_name"]')).toHaveCount(1);
});

test('submitting posts the visible LABEL of each choice, not a code', async ({ page }) => {
  const seen = await interceptSubmit(page);
  await page.goto('/contact/', { waitUntil: 'domcontentloaded' });
  await fillRequired(page);
  await page.locator('#budget').selectOption({ label: contact.budgets[0].label });
  await page.locator('#timeline').selectOption({ label: contact.timelines[1].label });
  await page.locator('#heard_from').selectOption({ label: contact.heard_from[3].label });
  await page.locator('[data-contact-submit]').click();

  await expect(page.locator('[data-contact-thanks]')).toBeVisible();
  expect(seen.bodies).toHaveLength(1);
  const body = seen.bodies[0];
  expect(field(body, 'budget')).toBe(contact.budgets[0].label);
  expect(field(body, 'timeline')).toBe(contact.timelines[1].label);
  expect(field(body, 'heard_from')).toBe(contact.heard_from[3].label);
  // Organization type is still its code (the case-study sector slugs).
  expect(field(body, 'org_type')).toBe('church');
  // The honeypot is present and empty.
  expect(field(body, 'botcheck')).toBe('');
});

test('a filled honeypot sends nothing', async ({ page }) => {
  const seen = await interceptSubmit(page);
  await page.goto('/contact/', { waitUntil: 'domcontentloaded' });
  await fillRequired(page);
  await page.locator('#budget').selectOption({ label: contact.budgets[1].label });
  // The field is sr-only and aria-hidden; set it the way a bot would.
  await page.locator('#botcheck').evaluate((el: HTMLInputElement) => (el.value = 'spam'));
  await page.locator('[data-contact-submit]').click();
  await expect(page.locator('[data-contact-thanks]')).toBeVisible();
  expect(seen.bodies).toHaveLength(0);
});

test('the optional lists may stay empty and a blank budget blocks the submit', async ({ page }) => {
  const seen = await interceptSubmit(page);
  await page.goto('/contact/', { waitUntil: 'domcontentloaded' });
  await fillRequired(page);
  await page.locator('[data-contact-submit]').click();
  // Budget is required: native validation stops the submit before any request.
  await expect(page.locator('[data-contact-thanks]')).toBeHidden();
  expect(seen.bodies).toHaveLength(0);

  await page.locator('#budget').selectOption({ label: contact.budgets[2].label });
  await page.locator('[data-contact-submit]').click();
  await expect(page.locator('[data-contact-thanks]')).toBeVisible();
  expect(field(seen.bodies[0], 'budget')).toBe(contact.budgets[2].label);
  expect(field(seen.bodies[0], 'timeline')).toBe('');
  expect(field(seen.bodies[0], 'heard_from')).toBe('');
});

test('the form still binds after a View Transitions navigation', async ({ page }) => {
  const seen = await interceptSubmit(page);
  // Land elsewhere first, then reach /contact through the client-side router
  // (the header "Start a project" link), so the page script must re-bind on
  // astro:page-load rather than at first load.
  await page.goto('/about/', { waitUntil: 'domcontentloaded' });
  await page.locator('header a[href="/contact"], header a[href="/contact/"]').first().click();
  await page.waitForURL(/\/contact\/?$/);
  await expect(page.locator('form[data-contact-form][data-enhanced="true"]')).toHaveCount(1);
  await fillRequired(page);
  await page.locator('#budget').selectOption({ label: contact.budgets[3].label });
  await page.locator('[data-contact-submit]').click();
  await expect(page.locator('[data-contact-thanks]')).toBeVisible();
  expect(seen.bodies).toHaveLength(1);
  expect(field(seen.bodies[0], 'budget')).toBe(contact.budgets[3].label);
});

test('an old draft that saved a code is ignored, a saved label is restored', async ({ page }) => {
  await page.goto('/contact/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ([label]) =>
      localStorage.setItem(
        'ncs-contact-draft',
        JSON.stringify({ budget: 'under-4k', timeline: label, name: 'Draft Name' }),
      ),
    [contact.timelines[0].label],
  );
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#name')).toHaveValue('Draft Name');
  await expect(page.locator('#timeline')).toHaveValue(contact.timelines[0].label);
  // The code from the old draft matches no option, so the placeholder stays selected.
  await expect(page.locator('#budget')).toHaveValue('');
});
