# Nixon Creative Studio

**Web design, photography, and brand strategy for organizations that do real work in the world.** Churches, schools, nonprofits, and small businesses. Based in Cincinnati, Ohio; design and strategy for clients anywhere, photography across the region.

**Live:** [nixoncreativestudio.com](https://nixoncreativestudio.com)

This repository is the studio's own site. It is also, on purpose, a portfolio piece: the same stack, standards, and attention that go into client work went into this.

---

## How the studio works

Most of my clients are running something that matters to a community and cannot afford for the website to be a second job. A church office. A one-woman embroidery studio. A volunteer nonprofit board that turns over every year. So the work is built around a simple promise: **you get a site that looks like it was made for you, and you can keep it current without touching code.**

Three things, usually in this order:

- **Brand strategy** — the name, voice, palette, and typography that make an organization look like itself and not like a template.
- **Web design and build** — fast, accessible, editor-friendly sites on a modern stack (Astro + Sanity + Cloudflare). Every word and image is editable in a friendly CMS; nothing important is trapped in the code.
- **Photography** — real photographs of real places and people, because the fastest way to look generic is to fill a site with stock.

## Selected work

Each of these is a full case study in its own repository. Together they are a fair picture of the range: an interior designer, a custom-embroidery studio, a historic city church, and a new theological school.

| Project                                   | What it is                                                                                                                                  | Case study                                                      |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **Reid Design LLC**                       | Marketing site for an Indiana interior design studio: portfolio with before/after sliders, a style-archetype quiz, and a budget calculator. | [reid-design-site](https://github.com/NateJ45/reid-design-site) |
| **MAS Monograms**                         | A home-based custom embroidery studio. A quote-request pipeline instead of a cart, since every piece is priced by hand.                     | [mas-monograms](https://github.com/NateJ45/mas-monograms)       |
| **Second Presbyterian Church of Chicago** | The website for a historic South Loop congregation, migrated off Squarespace onto a stack the office can run.                               | [2ndpreschicago](https://github.com/NateJ45/2ndpreschicago)     |
| **The Presbyterian Academy**              | A new Reformed lay-formation school: course catalog, faculty, terms, and tuition, with a bookish editorial identity.                        | [presacademy](https://github.com/NateJ45/presacademy)           |

The client sites share a foundation I maintain as an open starter: **[ncs-astro-sanity-starter](https://github.com/NateJ45/ncs-astro-sanity-starter)** (small-business marketing sites) and **[ncs-church-starter](https://github.com/NateJ45/ncs-church-starter)** (churches). It is why a polished, production-grade site is an afternoon of setup instead of a month.

## The through-line

A few standards show up in every project, and they are the reason the sites hold up:

- **Editor-first.** The client owns their content. On a launched site, the CMS mirrors the live pages exactly, so a volunteer can change a headline, swap a photo, or add a page without me.
- **Accessible by default, not as a cleanup pass.** Real heading order, keyboard support, and color contrast that passes. Several of these sites hold a perfect Lighthouse accessibility score as a build gate.
- **Fast because it is cached at the edge.** Every page is rendered on Cloudflare and then served from a cache close to the visitor, and a publish in the editor clears the right pages at once; interactivity is added in small, deliberate pieces.
- **Made, not assembled.** Hand-set type and color, real photography, and copy that sounds like a person. The goal is a site that could not be mistaken for anyone else's.

---

## How this site is built

- **[Astro 6](https://astro.build)** with TypeScript in strict mode, `output: 'server'` with Cloudflare's route cache
- **[Tailwind 4](https://tailwindcss.com)** via the Vite plugin; the design system is `DESIGN.md`, its tokens in `src/styles/globals.css`
- **React 19** islands only where they earn it: the photo gallery and lightbox, the CopyEmail copy button (not on /contact any more), the work filter (the header, phone menu and footer carry no React)
- **EmDash CMS** (D1 and R2 on Cloudflare) for case studies, the journal and the photography set; no Astro content collections
- **[Motion](https://motion.dev)** + Astro View Transitions (native scrolling, no smooth-scroll library) for soft page-to-page navigation
- Astro components and native HTML for the interface (the phone menu is a native `<dialog>`), with the **shadcn/ui** Button; React islands only for the photo gallery, the testimonial carousel and a few small widgets
- **[Cloudflare Pages](https://pages.cloudflare.com)** hosting + Cloudflare Web Analytics (privacy-friendly, no cookies)
- **ESLint** + **Prettier** + `node --test` unit suites, run in **GitHub Actions** on every push and PR

## Running it locally

```sh
npm install
npm run dev      # http://localhost:4321
```

See [CLAUDE.md](./CLAUDE.md) for the full conventions, brand decisions, and architecture notes.

---

Nixon Creative Studio · Cincinnati, Ohio · [nixoncreativestudio.com](https://nixoncreativestudio.com)
