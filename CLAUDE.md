# Nixon Creative Studio Portfolio

Astro portfolio for Nathan Nixon, sole owner of Nixon Creative Studio in West Chester, OH. Web design, photography, and brand strategy for preschools, churches, nonprofits, and small businesses in the Cincinnati region. Will live at nixoncreativestudio.com.

This is a one-person project. Nathan is the owner, the designer, the photographer, and the only person editing the repo. Build for a future Nathan who hasn't touched the code in three months.

---

## Strategy reference

All creative decisions trace back to the strategy doc:

`C:\Users\natha\Documents\Claude\Projects\Nixon Creative Studio Website\NCS-Website-Strategy.docx`

It documents the brand position, ten must-haves, page architecture, conversion strategy, and the reference site research (Brittany Chiang v4, Gianluca Gradogna, Elliott Mangham, Olia Gozha). Open it before any design call.

Related context lives in the sibling folder `C:\Users\natha\Documents\Claude\Projects\Nixon Creative Studio Website\`: the original HTML scaffold, the WordPress + Bricks build history, the 54-class BEM catalogue, and the nine Bricks gotchas. The Bricks-specific traps don't apply here, but the BEM names and the section architecture port directly.

---

## Stack

- **Astro 6.3.7** with MDX content collections for case studies
- **Plain CSS with BEM naming.** No CSS framework. No utility libraries. Tokens in `src/styles/tokens.css`, global resets and `@font-face` in `src/styles/global.css`, per-component styles in `src/styles/components/`.
- **Cloudflare Pages** for hosting. Build command `npm run build`, output `dist/`.

The point of moving off the WordPress + Bricks build was to own the stylesheet end to end. Keep it that way.

---

## Homepage architecture (locked, eight sections)

Numbered in this order in the rendered output. The numbers are the visual map for visitors.

1. **Hero**
2. **Selected work** (3 featured case studies)
3. **What I do** (3 service chapters)
4. **Selected photography** (full-bleed strip)
5. **How we work** (4-step process)
6. **Testimonials**
7. **CTA banner**
8. **Footer**

Don't reorder. Don't drop. If a section's content isn't ready yet, build a placeholder block in the right slot.

---

## Brand colors

Lives in `src/styles/tokens.css` as CSS custom properties. Reference via `var(--color-primary)`, etc. Never hardcode hex in component styles.

| Role | Hex |
|---|---|
| Primary (dark navy) | `#0A1628` |
| Accent (NCS blue) | `#3B82C4` |
| Secondary (sky blue) | `#40AAED` |
| Tertiary (amber) | `#FFA334` |
| Base text | `#1A1A1A` |
| Section background (ultra light) | `#F4F7FA` |
| Muted text | `#6B7280` |
| White | `#FFFFFF` |

---

## Typography

- **Headings (h1 through h6):** Bebas Neue, weight 400. Self-hosted.
- **Body, UI, buttons:** Source Sans 3 (variable font). Self-hosted.
- **Labels and section numbers:** `ui-monospace, 'SF Mono', monospace` (system, no file).

Font files belong in `src/assets/brand/fonts/` and load via `@font-face` in `src/styles/global.css` with `font-display: swap`.

---

## BEM naming

Classes follow `block`, `block__element`, `block--modifier`. The catalogue ported from the Bricks build:

`site-header`, `site-nav`, `page-hero`, `section-heading`, `case-card`, `services`, `service-chapter`, `photo-strip`, `process`, `process-step`, `testimonials`, `testimonial`, `cta-banner`, `site-footer`. Utility classes: `ncs-container` (content-width constraint) and `card-link` (CTA link with arrow).

Match these names when porting components. New components get new BEM blocks named after the visual role, not the implementation detail.

---

## Safe to edit vs do not touch

**Safe to edit by hand:**
- Text content inside `src/pages/*.astro` (everything outside the frontmatter, between the tags)
- MDX files in `src/content/case-studies/`
- Images in `src/assets/case-studies/`, `src/assets/photography/`, `src/assets/brand/`
- Copy strings and link `href` values in component files

**Do not touch by hand. Route through a planned change:**
- `src/styles/tokens.css` (design tokens: colors, type sizes, spacing scale)
- `src/styles/global.css` (resets and `@font-face`)
- `src/layouts/BaseLayout.astro` structure (header/footer slot wiring)
- BEM class names anywhere they appear. Renames need a coordinated update across `src/styles/components/` and every component file that uses them.
- `astro.config.mjs`, `package.json`, `tsconfig.json`

If a change requires editing the do-not-touch set, do it in a Claude session, write the change deliberately, and update this doc when the architecture shifts.

---

## Communication style (Nathan's preferences)

These apply to everything written here, in code comments, in PR descriptions, in commit messages, and in copy on the site itself:

- Warm, conversational tone. Not stiff or corporate.
- Step-by-step structure for any process or how-to.
- No em-dashes. Use commas, periods, colons, or restructure the sentence.
- No AI-tell phrases: delve, navigate (as a verb), leverage, robust, seamless, meticulous, tapestry, realm, landscape, testament to, ever-evolving, crucial, pivotal.
- No AI-tell sentence patterns: "It's not just X, it's Y," "Not only... but also," "It's important to note that," "When it comes to," "In the realm of," "That said" or "With that being said" as transitions.
- Don't open replies with filler like "Certainly!", "Absolutely!", "Great question!", or "I'd be happy to help."
- Don't close replies with "I hope this helps!" or "Let me know if you have any questions." End on the actual content.
- Avoid three-item lists where the third item is filler. Two items is fine if two is the truth.
- Comment code generously so future-Nathan can follow without reverse-engineering.
- Default explanations to a non-technical audience (preschool families, church volunteers, board members) unless the context is technical.

For copy on the actual site: "Modern websites for small businesses, nonprofits, churches, and schools in the Cincinnati region" beats "Bespoke digital experiences" every time.
