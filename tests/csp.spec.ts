import { readFileSync } from 'node:fs';
import { test, expect, type Page } from './fixtures';
import { routes } from './routes';

// =============================================================================
// The Content-Security-Policy, tried for real. The test server (http-server) does
// not read _headers, so each page is served here with the policy from the built
// dist/client/_headers as an ENFORCED header, and any violation fails the test.
// That is stricter than the report-only header the site sends today, and it is the
// check to trust before enforcing (docs/claude/deployment.md).
// GA and the Cloudflare beacon are off in this build, so their hosts are checked
// against the live site by hand; the steps are in the same doc.
// =============================================================================

// Read when a test runs, not when the file loads: the build may not have happened yet.
const readHeaders = () => readFileSync('dist/client/_headers', 'utf8');
const readPolicy = () =>
  /^\s*Content-Security-Policy(?:-Report-Only)?:\s*(.+)$/m.exec(readHeaders())?.[1].trim();

// Serve documents with the policy and collect every violation.
async function enforce(page: Page): Promise<string[]> {
  const policy = readPolicy();
  const violations: string[] = [];
  await page.exposeFunction('__cspViolation', (text: string) => violations.push(text));
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => {
      const report = (window as unknown as { __cspViolation: (t: string) => void }).__cspViolation;
      report(`${e.violatedDirective} blocked ${e.blockedURI} on ${e.documentURI}`);
    });
  });
  await page.route('**/*', async (route) => {
    if (route.request().resourceType() !== 'document') return route.fallback();
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: { ...response.headers(), 'content-security-policy': policy! },
    });
  });
  return violations;
}

test('the built _headers carries a filled-in policy and Permissions-Policy', () => {
  const headers = readHeaders();
  const policy = readPolicy();
  expect(policy).toBeTruthy();
  expect(headers).not.toContain('__CSP_');
  expect(policy).toContain("object-src 'none'");
  expect(policy).toMatch(/script-src 'self' 'sha256-/);
  expect(policy).not.toMatch(/script-src [^;]*'unsafe-inline'/);
  expect(headers).toMatch(/Permissions-Policy: .*camera=\(\)/);
});

for (const route of routes) {
  test(`${route} loads and scrolls with no CSP violation`, async ({ page }) => {
    const violations = await enforce(page);
    await page.goto(route.endsWith('/') ? route : `${route}/`, { waitUntil: 'load' });
    // Scroll through, so lazy images and scroll-driven scripts run under the policy.
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((done) => setTimeout(done, 40));
      }
    });
    await page.waitForTimeout(200);
    expect(violations).toEqual([]);
  });
}

test('a client window opens the sheet with no CSP violation', async ({ page }) => {
  const violations = await enforce(page);
  await page.goto('/work/');
  await page.locator('a.tile').first().click();
  await expect(page.locator('dialog[open]')).toBeVisible();
  await page.waitForTimeout(400);
  expect(violations).toEqual([]);
});

test('the policy lets the contact form reach Web3Forms', async ({ page }) => {
  const violations = await enforce(page);
  await page.goto('/contact/');
  // Answered here, so nothing leaves the test. A blocked request would still show as a violation.
  await page.route('https://api.web3forms.com/**', (route) =>
    route.fulfill({ status: 200, body: '{}' }),
  );
  await page.evaluate(() =>
    fetch('https://api.web3forms.com/submit', { method: 'POST', body: '{}' }).catch(() => null),
  );
  expect(violations).toEqual([]);
});
