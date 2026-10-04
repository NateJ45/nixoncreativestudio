# Component sources

Where to find UI components for the NCS portfolio site, and the order to reach for them. Every source listed here is free unless marked otherwise, and every CLI-installed component lands inside the repo's semantic token system so brand colors propagate without extra wiring.

---

## Decision order

When you need a new UI element, work down this list and stop at the first option that fits:

1. **Existing components in `src/components/`** that already match this site's design. Check here first: the 2026 primitives (`Band`, `Frame`, `Logo`, the Button `brand` variant) are faster than anything external.
2. **Native HTML in an Astro component** (`<dialog>`, `<details>`, popover) with a few lines of script, as `MobileMenu.astro` does.
3. **A shadcn/ui primitive via the CLI.** Only `button.tsx` and `marquee.tsx` are installed now. The Starwind kit, PrimeReact and the other shadcn, Aceternity and Magic UI primitives were deleted in the 2026-10-04 performance pass: nothing used them, and because Tailwind scans every file under `src/`, their classes shipped in every page's inlined CSS. A CLI add usually adds a package, so ask Nathan first, and delete the component again if the page that wanted it goes away.
4. **Custom build** if nothing above fits. Keep it in `src/components/` and comment the file with `// Safe to edit` or `// Foundation, edit with care`.

---

## Wired-in sources with add commands

| Source             | What it is                                                | Add command                            | Lands in                   |
| ------------------ | --------------------------------------------------------- | -------------------------------------- | -------------------------- |
| shadcn/ui official | 400+ React primitives built on Radix                      | `npx shadcn add <name>`                | `src/components/ui/`       |
| Fulldev UI blocks  | Astro section blocks (hero, features, FAQ, CTA)           | `npx shadcn add @fulldev/<name>`       | `src/components/`          |
| Magic UI           | Animated React components (marquee, beam, bento, shimmer) | `npx shadcn add @magicui/<name>`       | `src/components/ui/`       |
| Starwind UI        | Astro-native primitives, zero React                       | `npx starwind@latest add <name> --yes` | `src/components/starwind/` |

### Adding a shadcn component

This repo's `components.json` sets `style: "radix-nova"`, CSS variables on, and the `@fulldev` registry. The CLI reads that automatically, so the add command is just:

```sh
npx shadcn add <component-name>
```

For example, `npx shadcn add tooltip` drops `src/components/ui/tooltip.tsx` already wired to the project's semantic tokens. No extra config needed.

Fulldev blocks use the same CLI:

```sh
npx shadcn add @fulldev/hero-1
```

