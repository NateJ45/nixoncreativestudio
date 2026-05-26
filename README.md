# Nixon Creative Studio

Astro portfolio for Nathan Nixon, sole owner of Nixon Creative Studio
in West Chester, Ohio. Web design, photography, and brand strategy for
preschools, churches, nonprofits, and small businesses in the
Cincinnati region. Lives at
[nixoncreativestudio.com](https://nixoncreativestudio.com).

For context on the project (audience, brand decisions, conventions,
communication style), read [CLAUDE.md](./CLAUDE.md) before touching
the code.


## Stack

- **Astro 6** with TypeScript in strict mode and `output: 'static'`
- **Tailwind 4** via the Vite plugin, brand tokens declared in
  `@theme` blocks inside `src/styles/globals.css`
- **shadcn/ui** primitives in `src/components/ui/`, plus Aceternity UI
  (bento-grid, spotlight) and Magic UI (marquee, animated-beam) blocks
- **React 19** islands for anything interactive (mobile nav drawer,
  contact form handler, photo gallery + lightbox)
- **MDX content collections** for case studies and a JSON-backed
  collection for photography entries
- **Motion** library (formerly Framer Motion), **Lenis** smooth
  scroll, **Astro View Transitions** for soft page-to-page navigation
- **react-photo-album** + **yet-another-react-lightbox** (Zoom +
  Thumbnails plugins) + **sharp** for the photography page
- **Web3Forms** for the contact form, **Cloudflare Web Analytics** for
  privacy-friendly traffic measurement
- **Cloudflare Pages** for hosting, GitHub for version control


## Local dev

Requires Node 22+ (see `engines` in `package.json`).

```sh
npm install
npm run dev        # localhost:4321 (or the next free port)
```

Other commands:

```sh
npm run build      # production build into dist/
npm run preview    # build + serve with wrangler dev
npm run deploy     # build + wrangler deploy (only run from main)
```

Two environment variables drive the contact form and analytics. Both
are documented in [`.env.example`](./.env.example); copy to `.env` and
fill in real values, or set them in Cloudflare Pages settings for
production.

| Variable | Source |
|---|---|
| `PUBLIC_WEB3FORMS_KEY` | [web3forms.com](https://web3forms.com/) |
| `PUBLIC_CF_ANALYTICS_TOKEN` | Cloudflare → Analytics & Logs → Web Analytics |


## Project layout

```text
src/
├── assets/             # source images that Astro optimizes at build time
├── components/         # site-wide components (Header, Footer, Hero, ...)
│   └── ui/             # shadcn primitives + Aceternity + Magic UI blocks
├── content/            # MDX case studies + JSON photo entries
├── content.config.ts   # schema for both collections
├── data/site.ts        # single source of truth for contact info
├── layouts/            # BaseLayout.astro
├── pages/              # routes (homepage, about, work, contact, ...)
├── scripts/            # client-side modules (Lenis init)
└── styles/globals.css  # Tailwind + brand tokens + base styles

public/
├── _headers            # Cloudflare Pages security response headers
├── robots.txt          # allow all, point at sitemap-index.xml
├── favicon.svg
└── favicon.ico
```


## Deployment

Cloudflare Pages watches the GitHub repository:

- **Push to `main`**: triggers a production deploy. The site at
  [nixoncreativestudio.com](https://nixoncreativestudio.com) updates
  within about a minute.
- **Push to any other branch**: triggers a preview deploy at a unique
  `*-nixoncreativestudio.nathanjnixon86.workers.dev` URL. Useful for
  side-by-side comparison before merging.

Build command: `npm run build`. Output directory: `dist/`.

Two env vars must be set in Cloudflare Pages → Settings → **Build** →
Variables and secrets (the build section, not the runtime section):
`PUBLIC_WEB3FORMS_KEY` and `PUBLIC_CF_ANALYTICS_TOKEN`. Without them,
the contact form and analytics gracefully no-op rather than break.


## What's safe to edit by hand vs. ask Claude

See the "Safe to edit by hand" and "Foundation, edit with care"
sections at the bottom of [CLAUDE.md](./CLAUDE.md). Short version:
text content, MDX, images, copy strings, and Tailwind utility classes
on existing components are safe. Anything in `tailwind.config.mjs`-
like territory (theme tokens in `globals.css`), `BaseLayout.astro`
structure, shadcn primitives in `src/components/ui/`, and
`astro.config.mjs` should go through a planned Claude session.
