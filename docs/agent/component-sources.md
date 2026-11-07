# Component sources

This site has no component library. The November 2026 redesign removed shadcn/ui, Radix, Starwind, PrimeReact and the Magic UI and Aceternity blocks (earlier removals are in git history), along with React and Tailwind. Everything is plain `.astro` markup, plain CSS and small scripts.

When you need a new UI element, work down this list and stop at the first option that fits:

1. **An existing component in `src/components/`** (or `src/components/study/` for a case-study block). The list is in `.claude/rules/components.md`.
2. **Native HTML.** `<details>` for a fold, `<dialog>` for a modal, `<input type="range">` for a slider, `<button>` and `<a>` for everything clickable. They bring keyboard and screen-reader behaviour for free.
3. **A new component** in `src/components/`, with a header comment saying what it is for, styled from the `:root` tokens in `src/styles/kit.css` (or in the page's own file in `src/styles/pages/` when only one page uses it), and following `DESIGN.md`: a card is lettered in two corners, a list is ruled with hairlines, motion is a spring with a reduced-motion answer.

Adding a dependency is a separate decision. Pause and ask Nathan first: the shipped JavaScript is a few small files, and the page weight budget (`tests/page-weight.config.json`) is tight.

For design inspiration the references are in `PRODUCT.md` and the motion lab's "Deal" README (`ncs-wall/lab/README.md`), not in a component catalogue.
