# Component sources

Where to find UI components for the NCS portfolio site, and the order to reach for them. Every source listed here is free unless marked otherwise, and every CLI-installed component lands inside the repo's semantic token system so brand colors propagate without extra wiring.

---

## Decision order

When you need a new UI element, work down this list and stop at the first option that fits:

1. **Existing components in `src/components/`** that already match this site's design. Check here first. Re-using `SectionHeading.astro`, `CaseStudyCover.astro`, or the Button `brand` variant is faster than reaching for anything external.
2. **shadcn/ui primitives** in `src/components/ui/` (already installed), or a new one via the CLI. Best for interactive React-based UI: dialogs, sheets, dropdowns, inputs, badges.
3. **Starwind UI** for Astro-native primitives. Accordion, dialog, dropdown, and tabs are already installed in `src/components/starwind/`. Use Starwind when the component can be 100% static Astro with zero React dependency.
4. **Magic UI or Aceternity** for motion flourishes. Marquee, animated-beam, bento-grid, and spotlight are already in `src/components/ui/`. Browse [magicui.design](https://magicui.design) for the full Magic UI catalog; browse [ui.aceternity.com](https://ui.aceternity.com) for Aceternity blocks.
5. **PrimeReact** (unstyled escape hatch) for complex behavior-heavy widgets only. See `src/components/primereact/README.md` for when this is warranted and how to wire it.
6. **Custom build** if nothing above fits. Keep it in `src/components/` and comment the file with `// Safe to edit` or `// Foundation, edit with care`.

---

## Wired-in sources with add commands

| Source | What it is | Add command | Lands in |
|---|---|---|---|
| shadcn/ui official | 400+ React primitives built on Radix | `npx shadcn add <name>` | `src/components/ui/` |
| Fulldev UI blocks | Astro section blocks (hero, features, FAQ, CTA) | `npx shadcn add @fulldev/<name>` | `src/components/` |
| Magic UI | Animated React components (marquee, beam, bento, shimmer) | `npx shadcn add @magicui/<name>` | `src/components/ui/` |
| Starwind UI | Astro-native primitives, zero React | `npx starwind@latest add <name> --yes` | `src/components/starwind/` |

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

### Starwind primitives already installed

`src/components/starwind/` contains: accordion, dialog, dropdown, tabs. Add more:

```sh
npx starwind@latest add <name> --yes
```

Browse [starwind-ui.com](https://starwind-ui.com) for the full list. Starwind components render as static Astro HTML. Interactivity (open/close) is handled with a tiny vanilla-JS Alpine-style attribute system, not React, so the bundle cost is near zero.

---

## Copy-paste sources (no CLI needed)

Browse, copy, token-remap, and drop into `src/components/`. Good for marketing-section layouts where you want full control of the markup.

| Source | Best for | License |
|---|---|---|
| HyperUI (hyperui.dev/components/marketing) | Static sections, zero JS. Pure Tailwind HTML. Requires token remap at paste-in. | MIT, no attribution required |
| Shadcnblocks free tier (shadcnblocks.com) | 55 marketing blocks that use shadcn semantic tokens natively. Minimal remap. | MIT free tier |
| motion-primitives (motion-primitives.com) | Scroll reveals, text/image transitions. Uses `motion` (already installed). | MIT |
| react-bits (react-bits.dev) | CSS-first effects: aurora, text-scramble, blur-in. Pick the Tailwind variant. | MIT + Commons Clause (client work OK, cannot resell) |
| Animate UI | Animated shadcn primitives using `motion` + Radix. Zero new deps. | MIT |

---

## Token-remap cheat sheet

When pasting from HyperUI, Tailark, or any palette-first source, swap hardcoded color utilities for semantic tokens so the brand system propagates correctly.

| Hardcoded class | Semantic replacement | When |
|---|---|---|
| `bg-white` | `bg-card` or `bg-background` | card for elevated surface, background for page |
| `bg-gray-50`, `bg-gray-100` | `bg-muted` | quiet alternating surface |
| `text-gray-900`, `text-black` | `text-foreground` | primary body/heading text |
| `text-gray-600`, `text-gray-500` | `text-muted-foreground` | secondary / caption text |
| `text-blue-600`, `text-indigo-600` | `text-primary` | brand action color |
| `bg-blue-600`, `bg-indigo-600` | `bg-primary` | brand action background |
| `text-white` (on primary bg) | `text-primary-foreground` | text on brand-colored surface |
| `border-gray-200`, `border-gray-300` | `border-border` | dividers, input borders |
| `ring-blue-500`, `ring-indigo-500` | `ring-ring` | focus rings |
| Hex or oklch literals | `var(--primary)`, `var(--foreground)`, etc. | SVG fill/stroke |

---

## Copy-in checklist

For every new component pasted or CLI-installed:

1. Note the source URL and any non-obvious token substitutions in a comment at the top of the file.
2. Remap hardcoded color classes using the cheat sheet above.
3. Decide: static `.astro` vs. React island. Static unless the component has state, event handlers, or needs `useEffect`. When in doubt: static.
4. If it's a React island, prefer `client:visible` (hydrates on scroll) over `client:load` (hydrates immediately). Exception: components above the fold that must be interactive on first paint (MobileNav, ThemeToggle).
5. For Radix-based dialogs, sheets, or dropdown portals: use `client:only="react"` not `client:load`. See the note in CLAUDE.md under "Radix-based primitives need `client:only='react'`".
6. Verify in both light and dark mode before committing.

Example header comment:

```ts
// Source: https://shadcnblocks.com/block/hero-125 (free copy-paste)
// Token remaps: bg-slate-900 -> bg-background, text-indigo-500 -> text-primary
```

---

## PrimeReact escape hatch

PrimeReact is the sanctioned option for complex behavior-heavy widgets that have no Radix/shadcn equivalent. Good candidates: rich data tables with sorting and pagination, cascading selects, file upload with drag-drop, complex date-range pickers.

Do NOT use PrimeReact for accordions, dialogs, dropdowns, tabs, or anything a static Astro component can render without JS.

Files in `src/components/primereact/`:

- `PrimeIsland.tsx` -- provider wrapper (unstyled mode enabled).
- `passthrough.ts` -- baseline Tailwind passthrough for Button, InputText, Dialog.
- `README.md` -- integration guide, usage example, and link to the community passthrough baseline covering 80+ components.

Installed version: `primereact` v10.9.8 (React 19 compatible).

---

## Bundle-cost notes

- **Starwind UI**: near-zero. Components render as static Astro HTML; JS ships only for interactive ones (accordion, dialog, dropdown) and only when they're on the page.
- **motion-primitives, Animate UI**: zero marginal cost. `motion` is already installed.
- **Magic UI, Aceternity**: zero marginal cost. `motion` and Radix are already in the bundle.
- **PrimeReact**: 30-60 kB gzipped for a realistic widget set in unstyled mode. Worth it for DataTable or TreeSelect; not worth it for anything simpler.
- **Avoid Mantine, Chakra UI, Ant Design**: each requires its own context provider and a parallel CSS variable namespace invisible to this project's token system. Maintaining two parallel theme configs on every brand change is not worth it.
- **Avoid `framer-motion` imports**: some older Aceternity and Animata components import `framer-motion` instead of `motion/react`. With React 19 this causes peer-dep warnings. Import from `motion/react` instead.

---

## Paid options (not yet purchased, for reference)

| Option | Price | What it unlocks |
|---|---|---|
| Shadcnblocks Pro (shadcnblocks.com) | $149 one-time lifetime | 1500+ marketing blocks, Figma kit, CLI registry via `npx shadcn add @shadcnblocks/<name>`. No token remap needed. Good ROI for a studio doing 3+ builds per year. |
| Tailark Essentials (tailark.com) | $249 one-time | Full 200+ block catalog via CLI, all marketing section types. Free open-source tier covers a subset. |
