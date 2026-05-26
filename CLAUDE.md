# Nixon Creative Studio Portfolio

Astro portfolio for Nathan Nixon, sole owner of Nixon Creative Studio in West Chester, OH. Web design, photography, and brand strategy for preschools, churches, nonprofits, and small businesses in the Cincinnati region. Will live at nixoncreativestudio.com.

This is a one-person project. Nathan is the owner, the designer, the photographer, and the only person editing the repo. Build for a future Nathan who hasn't touched the code in three months.

Reid Design LLC is a separate business entity. Do not conflate it with Nixon Creative Studio.

---

## Strategy reference

All creative decisions trace back to the strategy doc:

`C:\Users\natha\Documents\Claude\Projects\Nixon Creative Studio Website\NCS-Website-Strategy.docx`

It documents the brand position, ten must-haves, page architecture, conversion strategy, and the reference site research (Brittany Chiang v4, Gianluca Gradogna, Elliott Mangham, Olia Gozha). Open it before any design call.

Related context lives in the sibling folder `C:\Users\natha\Documents\Claude\Projects\Nixon Creative Studio Website\`: the original HTML scaffold, the WordPress + Bricks build history, and the architectural notes. The Bricks-specific traps don't apply here, but the section architecture and brand work port directly.

---

## Stack

- Astro 6.3.7 with TypeScript in strict mode
- MDX content collections for case studies
- Tailwind CSS for styling
- React islands for interactive components only (Astro components for everything static)
- shadcn/ui as the component foundation for primitives
- Aceternity UI for motion-rich blocks (hero sections, bento grids, parallax)
- Magic UI for smaller flourishes (marquee, animated text)
- Motion (formerly Framer Motion) for animations
- Astro View Transitions for page transitions
- Lenis for smooth scrolling
- react-photo-album for justified gallery layouts on the photography page
- yet-another-react-lightbox for fullscreen photo viewing (with zoom and thumbnails plugins)
- plaiceholder for blur-up image placeholders
- Cloudflare Pages for hosting (build command `npm run build`, output `dist/`)
- GitHub for version control

---

## Homepage architecture (locked, eight sections)

Numbered in this order in the rendered output. The numbers are the visual map for visitors.

1. Hero
2. Selected work (3 featured case studies)
3. What I do (3 service chapters)
4. Selected photography (full-bleed strip)
5. How we work (4-step process)
6. Testimonials
7. CTA banner
8. Footer

Don't reorder. Don't drop. If a section's content isn't ready yet, build a placeholder block in the right slot.

---

## Brand colors

Defined in `tailwind.config.mjs` under `theme.extend.colors`. Reference via utility classes (`bg-primary`, `text-accent`, `border-secondary`) rather than hardcoded hex anywhere in component code.

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

- Headings (h1 through h6): Bebas Neue, weight 400. Self-hosted via `@fontsource/bebas-neue`.
- Body, UI, buttons: Source Sans 3 (variable font). Self-hosted via `@fontsource-variable/source-sans-3`.
- Labels and section numbers: `ui-monospace, 'SF Mono', monospace` (system, no file).

Configure the font families in `tailwind.config.mjs` under `theme.extend.fontFamily` so you can reach them as utility classes (`font-display`, `font-body`, `font-mono`).

---

## Component organization

When building UI, reach for components in this order:

1. Existing components in `src/components/` that already match this site's design
2. shadcn/ui primitives in `src/components/ui/`
3. Aceternity UI for motion-rich blocks (hero, bento, parallax)
4. Magic UI for smaller flourishes (marquee, animated text)
5. Custom build only if nothing above fits

File naming:

- PascalCase for top-level components (`Hero.astro`, `CaseCard.astro`, `PhotoStrip.astro`)
- kebab-case for shadcn primitives in `src/components/ui/` (matches shadcn CLI convention)

---

## Code conventions

- TypeScript strict mode. No `any`.
- Comment generously, especially in components that future-Nathan might edit by hand.
- At the top of each component file, add a header comment marking it `// Safe to edit` or `// Foundation, edit with care`.
- Astro components for static content. React islands only where interactivity is required (lightbox, animated hero, scroll-triggered effects).
- Prefer Astro's built-in `<Image />` and `<Picture />` components over plain `<img>` tags.
- Tailwind utility classes inline. Pull into `@apply` only when a pattern repeats four or more times.
- Use `clsx` or `class-variance-authority` for conditional classes once components get state-dependent styling.

