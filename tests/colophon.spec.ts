import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';

// =============================================================================
// /colophon stays true of the code (never-break rule 11)
// =============================================================================

test('the colophon names the font and hosting this build really uses', async ({ page }) => {
  await page.goto('/colophon/');
  await expect(page.locator('.prose')).toContainText('Hanken Grotesk');
  await expect(page.locator('.prose')).toContainText('Astro');
  await expect(page.locator('.prose')).toContainText('Cloudflare');
  const font = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  expect(font).toContain('Hanken Grotesk');
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  expect(pkg.dependencies.astro).toMatch(/^\^7\./);
});

test('every font this site loads is its own', async ({ page }) => {
  const fonts: string[] = [];
  page.on('request', (r) => {
    if (r.resourceType() === 'font') fonts.push(new URL(r.url()).host);
  });
  await page.goto('/colophon/', { waitUntil: 'load' });
  const here = new URL(page.url()).host;
  expect(fonts.length).toBeGreaterThan(0);
  expect(fonts.every((h) => h === here)).toBe(true);
});

test('the windows beside the text are real links, one in front at a time', async ({ page }) => {
  await page.goto('/colophon/');
  const slides = page.locator('[data-colo-slide]');
  expect(await slides.count()).toBeGreaterThan(1);
  // Every slide is a link to its case study; only the one in front can be reached.
  const hrefs = await page
    .locator('[data-colo-win] a.tile')
    .evaluateAll((els) => els.map((el) => el.getAttribute('href')));
  expect(hrefs.every((h) => /^\/work\/[a-z0-9-]+\/$/.test(h ?? ''))).toBe(true);
  await expect(page.locator('[data-colo-slide]:not([inert])')).toHaveCount(1);
});

test('the window deck moves on by itself and the Pause button stops it', async ({ page }) => {
  await page.clock.install();
  await page.goto('/colophon/');
  const front = page.locator('[data-colo-slide].is-on .cap b');
  const first = await front.textContent();
  await page.mouse.move(0, 0);
  await page.clock.runFor(5000);
  await expect(front).not.toHaveText(first ?? '');
  const hold = page.locator('[data-colo-hold]');
  await hold.click();
  await expect(hold).toHaveAttribute('aria-pressed', 'true');
  await page.mouse.move(0, 0);
  const held = await front.textContent();
  await page.clock.runFor(10000);
  await expect(front).toHaveText(held ?? '');
});

// The maker's page (2026-11-16): the kit list, the specimen cards and the flag making-of each
// state something the code can check.
test('each type specimen names a weight the page really sets', async ({ page }) => {
  await page.goto('/colophon/');
  const cards = page.locator('[data-spec-weight]');
  expect(await cards.count()).toBeGreaterThanOrEqual(3);
  const checks = await cards.evaluateAll((els) =>
    els.map((el) => {
      const of = (el as HTMLElement).dataset.specOf ?? '';
      const target = of ? document.querySelector(of) : null;
      return {
        claimed: (el as HTMLElement).dataset.specWeight,
        real: target ? getComputedStyle(target).fontWeight : 'missing',
        shown: getComputedStyle(el.querySelector('.spec-sample')!).fontWeight,
      };
    }),
  );
  for (const c of checks) {
    expect(c.real).toBe(c.claimed);
    expect(c.shown).toBe(c.claimed);
  }
});

test('the typography facts match the font face in kit.css', async ({ page }) => {
  const kit = readFileSync('src/styles/kit.css', 'utf8');
  // The one variable file, every weight from 100 to 900, and Arial standing in while it loads.
  expect(kit).toMatch(
    /font-family: 'Hanken Grotesk';[^}]*font-weight: 100 900;[^}]*\/assets\/fonts\/hanken\.woff2/,
  );
  expect(kit).toMatch(/'Hanken Grotesk Fallback';[^}]*local\('Arial'\)/);
  await page.goto('/colophon/');
  await expect(page.locator('.prose')).toContainText('every weight from 100 to 900');
  await expect(page.locator('.prose')).toContainText('Arial stands in');
});

test('the kit list counts the real test files and names the real tools', async ({ page }) => {
  await page.goto('/colophon/');
  const specs = readdirSync('tests').filter((f) => f.endsWith('.spec.ts')).length;
  await expect(page.locator('[data-kit-tests]')).toHaveText(String(specs));
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  expect(pkg.devDependencies['@playwright/test']).toBeTruthy();
  expect(pkg.devDependencies['@axe-core/playwright']).toBeTruthy();
  expect(pkg.dependencies.react ?? pkg.devDependencies.react).toBeUndefined();
  await expect(page.locator('.colo-kit')).toContainText('Astro 7');
});

test('the flag making-of is true of the scripts that made the flags', async ({ page }) => {
  const sim = readFileSync('scripts/flags/flag.py', 'utf8');
  expect(sim).toContain('import bpy');
  expect(sim).toContain("modifiers.new('Cloth', 'CLOTH')");
  const loopScript = readFileSync('scripts/flag-loops.mjs', 'utf8');
  expect(loopScript).toContain('sky mask');
  // Saltire: gusting wind. Gusts are on by default (GUST 1) and drive the wind's strength.
  expect(sim).toContain("GUST = E('GUST', 1)");
  expect(sim).toContain("drive(wind, 'field.strength', -1, f'{E('WIND', 20000)} * (1 + {GUST}");
  // Stars and Stripes: a steady breeze, rendered with gusts, swing and noise all switched off.
  expect(sim).toMatch(/steady breeze with no gusts, swing or noise/);
  expect(sim).toMatch(/NOISE=0 SWING=0 GUST=0/);
  // Fade towards the horizon: the flag's weight falls to zero over the lower half of the frame.
  expect(loopScript).toContain('const fade = Math.min(1, Math.max(0, (0.62 - y / H) / 0.42));');
  // Seam: the script searches for the pair of frames that differ least, then crossfades the join.
  expect(loopScript).toContain('if (d < best.d) best = { d, i, j };');
  expect(loopScript).toContain('const BLEND = Number(process.env.FLAG_BLEND');
  const loops = JSON.parse(readFileSync('src/data/flag-loops.json', 'utf8'));
  expect(Object.keys(loops).sort()).toEqual(['flag-saltire', 'flag-us']);
  await page.goto('/colophon/');
  const section = page.locator('.prose');
  await expect(section.locator('#flags')).toHaveText('The flags on the postcard');
  await expect(section).toContainText('simulated in Blender');
  await expect(page.locator('.colo-steps li')).toHaveCount(3);
});
