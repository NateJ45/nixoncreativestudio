import { test, expect } from '@playwright/test';
import { routes } from './routes';

// =============================================================================
// First viewport: nothing the visitor sees first starts hidden
// =============================================================================
// Overhaul Part A, ruling 3: first-viewport media and H1s never take
// data-reveal. A heading or image that starts at opacity 0 (or clipped shut)
// waits on a script and a transition before it can paint, which delays Largest
// Contentful Paint and leaves a blank first screen when the script is slow.
//
// On every route, at 1440 and 320, straight after load (no settle(), no wait
// for reveals): every visible H1, image, picture, video, canvas, iframe and
// hero-reel card whose box touches the first viewport must have computed
// `opacity: 1` and `clip-path: none`, and so must every ancestor (an image
// inside an opacity-0 wrapper is just as hidden).
//
// Exempt: the hero ticker's inactive lines (Hero.astro). All the lines are
// stacked in one box and only the `is-active` one shows; the first renders
// active, so the rest starting at opacity 0 is the design, not a bug. The
// reel's hover-only feature tags (.reel-tag) are not checked: they are spans,
// not media, and only show on hover.
// =============================================================================

const CHECKED = 'h1, img, picture, video, canvas, iframe, .reel-stage, .reel-card, .ticker-item';
const EXEMPT = '.ticker-item:not(.is-active)';

// Known failures, one line each, with the package that fixes them. Remove the
// entry when that package lands; the test then runs for real. Empty since
// package 1.8 (2026-10-31) rebuilt CaseStudyCover on Media.astro, which never
// starts an image hidden.
const KNOWN: Record<string, string> = {};

const widths = [
  { width: 1440, height: 900 },
  { width: 320, height: 720 },
];

for (const viewport of widths) {
  test.describe(`First viewport at ${viewport.width}px`, () => {
    test.use({ viewport });

    for (const route of routes) {
      const declare = KNOWN[route] ? test.fixme : test;
      const title = `${route}: first-viewport H1s and media start fully shown`;
      declare(KNOWN[route] ? `${title} (${KNOWN[route]})` : title, async ({ page }) => {
        await page.goto(route, { waitUntil: 'load' });

        const hidden = await page.evaluate(
          ({ checked, exempt }) => {
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const describe = (el: Element) => {
              const id = el.id ? `#${el.id}` : '';
              const cls =
                typeof el.className === 'string' && el.className.trim()
                  ? `.${el.className.trim().split(/\s+/).slice(0, 3).join('.')}`
                  : '';
              return `${el.tagName.toLowerCase()}${id}${cls}`;
            };
            // Computed styles are cached per element: the reel's cards share
            // most of their ancestors, so this keeps the walk cheap.
            const seen = new Map<Element, string | null>();
            const problemOf = (el: Element): string | null => {
              if (seen.has(el)) return seen.get(el)!;
              const cs = getComputedStyle(el);
              let problem: string | null = null;
              if (parseFloat(cs.opacity) !== 1) problem = `opacity ${cs.opacity}`;
              else if (cs.clipPath !== 'none') problem = `clip-path ${cs.clipPath}`;
              seen.set(el, problem);
              return problem;
            };

            const failures: string[] = [];
            for (const el of document.querySelectorAll(checked)) {
              if (el.closest(exempt)) continue;
              const rect = el.getBoundingClientRect();
              if (rect.width === 0 || rect.height === 0) continue;
              if (rect.bottom <= 0 || rect.top >= vh || rect.right <= 0 || rect.left >= vw)
                continue;
              if (getComputedStyle(el).visibility === 'hidden') continue;

              for (let node: Element | null = el; node; node = node.parentElement) {
                const problem = problemOf(node);
                if (problem) {
                  const via = node === el ? '' : ` (on ancestor ${describe(node)})`;
                  failures.push(`${describe(el)}: ${problem}${via}`);
                  break;
                }
              }
            }
            return failures;
          },
          { checked: CHECKED, exempt: EXEMPT },
        );

        expect(
          hidden,
          `${route} at ${viewport.width}px: first-viewport elements that start hidden`,
        ).toEqual([]);
      });
    }
  });
}

// The case-study cover is the page's Largest Contentful Paint, so it must not
// wait in the lazy queue (overhaul package 1.8, Media.astro's `lcp` prop). One
// eager, high-priority image per study page, and it is the cover.
for (const route of routes.filter((r) => r.startsWith('/work/'))) {
  test(`${route}: the cover (LCP image) loads eagerly with high priority`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    const lcp = page.locator('.media[data-lcp] img');
    await expect(lcp).toHaveCount(1);
    await expect(lcp).toHaveAttribute('loading', 'eager');
    await expect(lcp).toHaveAttribute('fetchpriority', 'high');
  });
}

// =============================================================================
// No reveal waits part-faded for a scroll (overhaul 1.7)
// =============================================================================
// Reveals are scroll-driven CSS (animation-timeline: view()), so a block that
// straddles the fold at load would sit at, say, 16% opacity until the visitor
// scrolled. That is what Lighthouse saw on /photography (accessibility 0.96,
// colour contrast, 2026-10-31). motion.ts marks every reveal already on screen
// at load as done. Checked at Lighthouse's mobile size and at 1440.
// =============================================================================
for (const viewport of [
  { width: 412, height: 823 },
  { width: 1440, height: 900 },
]) {
  test.describe(`Reveals at load, ${viewport.width}px`, () => {
    test.use({ viewport, reducedMotion: 'no-preference' });
    for (const route of routes) {
      test(`${route}: no on-screen reveal is part-faded`, async ({ page }) => {
        await page.goto(route, { waitUntil: 'load' });
        await page.waitForTimeout(300);
        const partial = await page.evaluate(() =>
          [...document.querySelectorAll('[data-reveal]')]
            .filter((el) => el.getBoundingClientRect().top < window.innerHeight)
            .map((el) => ({ el, o: parseFloat(getComputedStyle(el).opacity) }))
            .filter(({ o }) => o < 1)
            .map(
              ({ el, o }) =>
                `${o.toFixed(2)} ${el.tagName.toLowerCase()}: ${(el.textContent ?? '').trim().slice(0, 40)}`,
            ),
        );
        expect(partial, `${route}: reveals on screen but not fully shown`).toEqual([]);
      });
    }
  });
}