---

## Image handling

- Source photos live in `src/assets/` so Astro can optimize at build time.
- Use the `<Picture />` component for art-directed images (different crops at different breakpoints).
- Always include `alt` text. `alt=""` is acceptable for purely decorative images.
- Galleries use `react-photo-album` for justified layouts on the photography page.
- Lightbox: `yet-another-react-lightbox` with the zoom and thumbnails plugins.
- `plaiceholder` generates blur-up placeholders so images don't pop in cold during load.

---

## Safe to edit by hand

- Text content inside `src/pages/*.astro` (everything outside the frontmatter, between the tags)
- MDX files in `src/content/case-studies/`
- Images in `src/assets/case-studies/`, `src/assets/photography/`, `src/assets/brand/`
- Copy strings and `href` values in component files
- Tailwind utility classes on existing components, when content needs different visual weight

## Foundation, edit with care (route through a planned Claude session)

- `tailwind.config.mjs` (design tokens: colors, type, spacing, breakpoints)
- `src/styles/globals.css` (Tailwind directives, `@font-face` declarations, base resets)
- `src/layouts/BaseLayout.astro` structure (header/footer slot wiring, meta tags)
- shadcn/ui primitives in `src/components/ui/` (installed via shadcn CLI; modify only with intent)
- Aceternity / Magic UI component swaps (replacing one motion block with another)
- `astro.config.mjs`, `package.json`, `tsconfig.json`

If a change requires editing the foundation set, do it in a Claude session, write the change deliberately, and update this doc when the architecture shifts.

---

## Audience

Site visitors include potential clients (small businesses, churches, schools, preschools) and other designers. Copy is confident but warm. Default explanations to non-technical readers (preschool families, church volunteers, board members) unless context makes it clear the reader is a peer.

---

## Deployment

- Production: pushes to `main` trigger a Cloudflare Pages build
- Previews: any other branch gets its own preview URL
- Build command: `npm run build`
- Output directory: `dist`

---

## Working with Nathan

- Nathan uses Claude Code from the desktop app, not the terminal. Show diffs clearly so they read well in that UI.
- Prefer Plan Mode for any multi-file change.
- Pause for confirmation before installing new dependencies.
- When proposing design changes, describe the visual outcome in plain language, not just the code.
- For board, church, or client-facing copy, frame options collaboratively rather than top-down.

---

## Communication style (Nathan's preferences)

These apply to everything written here, in code comments, in PR descriptions, in commit messages, and in copy on the site itself.

- Warm, conversational tone. Not stiff or corporate.
- Step-by-step structure for any process or how-to.
- No em-dashes. Use commas, periods, colons, or restructure the sentence.
- No AI-tell phrases: delve, navigate (as a verb), leverage, robust, seamless, meticulous, tapestry, realm, landscape, testament to, ever-evolving, crucial, pivotal.
- No AI-tell sentence patterns: "It's not just X, it's Y," "Not only... but also," "It's important to note that," "When it comes to," "In the realm of," "That said" or "With that being said" as transitions.
- Don't open replies with filler like "Certainly!", "Absolutely!", "Great question!", or "I'd be happy to help."
- Don't close replies with "I hope this helps!" or "Let me know if you have any questions." End on the actual content.
- Avoid three-item lists where the third item is filler. Two items is fine if two is the truth.
- Use bold for genuine emphasis or list labels only, never random nouns mid-sentence.
- Default to prose, not headers and bullets, unless content is genuinely a list or step-by-step.
- Comment code generously so future-Nathan can follow without reverse-engineering.

For copy on the actual site: "Modern websites for small businesses, nonprofits, churches, and schools in the Cincinnati region" beats "Bespoke digital experiences" every time.