Browse the full Fulldev catalog at [ui.full.dev](https://ui.full.dev).

### Starwind (not installed since 2026-10-04)

`npx starwind@latest add <name> --yes` reinstalls a Starwind primitive (it brings `tailwind-variants` and `@tabler/icons` back, and needs its `starwind.css` token mappings; see git history before 2026-10-04). Starwind components render as static Astro HTML with a tiny vanilla-JS attribute system, so the JS cost is near zero.

---

## Copy-paste sources (no CLI needed)

Browse, copy, token-remap, and drop into `src/components/`. Good for marketing-section layouts where you want full control of the markup.

| Source                                     | Best for                                                                         | License                                              |
| ------------------------------------------ | -------------------------------------------------------------------------------- | ---------------------------------------------------- |
| HyperUI (hyperui.dev/components/marketing) | Static sections, zero JS. Pure Tailwind HTML. Requires token remap at paste-in.  | MIT, no attribution required                         |
| Shadcnblocks free tier (shadcnblocks.com)  | 55 marketing blocks that use shadcn semantic tokens natively. Minimal remap.     | MIT free tier                                        |
| motion-primitives (motion-primitives.com)  | Scroll reveals, text/image transitions. Needs `motion` (uninstalled 2026-10-04). | MIT                                                  |
| react-bits (react-bits.dev)                | CSS-first effects: aurora, text-scramble, blur-in. Pick the Tailwind variant.    | MIT + Commons Clause (client work OK, cannot resell) |
| Animate UI                                 | Animated shadcn primitives using `motion` + Radix. Needs `motion` back.          | MIT                                                  |

---

## Token-remap cheat sheet

When pasting from HyperUI, Tailark, or any palette-first source, swap hardcoded color utilities for semantic tokens so the brand system propagates correctly.

| Hardcoded class                      | Semantic replacement                        | When                                           |
| ------------------------------------ | ------------------------------------------- | ---------------------------------------------- |
| `bg-white`                           | `bg-card` or `bg-background`                | card for elevated surface, background for page |
| `bg-gray-50`, `bg-gray-100`          | `bg-muted`                                  | quiet alternating surface                      |
| `text-gray-900`, `text-black`        | `text-foreground`                           | primary body/heading text                      |
| `text-gray-600`, `text-gray-500`     | `text-muted-foreground`                     | secondary / caption text                       |
| `text-blue-600`, `text-indigo-600`   | `text-primary`                              | brand action color                             |
| `bg-blue-600`, `bg-indigo-600`       | `bg-primary`                                | brand action background                        |
| `text-white` (on primary bg)         | `text-primary-foreground`                   | text on brand-colored surface                  |
| `border-gray-200`, `border-gray-300` | `border-border`                             | dividers, input borders                        |
| `ring-blue-500`, `ring-indigo-500`   | `ring-ring`                                 | focus rings                                    |
| Hex or oklch literals                | `var(--primary)`, `var(--foreground)`, etc. | SVG fill/stroke                                |

---

## Copy-in checklist

For every new component pasted or CLI-installed:

1. Note the source URL and any non-obvious token substitutions in a comment at the top of the file.
2. Remap hardcoded color classes using the cheat sheet above.
3. Decide: static `.astro` vs. React island. Static unless the component has state, event handlers, or needs `useEffect`. When in doubt: static.
4. If it's a React island, prefer `client:visible` (hydrates on scroll) over `client:load` (hydrates immediately). Exception: components above the fold that must be interactive on first paint (MobileNav, ThemeToggle).
5. For Radix-based dialogs, sheets, or dropdown portals: use `client:only="react"` not `client:load`. See the note in .claude/rules/components.md under "Radix-based primitives need `client:only='react'`".
6. Verify on the site's one theme (there is no dark mode since the 2026 redesign) before committing.

Example header comment:

```ts
// Source: https://shadcnblocks.com/block/hero-125 (free copy-paste)
// Token remaps: bg-slate-900 -> bg-background, text-indigo-500 -> text-primary
```

---

## PrimeReact (removed 2026-10-04)

PrimeReact was the escape hatch for complex behavior-heavy widgets with no Radix/shadcn equivalent (rich data tables, cascading selects, drag-drop upload, date-range pickers). Nothing used it, so the package and `src/components/primereact/` (provider wrapper, Tailwind passthrough, README) were deleted; git history before 2026-10-04 has them. Never use it for accordions, dialogs, dropdowns or tabs.

---

## Bundle-cost notes

- **Every file under `src/` costs CSS, used or not**: Tailwind scans it and the classes it names are inlined into every page. The kit removal on 2026-10-04 took about 37 KB raw (4.5 KB brotli) off each page's HTML.
- **Starwind UI**: near-zero JS. Components render as static Astro HTML; JS ships only for interactive ones and only when they're on the page.
- **motion-primitives, Animate UI, Magic UI, Aceternity**: need `motion` (about 30 KB+ of React-side JS per island), which is no longer installed. Prefer CSS animation.
- **PrimeReact**: 30-60 kB gzipped for a realistic widget set in unstyled mode. Worth it for DataTable or TreeSelect; not worth it for anything simpler.
- **Avoid Mantine, Chakra UI, Ant Design**: each requires its own context provider and a parallel CSS variable namespace invisible to this project's token system. Maintaining two parallel theme configs on every brand change is not worth it.
- **Avoid `framer-motion` imports**: some older Aceternity and Animata components import `framer-motion` instead of `motion/react`. With React 19 this causes peer-dep warnings. Import from `motion/react` instead.

---

## Paid options (not yet purchased, for reference)

| Option                              | Price                  | What it unlocks                                                                                                                                                   |
| ----------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shadcnblocks Pro (shadcnblocks.com) | $149 one-time lifetime | 1500+ marketing blocks, Figma kit, CLI registry via `npx shadcn add @shadcnblocks/<name>`. No token remap needed. Good ROI for a studio doing 3+ builds per year. |
| Tailark Essentials (tailark.com)    | $249 one-time          | Full 200+ block catalog via CLI, all marketing section types. Free open-source tier covers a subset.                                                              |
