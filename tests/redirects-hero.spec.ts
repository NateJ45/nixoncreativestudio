import { test, expect } from '@playwright/test';

// =============================================================================
// Redirects (CMS-DESIGN PR 13)
// =============================================================================
// REDIRECTS. The two retired URLs are EmDash Redirects rows (cms/content/redirects.json is
// the committed record); there is no code fallback. The `ncs-ci` data holds the rows, so this
// spec exercises EmDash's own path: a visitor must be sent to the right place with a
// permanent redirect.
//
// The homepage hero scene these checks used to cover was retired in the 2026 redesign; the
// hero reel has its own spec (tests/home-hero.spec.ts).

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
