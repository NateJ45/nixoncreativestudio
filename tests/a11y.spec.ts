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

// =============================================================================
// Focus indicators on form fields
// =============================================================================
// axe has NO rule for focus-indicator contrast, and the sweep above audits the
// resting DOM only, so nothing above ever focuses an element. That blind spot
// is how WCP shipped eight forms with `focus:outline-none` plus a ring that
// measured 1.13:1: keyboard focus was invisible, on a green build with
// Lighthouse at 100 (found 2026-07-19).
//
// This asserts the indicator EXISTS. Its contrast is pinned separately, and far
// more cheaply, by src/lib/theme-tokens.test.ts (the `--ring` pairs). It used to
// live in a11y-dark.spec.ts, which was deleted with dark mode in the 2026
// redesign (one art-directed theme). /contact is the only route with a form
// today; add a route here when another one ships.
// =============================================================================

const FORM_ROUTES = ['/contact'];

test.describe('Focus indicators are visible on form fields', () => {
  for (const route of FORM_ROUTES) {
    test(`${route} gives every field a visible focus ring`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await settle(page);

      const fields = page.locator(
        'input:not([type=hidden]):visible, textarea:visible, select:visible',
      );
      const count = await fields.count();
      test.skip(count === 0, 'no form fields on this route');

      const bare: string[] = [];
      for (let i = 0; i < count; i++) {
        const field = fields.nth(i);
        await field.focus();
        const indicator = await field.evaluate((el) => {
          const s = getComputedStyle(el);
          const outline =
            s.outlineStyle !== 'none' && parseFloat(s.outlineWidth || '0') >= 1
              ? parseFloat(s.outlineWidth)
              : 0;
          const shadow = s.boxShadow && s.boxShadow !== 'none' ? 1 : 0;
          return { outline, shadow, name: el.getAttribute('name') ?? el.tagName.toLowerCase() };
        });
        // Either a real outline or a ring-style box-shadow counts.
        if (indicator.outline === 0 && indicator.shadow === 0) bare.push(indicator.name);
      }

      expect(bare, `fields with NO focus indicator: ${bare.join(', ')}`).toEqual([]);
    });
  }
});
