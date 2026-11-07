---
paths:
  - 'src/pages/**'
  - 'src/scripts/**'
  - 'src/styles/pages/**'
---

# Pages: what each route is made of

Loads when pages, page scripts or page styles are touched. The route table with sources is in `content.md`. Every page uses `BaseLayout.astro`, imports its own stylesheet from `src/styles/pages/`, and ends on `<Closing lead="...">` (except /contact, the 404 and /coming-soon). Page scripts import `ui` from `src/scripts/kit.js`, are plain processed Astro scripts, and run on load. Every page reads and links correctly with JavaScript off; the script only moves things.

## How a page is built

- The H1 comes from `PageHead.astro` or is written by hand with `wordSpans()` (`src/lib/words.ts`) and an `aria-label` carrying the plain sentence, so each word can reveal. Heavy words are `<b>`.
- A client appears as a `Tile` plus `Caption`, from `getClients()`. A quote appears as a `QuoteBand`, read from a study's frontmatter. Prices come from `src/data/pricing.ts`.
- Identity, contact and the closing's two sentences come from `src/data/site.ts` (`firstConversation`, `replyPromise`).
- Keep a neutral section between a `QuoteBand` and `Closing`.

## The pages

- **`/` (`index.astro`, `home.js`).** The hero: the H1 "I build websites that pull their weight." (with the small `.me` portrait), the sub line with the starting price, and the hand of client windows, which scroll deals into the grid. Then the work section (a `.giant` line that spells the real study count, the ledger, a "draw a card" button that opens a random client's sheet, the grid), one `QuoteBand` (Theology Matters), `DealtPrices` and the `Closing`.
- **`/work/` (`work/index.astro`, `work.js`).** The windows dealt onto a table, a sector filter (`?sector=church` filters on load and rewrites the URL as you click; an unknown sector falls back to all) and a Grid or List switch (`?view=list`). With church selected a link to /churches/ appears. Without JavaScript every site shows.
- **`/work/{slug}/` (`work/[slug].astro`, `study.js`).** The title on the client's color with their laptop and phone, then the story beside a rail phone that scrolls through the real homepage as you read, then Up next (by `order`, wrapping) and a sector closing. The story is the MDX body. Shape and frontmatter: `content.md`.
- **`/churches/` (`churches.astro`, `churches.js`).** The first sector page. As you read four points, the church's real phone page scrolls in its window. Copy and metadata: `src/data/sector-pages.ts` (`CHURCHES`). A second sector page needs its own `.astro` file, an entry in `sector-pages.ts` and a line in `tests/routes.ts`.
- **`/services/` (`services.astro`, `prices.js`).** The Prices page (nav label Prices): the three web tiers with an optional three-question picker that deals a card, recent sites, add-ons, care plans, how it works and the FAQ. Offers in the JSON-LD come from `pricing.ts`; the FAQPage JSON-LD must equal the visible FAQ. A "Start with {tier}" link carries `?tier=`.
- **`/contact/` (`contact.astro`, `contact.js`).** One question at a time with the brief phone beside it. A real Web3Forms post: with JavaScript the script validates in plain words, saves a draft, prefills from the URL and posts with `fetch`; without it every field shows and the form posts natively, then returns to `/contact/?sent=1#sent`, where CSS `:target` shows the success panel. Prefill params: `?org_type`, `?tier`, `?service`, `?from`, each checked against a slug pattern. No `Closing` here. It sends one `generate_lead` event and never a field value. `PUBLIC_WEB3FORMS_KEY` comes from the environment.
- **`/about/` (`about.astro`, `about.js`).** The longer story beside a stage of client windows and a portrait card, a giant line ("One person."), two quote bands (First Baptist Muncie, Stone Steps 50K) and "What I do, and what I don't", two cards lettered `+` and the minus sign.
- **`/photography/` (`photography.astro`).** Gated: noindex, out of the sitemap, the closing's legal line and `/llms.txt` until the `photos` collection holds `MIN_PHOTOS` photos (`src/data/photography-gate.ts`). While closed it shows one portrait and "ask for samples". The gallery needs a new non-React build (`docs/PENDING.md`).
- **`/journal/` and `/journal/{slug}/`.** Empty until the first published entry; the index and entries use `legal.css` and `sub.css`.
- **`/privacy/`, `/accessibility/`, `/colophon/`.** Plain text pages on `legal.css`. Their claims are tied to the code and hosting; `tests/colophon.spec.ts` checks the colophon names the real font and host. Update the text in the same change as the thing it describes.
- **`/coming-soon/`.** A standalone page (no `BaseLayout`), always live, used by the gate.
- **`/404`.** The not-found page: the 404 line, two links (work, home), and the first client window, knocked askew, which stands up when you reach for it (and the missing path shown as text). There is no "did you mean" list any more. `wrangler.jsonc` serves `404.html` with a 404 status.
- **Redirects.** `/now` goes to `/about/` (an Astro redirect); `/prices` goes to `/services/` and `/start` to `/contact/` (301s in `public/_redirects`).

## Rules for editing a page

- Copy is first person singular and states only what is true and sourced. No capacity or scarcity claims unless Nathan confirms them.
- A new page: file in `src/pages/`, its own CSS in `src/styles/pages/`, an entry in `tests/routes.ts`, a title and description (`content.md`, metadata), and an OG card (`npm run og:pages` picks it up).
- Do not add a router, a theme, a second nav or a React island (never-break rules 7 and 8).
