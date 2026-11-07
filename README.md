# Nixon Creative Studio

**Web design, photography, and brand strategy for organizations that do real work in the world.** Churches, schools, nonprofits, and small businesses. Based in Cincinnati, Ohio; design and strategy for clients anywhere, photography across the region.

**Live:** [nixoncreativestudio.com](https://nixoncreativestudio.com)

This repository is the studio's own site. It is also, on purpose, a portfolio piece: the same stack, standards, and attention that go into client work went into this.

---

## How the studio works

Most of my clients are running something that matters to a community and cannot afford for the website to be a second job. A church office. A one-woman embroidery studio. A volunteer nonprofit board that turns over every year. So the work is built around a simple promise: **you get a site that looks like it was made for you, and you can keep it current without touching code.**

Three things, usually in this order:

- **Brand strategy**: the name, voice, palette, and typography that make an organization look like itself and not like a template.
- **Web design and build**: fast, accessible, editor-friendly sites on a modern stack (Astro + Sanity + Cloudflare). Every word and image is editable in a friendly CMS; nothing important is trapped in the code.
- **Photography**: real photographs of real places and people, because the fastest way to look generic is to fill a site with stock.

## Selected work

Each of these is a full case study in its own repository. Together they are a fair picture of the range: an interior designer, a custom-embroidery studio, a historic city church, and a new theological school.

| Project                      | What it is                                                                                                                                                        | Case study                                                      |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **Reid Design LLC**          | Marketing site for an Indiana interior design studio: posted prices, a scroll-built concept room, E-Design, and a consultation form with a room and style picker. | [reid-design-site](https://github.com/NateJ45/reid-design-site) |
| **MAS Monograms**            | A home-based custom embroidery studio. A quote-request pipeline instead of a cart, since every piece is priced by hand.                                           | [mas-monograms](https://github.com/NateJ45/mas-monograms)       |
| **The Presbyterian Academy** | A new Reformed lay-formation school: course catalog, faculty, terms, and tuition, with a bookish editorial identity.                                              | [presacademy](https://github.com/NateJ45/presacademy)           |

The client sites share a foundation I maintain as an open starter: **[ncs-astro-sanity-starter](https://github.com/NateJ45/ncs-astro-sanity-starter)** (small-business marketing sites) and **[ncs-church-starter](https://github.com/NateJ45/ncs-church-starter)** (churches). It is why a polished, production-grade site is an afternoon of setup instead of a month.

## The through-line

A few standards show up in every project, and they are the reason the sites hold up:

- **Editor-first.** The client owns their content. On a launched site, the CMS mirrors the live pages exactly, so a volunteer can change a headline, swap a photo, or add a page without me.
- **Accessible by default, not as a cleanup pass.** Real heading order, keyboard support, and color contrast that passes. Several of these sites hold a perfect Lighthouse accessibility score as a build gate.
- **Fast because it is static where it can be.** Pages are prerendered to HTML and served from the edge; interactivity is added in small, deliberate pieces.
- **Made, not assembled.** Hand-set type and color, real photography, and copy that sounds like a person. The goal is a site that could not be mistaken for anyone else's.

---

## How this site is built

- **[Astro 7](https://astro.build)** with TypeScript in strict mode, `output: 'static'`: every page is prerendered to HTML
- **Plain CSS**: one shared stylesheet (`src/styles/kit.css`, with the design tokens) plus one file per page. No Tailwind, no utility classes
- **One typeface**, Hanken Grotesk, self-hosted. One light theme, one studio blue; every other color on the site belongs to a client and stays inside their own window
- **Small plain scripts, no framework**: the deck of client windows, the closing, the client sheet and the form are real markup that a few scripts move. Motion is springs written in JavaScript, and it all stands down under reduced motion. Page changes are native cross-document view transitions, with no router
- **MDX content collections** for case studies and the journal; a JSON-backed collection for the photography set
- **[Cloudflare Workers](https://workers.cloudflare.com)** serving the static build as assets, plus Cloudflare Web Analytics (privacy-friendly, no cookies)
- **ESLint** + **Prettier** + `node --test` unit suites + Playwright and axe-core, run in **GitHub Actions** on every push and PR

The look is written down in [DESIGN.md](./DESIGN.md).

## Running it locally

```sh
npm install
npm run dev      # http://localhost:4321
```

See [CLAUDE.md](./CLAUDE.md) for the full conventions and architecture notes, and [DESIGN.md](./DESIGN.md) for the design system.

---

Nixon Creative Studio · Cincinnati, Ohio · [nixoncreativestudio.com](https://nixoncreativestudio.com)
