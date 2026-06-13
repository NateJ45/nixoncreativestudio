# SETUP — bootstrap a new Astro project on this stack

Step-by-step runbook for spinning up a new site on the same infrastructure as Nixon Creative Studio. Read straight through once before you start so the order makes sense, then follow the steps. Companion architecture doc lives at `CLAUDE.md` next to this file; copy that into the new repo's root once the scaffold is in place.

This runbook assumes you're running on Windows with PowerShell, Node 22+, and Git installed. Every command below works the same on macOS or Linux unless noted.

---

## Prereqs

- **Node 22.12 or newer.** Check with `node -v`. Astro 6 needs at least 22.12.
- **Git** with the GitHub CLI (`gh`) authenticated. `gh auth status` should print green.
- **A Cloudflare account** with Pages enabled. The free tier covers a portfolio comfortably.
- **A GitHub repo** for the project (can create it as part of the steps below).

---

## Step 1 — scaffold the Astro project

From the parent folder where you keep projects:

```powershell
npm create astro@latest my-new-site
```

When the wizard prompts:

- **Template:** Empty
- **TypeScript:** Yes, strict
- **Install dependencies:** Yes
- **Initialize git:** Yes

After it finishes:

```powershell
cd my-new-site
npm run dev
```

You should see the empty Astro welcome at `http://localhost:4321`. Stop the dev server.

---

## Step 2 — adjust tsconfig.json

Open `tsconfig.json` and replace it with:

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [
    ".astro/types.d.ts",
    "**/*",
    "./worker-configuration.d.ts"
  ],
  "exclude": [
    "dist"
  ],
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "react",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

The path alias is what lets shadcn install components at `@/components/ui/...` and have them resolve.

---

## Step 3 — install Astro integrations

```powershell
npx astro add mdx
npx astro add react
npx astro add sitemap
npx astro add cloudflare
```

Accept the defaults for each. They mutate `astro.config.mjs` as they install.

