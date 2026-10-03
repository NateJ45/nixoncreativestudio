import { test, expect } from '@playwright/test';

// =============================================================================
// Redirects and the hero scene (CMS-DESIGN PR 13)
// =============================================================================
// REDIRECTS. The two retired URLs live in EmDash Redirects (cms/content/redirects.json),
// with a code fallback (src/lib/redirectFallback.ts, applied by src/worker.ts on a 404) for
// the time before production holds the rows. This spec cannot tell which one answered, and
// it should not: either way a visitor must be sent to the right place with a permanent
// redirect. (The `ncs-ci` data holds the rows, so CI exercises EmDash's own path; the unit
// tests and the staged deploy in docs/CMS-DESIGN.md cover the fallback.)
//
// HERO. HeroShowcase is built from the case studies with "Show in the homepage device scene"
// ticked (CMS path) or, when none are, from its five bundled captures (fallback path). The
// checks below hold on both, plus one rule per path.

/** Follow redirects by hand (max 4 hops), returning each hop's status and Location. */
async function hops(request: import('@playwright/test').APIRequestContext, start: string) {
  const out: { url: string; status: number; location: string | null }[] = [];
  let url = start;
  for (let i = 0; i < 4; i++) {
    const res = await request.get(url, { maxRedirects: 0 });
    const location = res.headers()['location'] ?? null;
    out.push({ url, status: res.status(), location });
    if (res.status() < 300 || res.status() >= 400 || !location) break;
    url = new URL(location, res.url()).href;
  }
  return out;
}

test.describe('Redirects', () => {
  test('/now is a permanent redirect to /about/#now', async ({ request, baseURL }) => {
    const chain = await hops(request, `${baseURL}/now`);
    const last = chain.at(-1)!;
    // Every hop is permanent, and the chain ends at the About page's Currently section.
    for (const hop of chain.slice(0, -1))
      expect([301, 308], JSON.stringify(chain)).toContain(hop.status);
    expect(last.status, JSON.stringify(chain)).toBeLessThan(400);
    const landed = chain
      .map((h) => h.location)
      .filter(Boolean)
      .at(-1);
    expect(landed, JSON.stringify(chain)).toMatch(/\/about\/#now$/);
  });

  test('/now lands on the About page in the browser', async ({ page }) => {
    await page.goto('/now');
    await expect(page).toHaveURL(/\/about\/#now$/);
    await expect(page).toHaveTitle(/Nixon Creative Studio/);
  });

  test('the retired case study redirects to the work index with a 301', async ({
    request,
    baseURL,
  }) => {
    const chain = await hops(request, `${baseURL}/work/west-chester-preschool/`);
    expect(chain[0].status, JSON.stringify(chain)).toBe(301);
    expect(chain[0].location, JSON.stringify(chain)).toMatch(/\/work\/$/);
  });

  test('a URL that was never redirected still answers a real 404', async ({ request }) => {
    const res = await request.get('/work/never-existed/', { maxRedirects: 0 });
    expect(res.status()).toBe(404);
  });
});

test.describe('Hero device scene', () => {
  test('the scene renders at least one site, and the address bar and slides agree', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const stage = page.locator('.dev-desktop').locator('xpath=ancestor::*[@data-hero-showcase][1]');
    const count = Number(await stage.getAttribute('data-count'));
    expect(count).toBeGreaterThanOrEqual(1);
    const hosts = await page
      .locator('.dev-screen-desktop [data-host]')
      .evaluateAll((els) => els.map((e) => e.getAttribute('data-host') ?? ''));
    expect(hosts).toHaveLength(count);
    for (const h of hosts) expect(h).toMatch(/^[a-z0-9.-]+\.[a-z]{2,}$/);
    // One mobile slide per site, so both devices cycle in step.
    // (The page renders the phone twice: inside the desktop cluster and as the small-screen
    // backdrop, `.is-phone`. Count each.)
    await expect(page.locator('.hero-stage:not(.is-phone) .dev-screen-phone .shot')).toHaveCount(
      count,
    );
    await expect(page.locator('.hero-stage.is-phone .dev-screen-phone .shot')).toHaveCount(count);
    // The first site is the one on screen at first paint.
    await expect(page.locator('[data-address-text]')).toHaveText(hosts[0]);
  });

  test('a CMS-built scene uses width-only resized URLs (never a height), the fallback keeps its five', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const srcs = await page
      .locator('.dev-screen-desktop img.shot-img')
      .evaluateAll((els) =>
        els.map(
          (e) =>
            e.getAttribute('data-src') ??
            e.parentElement?.querySelector('source')?.getAttribute('srcset') ??
            '',
        ),
      );
    const hosts = await page
      .locator('.dev-screen-desktop [data-host]')
      .evaluateAll((els) => els.map((e) => e.getAttribute('data-host') ?? ''));
    const fromCms = srcs.some((s) => s.includes('%2F_emdash%2Fapi%2Fmedia%2Ffile%2F'));
    if (fromCms) {
      for (const s of srcs.filter(Boolean)) {
        // The 4096 px resizer limit (docs/EMDASH.md): a height in the URL returns the 7 MB original.
        expect(s, 'no h= parameter on a tall capture').not.toMatch(/[?&]h=/);
        expect(s).toMatch(/[?&]w=\d+/);
      }
    } else {
      expect(hosts).toEqual([
        'secondpreschicago.org',
        'theologymatters.com',
        'stonesteps50k.com',
        'mas-monograms.com',
        'presbyterianacademy.org',
      ]);
    }
  });
});
