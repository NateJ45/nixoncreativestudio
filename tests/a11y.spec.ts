import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { routes } from './routes';
import { settle, springsAtRest } from './helpers';

// =============================================================================
// Accessibility (axe-core): every route, WCAG 2.2 A and AA plus best practice
// =============================================================================
// WCAG 2.2 AA is the target for this site (.claude/rules/accessibility.md), and
// Lighthouse's a11y gate (minScore 1) is wired into CI. Lighthouse scores on
// axe's best-practice checks too (heading-order, landmark-unique, region, ...),
// so the tag list below keeps `best-practice` alongside every WCAG A and AA tag.
//
// Why tags and not the default set: axe ships its one 2.2 AA rule, `target-size`
// (SC 2.5.8), switched OFF by default, so the default set never checked it. Naming
// `wcag22aa` turns it on. The only default rules the tags leave out are the two
// deprecated duplicate-id rules, which tested SC 4.1.1, a criterion WCAG 2.2
// removed. Compared on axe-core 4.14.
//
// axe cannot check 2.4.11 (focus not obscured) or 2.5.7 (dragging): those are in
// wcag22.spec.ts, with a hands-on 2.5.8 check of the dock, pills and form.
// =============================================================================

const WCAG_22_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

for (const colorScheme of ['light', 'dark'] as const)
  test.describe(`Accessibility: no axe violations, ${colorScheme}`, () => {
    // ThemeBoot follows the device when no choice has been made.
    test.use({ colorScheme });
    for (const route of routes) {
      test(`${route} passes axe`, async ({ page }) => {
        await page.goto(route, { waitUntil: 'domcontentloaded' });
        // Settle fonts + reveal content (no half-faded text) so axe audits the
        // real, fully-rendered page; mid-transition opacity produces false
        // color-contrast violations.
        await settle(page);
        // The spring-placed cards (home hand, About fan) are measured where they rest.
        await springsAtRest(page);
        const results = await new AxeBuilder({ page }).withTags(WCAG_22_AA).analyze();
        // The one carve-out. The home hand deals its cards turned a few degrees each, and axe's
        // `target-size` measures the boxes around them, not the turned cards, so it reads a card
        // that shows a 30px strip as a 5px one. Those cards, and only for that rule, are checked by
        // real hit-testing in wcag22.spec.ts ("every card in the home hand"), which is stricter.
        for (const v of results.violations.filter((x) => x.id === 'target-size')) {
          const inHand = await page.evaluate(
            (sels) => sels.map((s) => !!document.querySelector(s)?.matches('[data-grid] .tile')),
            v.nodes.map((n) => String(n.target[0])),
          );
          v.nodes = v.nodes.filter((_, i) => !inHand[i]);
        }
        const violations = results.violations.filter((v) => v.nodes.length);
        expect(
          violations,
          violations
            .map((v) => {
              const targets = v.nodes.map((n) => n.target.join(' ')).join(', ');
              return `[${v.impact ?? 'unknown'}] ${v.id}: ${v.help}\n    selectors: ${targets}`;
            })
            .join('\n'),
        ).toEqual([]);
      });
    }
  });
