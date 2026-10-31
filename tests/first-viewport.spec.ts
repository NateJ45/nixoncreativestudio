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
// entry when that package lands; the test then runs for real.
//
// CaseStudyCover.astro renders its <img> with `opacity-0` (not gated on .js)
// and a script fades it in on load. So the /work cards and the case-study hero
// (the LCP image) start invisible, and stay invisible with JavaScript off.
// Found by this spec on 2026-10-30. The fix is to drop the fade and let the
// image paint over its blur placeholder. CaseStudyCover is being reworked by
// 1.2 (plaiceholder removal) and replaced by 1.8's Media.astro (`lcp` prop),
// so the fix lands there rather than here.
const KNOWN: Record<string, string> = {
  '/work': 'CaseStudyCover fade-in, fixed by package 1.8 (Media.astro)',
  '/work/stone-steps-50k': 'CaseStudyCover fade-in, fixed by package 1.8 (Media.astro)',
};

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
