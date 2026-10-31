# PENDING.md

The open-patch and waiting-on-a-human queue for this repo. Created 2026-08-27
during the PORTS.md sync session (Card 15).

This is a **registry, not a changelog**. It is authoritative about what is
currently open, and it gets edited in the same commit as the thing it tracks.
When an item is done, delete the row. Do not append a "resolved" note and leave
it here; that turns the file into narrative and the next session stops trusting
it.

Read this file early in any session on this repo.

---

## Waiting on a human

- **The `test` job is pinned to ubuntu-24.04 (2026-10-30).** `ubuntu-latest` moved to 26.04, where Playwright's WebKit will not launch, so every `[webkit-iphone]` test failed. `ci.yml` now says `runs-on: ubuntu-24.04` on that job only. Unpin it once a Playwright release supports 26.04 (try it on a branch first). Starter PORTS.md card and vault gotcha `playwright-webkit-ubuntu-26-04`.

### 0. After the cut-over: Rich Results test (added 2026-10-30, overhaul 1.9)

Once `redesign` is live on `main`, run Google's Rich Results test
(https://search.google.com/test/rich-results) and the Schema Markup Validator
(https://validator.schema.org) on `/`, `/services/` and one case study. The
JSON-LD is one `@graph` per page (studio, WebSite, Person, WebPage, plus
BreadcrumbList, CreativeWork, Service and FAQPage where they apply); expect no
errors. Google shows no FAQ rich result for this kind of site, which is fine.
Then resubmit the sitemap in Search Console. Delete this item when done.

### 0b. After the cut-over: mark `generate_lead` as a GA4 key event (added 2026-10-31, overhaul 4.1)

The site now sends `generate_lead`, `contact_click`, `book_call_click`,
`visit_client_site`, `pricing_view` and `cta_click` (`src/lib/track.ts`). Once
`redesign` is live, open GA4 (property 532519109) > Admin > Events, wait for
`generate_lead` to appear after a real or test inquiry, and mark it as a key
event so it counts as a conversion. Optionally register `cta_location`,
`link_domain`, `method`, `cta_id` and `pricing_variant` as event-scoped custom
dimensions (Admin > Custom definitions) so they show in reports. Delete this
item when done.

### 1. Set the `SITE_URL` repo variable

**Blocks:** `.github/workflows/uptime.yml` (installed 2026-08-27, schedule ON).

Until the variable exists the workflow logs a warning and exits 0 on every
hourly run, so it is harmless but it is also not checking anything. Verified
unset 2026-08-27 (`gh variable list` returned nothing; `gh secret list` too).

```
gh variable set SITE_URL --body https://nixoncreativestudio.com
```

Use the **www** form with **no trailing slash**. The apex 301s to www, and the
workflow follows redirects, so the apex form also works; www just saves a hop
on every route.

Nothing else in this repo reads `SITE_URL`. The canonical site origin for the
build lives in `astro.config.mjs` (`site: 'https://nixoncreativestudio.com'`)
and is unrelated.

### 2. Decide what to do about the `--link` comment in `globals.css`

**File:** `src/styles/globals.css`, the `--link` declaration in `:root`
(and the matching paragraph under "Brand colors" in `.claude/rules/styling.md`).

The comment reads `/* AA on #FFFFFF, #F4F7FA, and #0A1628 */`. Measured
2026-08-27:

| pair                   | ratio      | AA body text (4.5:1) |
| ---------------------- | ---------- | -------------------- |
| `#2A6FB0` on `#FFFFFF` | 5.25:1     | pass                 |
| `#2A6FB0` on `#F4F7FA` | 4.88:1     | pass                 |
| `#2A6FB0` on `#0A1628` | **3.45:1** | **fail**             |

The third claim is wrong. It is **not** a live accessibility defect: the pair
is not rendered anywhere. Since overhaul 2.1 the Footer is a `.band-ink` block
in both themes, and `.band-ink` re-scopes `--link` to sky `#40AAED` (asserted in
`src/lib/ncs-tokens.test.ts`), so no link on navy uses `#2A6FB0`. So this is a
documentation error, not a bug.

It is left for a human because `globals.css` is a "foundation, edit with care"
file per `.claude/rules/foundation-files.md`, and because there are two defensible fixes:

- **a)** Correct the comment to say AA on the two paper surfaces only. Zero
  risk, and the token keeps its current value.
- **b)** Darken `--link` until it genuinely clears 4.5:1 on navy too, making the
  comment true and giving a future navy-in-light-mode surface a safe link
  colour. This changes rendered colour on every page and needs an eye on it.

