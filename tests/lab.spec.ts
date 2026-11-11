import { test, expect } from '@playwright/test';

// =============================================================================
// /work: the Lab strip (src/components/LabStrip.astro, src/scripts/lab.js)
// =============================================================================
// Three cards of my own projects after the client work. They must never count
// as case studies, every demo is a real button, and the card turns over to its
// story. "Read how I built it" only shows for a published journal post.

test('the lab sits after the client work and is not counted with it', async ({ page }) => {
  await page.goto('/work/');
  await expect(page.locator('#lab h2')).toHaveText('The lab');
  await expect(page.locator('#lab .lab-item')).toHaveCount(3);
  await expect(page.locator('[data-grid] > li')).toHaveCount(8);
  await expect(page.locator('[data-status]')).toHaveText('Showing all 8 case studies.');
  // After the case studies, the figures and the jobs index.
  const order = await page.evaluate(() => {
    const at = (s: string) =>
      [...document.querySelectorAll('main *, body *')].indexOf(document.querySelector(s)!);
    return [at('[data-section]'), at('#jobs'), at('#lab')];
  });
  expect(order[0]).toBeLessThan(order[2]);
  expect(order[1]).toBeLessThan(order[2]);
  // A sector filter leaves the lab alone.
  await page.locator('button[data-f="church"]').click();
  await expect(page.locator('#lab .lab-item:visible')).toHaveCount(3);
});

test('the rota demo fills its gaps and says so', async ({ page }) => {
  await page.goto('/work/');
  const card = page.locator('[data-lab="rota"]');
  await expect(card.locator('[data-lab-count]')).toHaveText('6');
  await card.getByRole('button', { name: 'Fill the gaps' }).click();
  await expect(card.locator('[data-lab-count]')).toHaveText('1', { timeout: 5000 });
  await expect(card.locator('[data-lab-say]')).toContainText('Filled 5 gaps');
  await expect(card.getByRole('button', { name: 'Replay' })).toBeVisible();
});

test('the site check demo sweeps the sites and recovers the one that went down', async ({
  page,
}) => {
  await page.goto('/work/');
  const card = page.locator('[data-lab="status"]');
  await card.getByRole('button', { name: 'Run a check' }).click();
  await expect(card.locator('[data-lab-site].up')).toHaveCount(8, { timeout: 6000 });
  await expect(card.locator('[data-lab-alert-t]')).toHaveText(/back up after 4 minutes/);
  await expect(card.locator('[data-lab-say]')).toContainText('Checked 8 sites');
});

test('a lab card turns over to its story and back, moving focus with it', async ({ page }) => {
  await page.goto('/work/');
  const card = page.locator('[data-lab="console"]');
  await card.getByRole('button', { name: /^Turn it over/ }).click();
  await expect(card).toHaveAttribute('data-side', 'back');
  await expect(card.getByRole('button', { name: /^Turn back/ })).toBeFocused();
  await expect(card.locator('.lab-back')).toContainText('WinUI 3');
  await page.keyboard.press('Enter');
  await expect(card).toHaveAttribute('data-side', 'front');
  await expect(card.getByRole('button', { name: /^Turn it over/ })).toBeFocused();
});

test('the story link only shows for a published journal post', async ({ page }) => {
  await page.goto('/work/');
  // The console has no story; the site check's post is a draft.
  await expect(page.locator('[data-lab="console"] .lab-story')).toHaveCount(0);
  await expect(page.locator('[data-lab="status"] .lab-story')).toHaveCount(0);
  const rota = page.locator('[data-lab="rota"] .lab-story');
  if ((await rota.count()) > 0) {
    await expect(rota).toHaveAttribute('href', '/journal/church-av-rota-that-fills-its-own-gaps/');
  }
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('each demo shows its end state with a Replay button', async ({ page }) => {
    await page.goto('/work/');
    await expect(page.locator('[data-lab="rota"] [data-lab-count]')).toHaveText('1');
    await expect(page.locator('[data-lab="status"] [data-lab-site].up')).toHaveCount(8);
    await expect(page.locator('#lab [data-lab-run]')).toHaveText(['Replay', 'Replay', 'Replay']);
  });
});