Then install the RSS helper (it isn't an integration, just a helper package):

```powershell
npm install @astrojs/rss
```

---

## Step 4 — wire Tailwind 4 via the Vite plugin

Tailwind 4 is *not* installed as an Astro integration; the official path is the Vite plugin.

```powershell
npm install -D @tailwindcss/vite tailwindcss
```

Edit `astro.config.mjs` so it looks like this (preserving whatever the integrations installed):

```js
// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://example.com', // replace with the real production URL
  output: 'static',
  adapter: cloudflare(),
  integrations: [mdx(), sitemap(), react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
```

There is no `tailwind.config.mjs` file with Tailwind 4. All theme tokens live in CSS.

---

## Step 5 — initialize shadcn/ui

```powershell
npx shadcn@latest init
```

When prompted:

- **Style:** New York (or radix-nova if you want the Nova preset NCS used)
- **Base color:** Neutral
- **CSS variables:** Yes
- **Tailwind config file:** leave blank (we're on Tailwind 4)
- **CSS file:** `src/styles/globals.css`
- **Import alias for components:** `@/components`
- **Import alias for utils:** `@/lib/utils`
- **Use RSC:** No

This creates `components.json` and a starter `src/lib/utils.ts`. It also writes a `@theme inline` block and a `:root` semantic token block into `globals.css`. We'll customize that file in step 9.

Install a starter set of primitives:

```powershell
npx shadcn@latest add button card input textarea label sheet dropdown-menu separator sonner
```

Then open `components.json` and add the `@fulldev` registry so you can pull Starwind-compatible blocks from it later. Find the `"registries"` key (or add it if the CLI didn't emit one) and make it look like this:

```json
{
  "style": "radix-nova",
  "registries": {
    "@fulldev": "https://ui.full.dev/r/{name}.json"
  }
}
```

The rest of `components.json` (aliases, tailwind config path, etc.) stays exactly as the CLI wrote it.

---

## Step 6 — install the remaining packages

These are the ones the NCS site uses beyond what's already in. Install them in one shot:

```powershell
npm install motion lenis next-themes plaiceholder sharp `
  react-photo-album yet-another-react-lightbox `
  tailwind-merge tw-animate-css class-variance-authority clsx `
  lucide-react @tabler/icons-react @tabler/icons sonner `
  primereact tailwind-variants `
  @fontsource-variable/source-sans-3 @fontsource/bebas-neue @fontsource-variable/geist
```

`@tabler/icons` gives you the raw SVG source that Astro 6 imports natively as components (no JS shipped). `@tabler/icons-react` stays for any React islands that need a Tabler icon. `primereact` is the unstyled escape hatch documented in Step 8 below. `tailwind-variants` is the variant helper Starwind primitives rely on.

Dev-only:

```powershell
npm install -D opentype.js wrangler
```

Pin Vite to v7 to dodge a Tailwind plugin compat quirk:

Open `package.json` and add at the bottom (above the closing brace):

```json
"overrides": {
  "vite": "^7"
}
```

Then run `npm install` once more so the override sticks.

---

## Step 7 — create the folder structure

From the project root:

```powershell
New-Item -ItemType Directory -Force src/assets, src/components, src/components/ui, `
  src/components/starwind, src/components/primereact, `
  src/content, src/data, src/layouts, src/lib, src/pages, `
  src/scripts, src/styles, scripts, public | Out-Null
```

Create empty content collection folders for whatever the project needs. For a portfolio:

```powershell
New-Item -ItemType Directory -Force src/content/case-studies, src/content/journal, src/content/photos | Out-Null
New-Item -ItemType File src/content/.gitkeep, src/content/case-studies/.gitkeep, src/content/journal/.gitkeep, src/content/photos/.gitkeep
```

---

## Step 8 — set up the UI component layer (Starwind + PrimeReact)

This stack has three layers of UI components on top of shadcn/ui. The decision order is:

1. **Existing components** in the repo, first.
2. **shadcn/ui primitives** (`src/components/ui/`) for headless Radix-backed stuff.
3. **Starwind** (`src/components/starwind/`) for Astro-native, zero-runtime-JS primitives: accordion, dialog, dropdown, tabs. Good for anything that's fully static.
4. **Aceternity / Magic UI** for motion flourishes only.
5. **PrimeReact** (`src/components/primereact/`) for heavy behavior-rich widgets only: data tables, file upload, complex date/range pickers, steppers. Not for accordions, dialogs, dropdowns, tabs, or marketing layout.
6. **Custom build** as a last resort.

### Starwind setup

Install Starwind via the shadcn CLI (it publishes to the shadcn registry):

```powershell
npx shadcn@latest add "https://starwind.dev/r/accordion"
npx shadcn@latest add "https://starwind.dev/r/dialog"
npx shadcn@latest add "https://starwind.dev/r/dropdown"
npx shadcn@latest add "https://starwind.dev/r/tabs"
```

Each command drops an `.astro` file into `src/components/starwind/`. Add others as you need them.

Create `starwind.config.json` at the project root:

```json
{
  "componentsDir": "src/components/starwind"
}
```

Create `src/styles/starwind.css`. This file holds the accordion open/close keyframes and any `@theme` mappings for Starwind-only tokens (`--outline`, status colors like `--color-success`, `--color-warning`, `--color-error`, `--color-info`). Copy it from the NCS reference at `src/styles/starwind.css`. A minimal starter looks like:

```css
/* Starwind supplementary tokens and keyframes.
   Import this in BaseLayout AFTER globals.css. */

@theme {
  --outline: 2px solid var(--color-accent);
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error:   #ef4444;
  --color-info:    #3b82f6;
}

@keyframes starwind-accordion-down {
  from { height: 0; opacity: 0; }
  to   { height: var(--starwind-accordion-content-height); opacity: 1; }
}

@keyframes starwind-accordion-up {
  from { height: var(--starwind-accordion-content-height); opacity: 1; }
  to   { height: 0; opacity: 0; }
}
```

You'll import this file in `BaseLayout.astro` as a `<link>` or `<style>` import AFTER globals.css. See the BaseLayout step (Step 13) for where it goes.

Tabler icons work as Astro SVG components in Astro 6. Import them directly:

```astro
import IconArrowRight from '@tabler/icons/icons/arrow-right.svg';

<IconArrowRight class="w-5 h-5" />
```

No React island needed for SVG-only icons in static Astro templates.

### PrimeReact setup

PrimeReact ships unstyled in this stack. Your `src/components/primereact/` folder needs three files:

- `PrimeIsland.tsx`: the React island wrapper. It applies a `PrimeReactProvider` with `unstyled={true}` and passes your `passthrough` object in, so every PrimeReact widget picks up Tailwind classes instead of PrimeReact's default stylesheet.
- `passthrough.ts`: the passthrough config that maps PrimeReact's internal DOM slots to Tailwind classes. Start sparse and add entries as you use widgets.
- `README.md`: documents when to reach for PrimeReact vs. shadcn vs. Starwind.

Copy all three from the NCS reference (`src/components/primereact/`). Adapt the passthrough classes to match the new project's palette.

**Do not** install the PrimeReact CSS themes or `primereact/resources/`. The unstyled + passthrough approach is the entire point.

---

## Step 9 — write globals.css

Open `src/styles/globals.css` (shadcn already created it). Replace its contents with the template below. The brand hex values are placeholders; swap them for the project's palette. Run contrast math for every token against every surface it appears on.

```css
@import "tailwindcss";
@import "@fontsource/bebas-neue/400.css";
@import "@fontsource-variable/source-sans-3";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));

@theme {
  /* Brand palette */
  --color-primary:   #0A1628;
  --color-accent:    #3478BD;
  --color-secondary: #40AAED;
  --color-tertiary:  #FFA334;

  --color-heading:    #0A1628;
  --color-text:       #1A1A1A;
  --color-text-muted: #6B7280;

  --color-bg:      #FFFFFF;
  --color-bg-soft: #F4F7FA;

  /* Fonts */
  --font-display: "Bebas Neue", system-ui, sans-serif;
  --font-body:    "Source Sans 3 Variable", system-ui, sans-serif;
  --font-mono:    ui-monospace, "SF Mono", Consolas, monospace;

  /* Fluid heading sizes */
  --text-h6: 1rem;
  --text-h5: clamp(1.125rem, 1.5vw, 1.25rem);
  --text-h4: clamp(1.25rem,  2vw,   1.5rem);
  --text-h3: clamp(1.5rem,   2.5vw, 2rem);
  --text-h2: clamp(2rem,     4vw,   3rem);
  --text-h1: clamp(2.5rem,   6vw,   5rem);

  /* Fluid spacing */
  --spacing-xs:  clamp(0.25rem, 0.5vw, 0.5rem);
  --spacing-s:   clamp(0.5rem,  1vw,   1rem);
  --spacing-m:   clamp(1rem,    2vw,   1.5rem);
  --spacing-l:   clamp(2rem,    4vw,   3rem);
  --spacing-xl:  clamp(3rem,    6vw,   5rem);
  --spacing-2xl: clamp(4rem,    8vw,   7rem);

  --container-content: 82.5rem;
}

/* Below this point: shadcn's @theme inline block (left in place by the CLI),
   the :root / .dark token blocks that override shadcn's defaults to point at
   the brand palette above, base styles, prefers-reduced-motion handling, and
   site-wide utilities (.container-content, .card-link, [data-hidden]).
   Open the NCS globals.css for the full reference. */
```

Reference the full NCS `src/styles/globals.css` for the rest (base layer, motion handling, utility classes). Copy what's general and replace any NCS-specific brand naming with the new project's names.

---

## Step 10 — create the data module

Create `src/data/site.ts`:

```ts
export const site = {
  name: "[Business Name]",
  studio: "[Studio Name]",
  tagline: "[One-line tagline]",
  domain: "example.com",
  email: "hello@example.com",
  phone: "+1 (555) 555-5555",
  address: {
    city: "[City]",
    region: "[State]",
    country: "US",
  },
  social: {
    instagram: "",
    linkedin: "",
    github: "",
  },
  // Optional: set these to enable the matching scaffold
  bookingUrl: "",       // Cal.com or Calendly URL
  newsletterUrl: "",    // Buttondown publish URL
} as const;
```

Every component that needs contact info imports from `@/data/site`. No hardcoded strings in components.

---

## Step 11 — write the placeholder generator script

Create `scripts/generate-placeholders.mjs`. Open the NCS version at `scripts/generate-placeholders.mjs` and copy it across. The shape is: read every cover image under `src/assets/case-studies/` (or whatever collection has covers), generate a base64 blur via plaiceholder, write the lot to `src/lib/coverPlaceholders.json` keyed by filename basename.

Then create `src/lib/coverPlaceholder.ts` as the typed lookup module:

```ts
import placeholders from "./coverPlaceholders.json";

const map = placeholders as Record<string, string>;

export function coverPlaceholder(slug: string): string | undefined {
  return map[slug];
}
```

Update `package.json` scripts:

```json
"scripts": {
  "dev": "astro dev",
  "build": "npm run placeholders && astro build",
  "preview": "npm run build && wrangler dev",
  "astro": "astro",
  "deploy": "npm run build && wrangler deploy",
  "placeholders": "node scripts/generate-placeholders.mjs",
  "og": "node scripts/generate-og-default.mjs",
  "test": "node --experimental-strip-types --test src/lib/*.test.ts",
  "lint": "eslint .",
  "lint:fix": "eslint . --fix",
  "format": "prettier --write .",
  "check": "npm run build && npm test"
}
```

The build chain runs the placeholder generator before `astro build` so the JSON exists when the prerender worker reads it. `check` runs build then test together, which is also what CI uses. `lint` is advisory only (run it locally and on PRs, but don't gate CI on it) because eslint-plugin-astro currently throws a false parse error on valid Astro files that use an HTML comment inside a `{...}` expression. See Step 18 for the full DX/CI setup.

---

## Step 12 — write the OG image generator

Create `scripts/generate-og-default.mjs`. Copy the NCS version, swap the inputs block (tagline, wordmark, brand colors) for the new project. Output goes to `public/og-default.png`.

Run it once to seed the file:

```powershell
npm run og
```

Commit the generated PNG to the repo. It's a real asset shipped to visitors, not a transient build artifact.

---

## Step 13 — write BaseLayout.astro

Create `src/layouts/BaseLayout.astro`. Copy the structure from the NCS BaseLayout and adapt for the new project. The pieces that matter:

1. `<!doctype html>` with `<html lang="en">`
2. An inline `<script>` in `<head>` (runs before first paint) that reads `localStorage["[project]-theme"]` and `prefers-color-scheme`, applies `.dark` class on `<html>` if needed, sets inline `color-scheme` style.
3. A second inline script in `<head>` for the coming-soon gate logic (reads `localStorage["[project]-preview"]` or `?preview=<TOKEN>` URL param, toggles `html.[project]-gated`).
4. Font preload `<link>` tags for whichever face is your LCP element.
5. OG meta and JSON-LD slots.
6. Cloudflare Analytics beacon (conditional on `PUBLIC_CF_ANALYTICS_TOKEN`).
7. `<ClientRouter />` for View Transitions.
8. `<a href="#main" class="...">Skip to main content</a>` as the first focusable element.
9. `<Header />`, `<main id="main">{slot}</main>`, `<Footer />`.
10. Lenis init script tag (with `prefers-reduced-motion` guard) at the bottom.
11. `<BackToTop client:load />` floating once site-wide.

The `<head>` section imports two stylesheets. Order matters: `globals.css` first, then `starwind.css`. In Astro this looks like:

```astro
---
import '@/styles/globals.css';
import '@/styles/starwind.css';
---
```

`starwind.css` must come after `globals.css` because its `@theme` block adds Starwind-only tokens (like `--outline` and the status colors) that sit on top of the base token system, not inside it.

Pass `title`, `description`, `schemas`, and an `ogImage` prop through every page that uses the layout.

---

## Step 14 — write the env templates

Create `.env.example` at the project root:

```
# Contact form
PUBLIC_WEB3FORMS_KEY=

# Analytics
PUBLIC_CF_ANALYTICS_TOKEN=

# Coming-soon gate
PUBLIC_COMING_SOON=
PUBLIC_PREVIEW_TOKEN=
```

Copy it to `.env` and fill in real values for local dev. Add `.env` to `.gitignore` if it isn't already.

---

## Step 15 — write the Cloudflare headers file

Create `public/_headers` and copy the contents from the NCS version verbatim. The five site-wide security headers (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Cross-Origin-Opener-Policy) apply to every static portfolio without further tuning.

---

## Step 16 — write the wrangler config

Create `wrangler.jsonc` at the root. It tells the Cloudflare CLI how to build and deploy:

```jsonc
{
  "name": "my-new-site",
  "compatibility_date": "2025-01-01",
  "pages_build_output_dir": "./dist",
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS",
    "not_found_handling": "404-page"
  }
}
```

Adjust `name` to match the Cloudflare Pages project. `compatibility_date` can be the day you set the project up.

---

## Step 17 — connect Cloudflare Pages

In the Cloudflare dashboard:

1. **Workers & Pages → Create application → Pages → Connect to Git.**
2. Pick the GitHub repo. Authorize Cloudflare if you haven't before.
3. Production branch: `main`.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Save and deploy.

Once the first build is green, go back into **Settings → Variables and Secrets** (Build section) and add the four env vars from step 14. Trigger a redeploy so the build picks them up.

For the production domain: **Custom domains → Set up a custom domain**. Cloudflare walks the DNS through automatically if the domain's nameservers are already pointed at Cloudflare.

---

## Step 18 — set up the DX / CI layer

### ESLint (flat config)

Install:

```powershell
npm install -D eslint @eslint/js typescript-eslint eslint-plugin-astro `
  eslint-plugin-jsx-a11y @typescript-eslint/parser
```

Create `eslint.config.js` at the project root. Copy the NCS version from `eslint.config.js`. It configures flat config with TypeScript, Astro, and a11y rules. The key things to carry over: the `ignores` array (dist, .astro, node_modules), the TypeScript recommended rules, the Astro plugin rules, and the a11y plugin rules.

A known issue: eslint-plugin-astro throws a false "JSX expressions must have one parent element" parse error on valid `.astro` files where an HTML comment `<!-- -->` sits inside a `{...}` expression. This is a parser bug, not your code. For this reason lint runs are advisory only, not CI-gated. Run `npm run lint` locally and fix real issues; skip false positives with `// eslint-disable-next-line` if needed.

### Prettier

Install:

```powershell
npm install -D prettier prettier-plugin-astro prettier-plugin-tailwindcss
```

Create `.prettierrc` at the project root:

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "all",
  "printWidth": 100,
  "plugins": ["prettier-plugin-astro", "prettier-plugin-tailwindcss"],
  "overrides": [
    {
      "files": "*.astro",
      "options": { "parser": "astro" }
    }
  ]
}
```

Create `.prettierignore` at the project root:

```
dist/
.astro/
node_modules/
src/lib/coverPlaceholders.json
public/
```

### Unit tests

Unit test suites live in `src/lib/*.test.ts`. They run with Node's built-in test runner (no Jest, no Vitest):

```powershell
npm test
# or directly:
node --experimental-strip-types --test src/lib/*.test.ts
```

Start with a test file for any pure utility functions you write in `src/lib/`. The NCS repo has examples in `src/lib/coverPlaceholder.test.ts` and `src/lib/utils.test.ts`.

### GitHub Actions CI

Create `.github/workflows/ci.yml`. This is the full file:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Use Node 22
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Test
        run: npm test
```

CI runs install, build, and test. Lint is not in the CI job because of the eslint-plugin-astro false positive described above. Run lint locally before merging.

---

## Step 19 — drop in the CLAUDE.md template

Copy `CLAUDE.md` from this folder to the new project's root. Open it and replace every `[bracketed placeholder]`:

- `[Project Name]`, `[domain]`, `[project-key]`, `[project]`
- The "About this project" paragraph
- The page architecture section (lock in your sections in render order)
- The brand colors table (with real hex values)
- The typography section (with the actual typefaces)
- The audience section
- The setup checklist at the bottom (cross off items as you ship them)

Commit and push.

---

## Step 20 — verify the build

From the project root:

```powershell
npm run build
```

You should see `npm run placeholders` run first (writing `src/lib/coverPlaceholders.json` even if it's an empty `{}`), then `astro build` produce `dist/`.

Then:

```powershell
npm run preview
```

This builds and serves via `wrangler dev`, which is closer to the real Cloudflare runtime than `astro preview`. Confirm the homepage loads, the theme toggle cycles light/dark/system, and the contact form (if wired) submits cleanly to Web3Forms.

Run Lighthouse on the homepage. Targets:

- Performance: 95+
- Accessibility: 100
- Best Practices: 100
- SEO: 100

---

## You're set

From here, work follows the patterns in `CLAUDE.md`:

- Components in `src/components/`, shadcn primitives in `src/components/ui/`, Starwind primitives in `src/components/starwind/`, PrimeReact islands in `src/components/primereact/`.
- Content as MDX in `src/content/<collection>/`. Schema in `src/content.config.ts`.
- Brand tokens via the `@theme` block in `globals.css`. Starwind-only tokens in `starwind.css`. No hardcoded hex in component code.
- Anything dynamic in a React island. Anything static in an Astro file. PrimeReact only for behavior-rich widgets with no shadcn/Starwind equivalent.
- Run `npm test` after adding utility functions. Run `npm run lint` before merging. Run Lighthouse before merging anything that touches a page.

If you hit a piece that wasn't covered above, the NCS source repo is the reference. Most of what's worth borrowing lives in `src/layouts/BaseLayout.astro`, `src/styles/globals.css`, `src/styles/starwind.css`, and the two scripts in `scripts/`.
