import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { routes } from './routes';
import { settle } from './helpers';

// =============================================================================
// Accessibility (axe-core): every route, default rule set
// =============================================================================
// WCAG AA is a hard requirement, and Lighthouse's a11y gate (minScore 1) is
// wired into CI. Lighthouse scores on axe's DEFAULT rules, which include
// best-practice checks (heading-order, landmark-unique, region, ...) beyond the
// wcag2a/aa tags. So we run the default rule set on ALL routes to stay in sync
// with (and slightly ahead of) the Lighthouse gate. About 1s per page.
//
// WCAG 2.2 note: axe-core's default set already includes the 2.2 AA rule that
// is machine-detectable, `target-size` (SC 2.5.8), so this gate enforces 2.2
// too. Do NOT narrow this to `.withTags([...])`: that would DROP the
// best-practice + 2.2 coverage the default set gives us.
// =============================================================================

test.describe('Accessibility: no axe violations', () => {
  for (const route of routes) {
    test(`${route} passes axe`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      // Settle fonts + reveal content (no half-faded text) so axe audits the
      // real, fully-rendered page; mid-transition opacity produces false
      // color-contrast violations.
      await settle(page);
      const results = await new AxeBuilder({ page }).analyze();
      expect(
        results.violations,
        results.violations
          .map((v) => {
            const targets = v.nodes.map((n) => n.target.join(' ')).join(', ');
            return `[${v.impact ?? 'unknown'}] ${v.id}: ${v.help}\n    selectors: ${targets}`;
          })
          .join('\n'),
      ).toEqual([]);
    });
  }
});