Option (a) is the recommendation. Whichever is chosen, add the navy pair to
`src/lib/theme-tokens.test.ts` afterwards so the claim is machine-checked from
then on.

### 2a. Case-study honesty follow-ups (added 2026-10-30, overhaul 1.3)

Nathan signed off FBCM and Reid; both are done. Only the Orangeburg hook is still open:

- **First Baptist Muncie: done (overhaul 2.4d, 2026-10-31).** Nathan signed
  off the FBCM part ("FBCM is astro now"). The study now describes the Astro +
  Sanity + Cloudflare Workers rebuild, live on www.fbcmuncie.org since
  2026-10-19, from the fbcm repo's docs and the live site. The Wix-era feature
  shots are gone; the new ones are crops of the live /visit, /history and
  /architecture pages, and the Wix home page (captured 2026-06-21) is the
  `beforeShot`. Two things for Nathan to read: the line "I had built the
  church's earlier website on Wix" (taken from the old study and the two
  testimonials, which are now labelled as written about the Wix site), and
  the designer note, kept word for word from the Wix-era study (the children's
  and youth newsletters are still separate pages on the live site).
- **First Presbyterian Orangeburg:** its `hook` ("Book the building through one
  form, not an inbox") is a draft written from the designer note (1.6). Edit or
  approve it.
- **Reid Design: done (overhaul 2.4f, 2026-10-31).** Nathan approved the
  removal ("Yes, remove them"). The study no longer mentions a Budget
  Calculator, a style quiz or before/after sliders, and the designer note about
  the slider is gone. That day on reiddesignllc.com, `/budget-calculator/` and
  `/style-quiz/` answered 404, `/quiz/` and `/calculator/` redirected to
  /services/, and `/portfolio/` redirected home (the portfolio is switched
  off in Reid's CMS). The README's Reid row was corrected in the same PR.

### 2b. Ungate /photography (added 2026-10-31, overhaul 2.8)

/photography/ is gated: noindex, out of the sitemap, the menus and `/llms.txt`,
showing one photo and "ask for samples". It needs **6 to 20 real photos of
Nathan's own work, with permission from the people and places in them**. Then:

1. Optimize each into `src/assets/photography/<name>.jpg` and add a
   `src/content/photos/<name>.json` entry (fields in `src/content.config.ts`).
2. Build the gallery (package 4.6: contact sheet, loupe, lightbox). Add
   `/photography` to `GALLERY_ROUTES` in `tests/no-react.spec.ts` if it uses
   the `PhotoGallery` React island.
3. At 6 photos (`MIN_PHOTOS` in `src/data/photography-gate.ts`) the nav link,
   the sitemap entry, the `/llms.txt` line and indexing all switch on by
   themselves on the next build; `tests/photography-gate.spec.ts` follows.
4. Swap the gate page's photo: today it is the black-and-white portrait from
   About (`src/assets/about/portrait-bw.jpg`), captioned as a portrait of
   Nathan, because no photo in the repo is a confirmed frame of his client work.
   Nathan can pick one of his own frames for it now, before the gallery is ready.

Package 1.3 only changed the pronouns in those studies ("we" to "I"); the claims
themselves are untouched. A capacity line ("I take a small number of projects
each quarter") was removed site-wide because nothing sources it; put it back
only if Nathan confirms it.

### 2b. Testimonials still missing (added 2026-10-31, testimonials package)

Five studies carry their client's own words (`testimonials` frontmatter,
rendered by `Testimonial.astro`): Theology Matters, Foundation for Reformed
Theology, Stone Steps 50K, First Baptist Muncie (two) and First Presbyterian
Orangeburg. The homepage shows Richard Burnett's (Theology Matters).

- **Still missing: Presbyterian Academy, MAS Monograms, Reid Design.** Those
  studies show no quote until a real one arrives. The ask is Nathan's to send
  (a short three-question email; it can be drafted for him, never sent for
  him).
- **Stone Steps:** David Corfman's quote is about the earlier refresh, and the
  study says so under it. A fresh quote about the 2026 rebuild would replace
  it.
- When a quote arrives: record it verbatim in the vault note
  `projects/ncs-testimonials.md` first, then add it to the study's frontmatter
  (`quote`, `name`, `title`, `date`) and the slug to `WITH_QUOTES` in
  `src/lib/case-testimonials.test.ts`, which fails on a quote in any other
  study.

---

## Open technical exposure (no human decision needed, just not done yet)

### 3. `react` / `react-dom` are on carets

PORTS.md Card 13. Both resolve to 19.2.6 today, but `package.json` declares
`^19.2.6` for each. The moment an install drags one of them forward
independently, the build dies inside workerd behind a wall of Miniflare stack
frames, with the real message (`Incompatible React versions`) buried **above**
the `MiniflareCoreError`. presacademy lost a session to exactly this on
2026-08-25.

The fix is to pin both **exact**, no caret. Not done here because it is a
lockfile-affecting change and this sync session deliberately made none. Do it
in its own commit, ideally alongside the next dependency bump.

### 4. `wrangler` is on a caret, and the generated config still carries

`legacy_env`

PORTS.md Card 14. `wrangler` is declared `^4.94.0` and resolves to 4.94.0.
`dist/server/wrangler.json`, which `@astrojs/cloudflare` 13.5.4 generates on
every build, contains `"legacy_env": true` (verified 2026-08-27). wrangler
4.126+ rejects that field outright.

This is latent rather than live: `npm run deploy` runs a plain `wrangler deploy`
against the **root** `wrangler.jsonc`, which has no `legacy_env`, so the
generated file's copy is not read on the current deploy path. It becomes live
the day either the caret resolves past 4.126 **and** something starts pointing
wrangler at the generated config. Pin `wrangler` to `~4.94.0` if that day is
ever in doubt.

### 5. `scripts/with-workerd.mjs` is wired (done 2026-10-13)

PORTS.md Card 1. The wrapper works around a workerd crash that can hit Astro 7 /
`@astrojs/cloudflare` 14 on Windows, where the prerender runs through
`@cloudflare/vite-plugin`. `npm run build` now ends with
`node scripts/with-workerd.mjs astro build`, the same shape presacademy and
reid-design-site use. It only acts on Windows, and only when wrangler carries
its own newer workerd; on Linux CI (and on a Windows install where wrangler and
the plugin share one workerd, as today) it changes nothing. The wrapper copy is
byte-identical to the starter's.

---

## Deliberate absences (do not "fix" these)

These are recorded so a future session stops re-deriving them.

- **No Sanity, and therefore no Sanity cards.** This is a static marketing site
  with content in Astro content collections and MDX. PORTS.md Cards 4
  (sanity-lib), 5 (stale-types CI guard), 6 (nightly Sanity backup), 10
  (embedded-studio live preview) and 11 (preview click interceptor) have nothing
  to attach to here. There is no dataset to back up and no generated types file
  to go stale.
- **No page-builder.** Card 12 is a method for converting bespoke pages into
  CMS-driven sections. There is no CMS.
- **No visual-regression suite.** The family standard runs one only where a
  site has a fixture-driven `/styleguide` route; this site does not. The
  Playwright / axe / reflow suite (Card 8) landed 2026-09-06; see
  `docs/TESTING.md`.
