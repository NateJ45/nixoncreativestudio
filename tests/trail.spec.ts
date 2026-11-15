import { test, expect, type Page, type Request } from '@playwright/test';

/* The visitor trail (src/lib/trail.ts). It never runs in a test browser on its own (WebDriver,
   and not the production host), so each test that wants it sets window.__ncsTrailForce before
   the page loads. /api/trail/ and /api/contact/ are intercepted, never reached. Chromium only. */

const TRAIL = '**/api/trail/';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

interface Beacon {
  vid: string;
  visit: string;
  i: number;
  path: string;
  src: string | null;
  ms: number;
  sc: number;
  ev: string[];
}

async function capture(page: Page, force = true): Promise<Beacon[]> {
  const sent: Beacon[] = [];
  if (force)
    await page.addInitScript(() => {
      (window as unknown as { __ncsTrailForce: boolean }).__ncsTrailForce = true;
    });
  await page.route(TRAIL, async (route) => {
    sent.push(JSON.parse(route.request().postData() ?? '{}') as Beacon);
    await route.fulfill({ status: 204 });
  });
  return sent;
}

// Playwright can't reliably catch a beacon sent while a page unloads, so each step fires the
// pagehide handler itself before moving on. Real browsers send it on the way out.
const leave = (page: Page) => page.evaluate(() => window.dispatchEvent(new Event('pagehide')));

test('each page sends one beacon with the path, time in use and the visit', async ({ page }) => {
  const sent = await capture(page);
  await page.goto('/');
  await page.mouse.move(200, 200);
  await page.waitForTimeout(2200);
  await leave(page);
  await expect.poll(() => sent.filter((b) => b.path === '/').length).toBeGreaterThan(0);
  const home = sent.filter((b) => b.path === '/').at(-1)!;
  expect(home.vid).toMatch(UUID);
  expect(home.visit).toMatch(UUID);
  expect(home.i).toBe(1);
  expect(home.src).toBe('direct');
  expect(home.ms).toBeGreaterThanOrEqual(1000);
  // The next page belongs to the same visit, page 2, and only the first page names a source.
  await page.goto('/services/');
  await page.mouse.wheel(0, 1500);
  await page.waitForTimeout(300);
  await leave(page);
  await expect.poll(() => sent.some((b) => b.path === '/services/')).toBe(true);
  const services = sent.find((b) => b.path === '/services/')!;
  expect(services.visit).toBe(home.visit);
  expect(services.vid).toBe(home.vid);
  expect(services.i).toBe(2);
  expect(services.src).toBeNull();
  expect(services.sc).toBeGreaterThan(0);
});

test('?me=1 marks the browser as Nathan and nothing is sent', async ({ page }) => {
  const sent = await capture(page);
  await page.goto('/?me=1');
  await page.goto('/about/');
  await leave(page);
  await page.goto('/services/');
  await leave(page);
  await page.waitForTimeout(500);
  expect(sent.filter((b) => b.path !== '/')).toHaveLength(0);
  expect(await page.evaluate(() => localStorage.getItem('ncs-me'))).toBe('1');
  await page.goto('/?me=0');
  expect(await page.evaluate(() => localStorage.getItem('ncs-me'))).toBeNull();
});

test('without the test switch a WebDriver browser sends nothing', async ({ page }) => {
  const sent = await capture(page, false);
  await page.goto('/');
  await leave(page);
  await page.goto('/services/');
  await leave(page);
  await page.waitForTimeout(500);
  expect(sent).toHaveLength(0);
});

test('the contact form sends the visitor id, and the trail never holds a typed field', async ({
  page,
}) => {
  const sent = await capture(page);
  let posted: Request | null = null;
  await page.route('**/api/contact/', async (route) => {
    posted = route.request();
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });
  await page.goto('/contact/');
  await page.getByLabel("What's your name?").fill('Test Person');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByLabel("What's your email?").fill('test@example.com');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('radio', { name: 'Church' }).check();
  await page.getByRole('button', { name: 'Next' }).click();
  await page
    .getByLabel('What are you hoping to build?')
    .fill('A new site for our congregation, with sermons and events kept current.');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: /Next|Skip/ }).click();
  await page.getByRole('button', { name: /Next|Skip/ }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByRole('heading', { name: 'Thanks, your message is in.' })).toBeFocused();

  const vid = await page.evaluate(() => localStorage.getItem('ncs-vid'));
  expect(vid).toMatch(UUID);
  expect(posted).not.toBeNull();
  const body = posted!.postDataBuffer()?.toString('latin1') ?? '';
  expect(body).toContain(`name="visitor_id"\r\n\r\n${vid}`);
  // The trail for the contact page went out before the form did.
  expect(sent.some((b) => b.path === '/contact/' && b.ev.includes('form:started'))).toBe(true);
  const all = JSON.stringify(sent);
  for (const value of ['Test Person', 'test@example.com', 'congregation']) {
    expect(all, `no beacon carries "${value}"`).not.toContain(value);
  }
});
