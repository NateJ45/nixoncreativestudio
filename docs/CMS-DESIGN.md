# CMS design: every editable thing in the EmDash admin

Written 2026-10-03. Status: **design, not built.** Read with `docs/CMS-INVENTORY.md` (what is hardcoded today), `docs/EMDASH-SCHEMA.md` (the existing `case_studies` collection) and `docs/TESTING.md`.

**Goal.** Nathan can run the site by hand from `/_emdash/admin` with no Claude session and no git: change copy, prices, FAQ, nav, contact details, the About "Currently" block, legal pages, journal entries and photos, and see the change live within minutes. A builder agent should be able to take one PR from section 2 and build it from this document alone.

**Verified against EmDash 1.1.0 in `node_modules` (2026-10-03), not assumed:**

- No singleton or "global" type exists. Field types are string, text, url, number, integer, boolean, datetime, select, multiSelect, image, file, reference, slug, repeater, portableText, blocks, json. Repeater sub-fields are flat only (string, text, url, number, integer, boolean, datetime, select, image: no nested repeater). `validation` supports `maxLength`, `minLength`, `min`, `max`, `pattern`, `options`, `minItems`, `maxItems`, enforced server-side by the generated zod schema.
- Collections take `titleField`, `group`, `sortOrder`, `hidden`, `routable`, `urlPattern`, `admin.quickCreate`, `admin.listColumns`.
- Menus are real (`getMenu`, items with `label`, `url`, `target`, `titleAttr`, `children`). The CLI can only read menus; writes go through REST.
- Redirects are real and applied by EmDash middleware on every non-asset path.
- The admin sidebar's Comments, Menus, Widgets, Sections and Bylines entries are unconditional for any Editor or Admin user (read from `@emdash-cms/admin/dist/index.js`, the `manageItems` array). They cannot be hidden by config.
- EmDash publish routes call `cache.invalidate({ tags: [collection, id] })` when Astro route caching is on, and `@astrojs/cloudflare` 14.3 ships `cacheCloudflare()` (Workers cache with `Cache-Tag` purge). Astro 7.3 has the top-level `cache` and `routeRules` config.

---

## 0. Decisions in one page

1. **Every page becomes server-rendered** (`output: 'server'`). The header nav, footer and contact details are CMS-driven and appear on every page, so a prerendered page would show stale chrome until a deploy, and Nathan cannot deploy without git. Speed comes back from Astro route caching on Cloudflare with tag purge on publish (section 3).
2. **Designed pages (home, services, about, contact, work, photography, journal index, 404) are one singleton collection each**, with tightly constrained flat fields: fixed section order, `maxLength` on every string, fixed or bounded repeater counts, accent phrases as separate fields so the two-colour headline cannot break. No Portable Text on designed pages except the About story. The `blocks` field type was rejected for these pages because it lets an editor reorder and delete sections, and section order is the IA.
3. **Shared values live in a `site_settings` singleton** (contact details, tagline, socials, footer blurb, default CTA, RSS meta). EmDash's built-in Site Settings screen is not read by the site.
4. **Lists with sub-lists are collections** (`pricing_tiers`, `pricing_addons`, `service_offerings`, `photos`); **flat lists are repeaters** on their page (FAQ, process steps, principles, Currently).
5. **Navigation uses EmDash Menus** (`primary`, `footer`). The mobile-nav descriptor goes in each item's "Title attribute" field.
6. **Prose pages (privacy, accessibility, colophon) use the template `pages` collection** with a generic template and an auto table of contents. **The journal uses the template `posts` collection**, relabelled "Journal".
7. **Redirects move to EmDash Redirects** so Nathan can add one when he renames or retires a page.
8. **Stays in code, with reason:** UI microcopy and form field labels (tied to validation and ARIA), CTA and link targets to core routes (a typo would break the main conversion path), the case-study page template chrome and per-sector CTAs (tied to the sector select), `orgTypes` on the contact form (its values are the case-study sectors and the `?org_type=` prefill), the About `Terminal` lines (a timed typing animation), `ComingSoon` copy (only seen when the gate is on), OG card titles (`generate-og.mjs` only regenerates on a deploy, so an admin edit would silently not show), the canonical domain and URL (bound to the deployment and the admin passkey origin).
9. **Every singleton read falls back to the committed migration JSON** (`cms/content/*.json`) if the entry is missing or D1 errors, and logs `console.error`. A broken or unpublished singleton never blanks the site.
10. **Content enters production through scripts, never retyped:** literal values move from code into `cms/content/*.json` in the PR, a loader pushes them through the `emdash` CLI and REST, and the render-parity check proves the CMS-rendered HTML equals the hardcoded HTML.

---

## 1. Editing model per page and component

### 1.1 Conventions every builder follows

**Singletons.** One collection per singleton, read by a fixed entry slug. Settings for every singleton collection:

```js
{
  supports: ['drafts', 'revisions'], // Save as draft, Publish, and roll back from History
  routable: false,
  admin: { quickCreate: false },     // no "new entry" shortcut on the dashboard
  group: 'Pages',                    // or 'Site' for site_settings, see 4.3
  titleField: 'seo_title',           // the admin list shows "Services", not an id
  commentsEnabled: false,
}
```

A second entry in a singleton collection is ignored by the site (the reader asks for the fixed slug only). No `seo` support on singletons: their SEO lives in the `seo_title` and `seo_description` fields below, which BaseLayout already understands, so there is one place to edit it, not two.

**Common page fields.** Every `page_*` singleton starts with:

| Field             | Type   | Req | Validation                  | Notes                                                                                                                                       |
| ----------------- | ------ | --- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `seo_title`       | string | yes | maxLength 60                | Browser tab and search title. Code appends ` \| <studio_name>` unless the value already contains the studio name (the homepage title does). |
| `seo_description` | text   | yes | minLength 50, maxLength 160 | Meta description. The homepage has none today; seed it with the tagline.                                                                    |
| `cta_title`       | string | no  | maxLength 60                | Only on pages that render `CtaBanner`. Empty means the site default.                                                                        |
| `cta_sub`         | text   | no  | maxLength 200               | Same.                                                                                                                                       |

**Accent headlines.** Where a heading has a coloured phrase today, it is two fields: `heading` (the plain lead) and `heading_accent` (rendered in the existing accent `<span>`, with the same `text-link` / `dark:text-tertiary` classes as today). Pages whose heading has no accent today get no `heading_accent` field.

**Links.** CTA buttons keep their hrefs in code; only their labels are fields. The two places Nathan sets a URL are Menus and the 404 links repeater (validated `pattern: '^/'`, internal paths only).

**Required alt text.** Every `image` field has a sibling `*_alt` string. If an image is set and its alt is empty, the component renders without the image (services offerings show the placeholder panel; About photos skip the photo), so a missing alt can never ship an inaccessible image. The editing guide says so.

**Field labels carry the help text.** EmDash fields have no description, so a label reads like `Positioning line (max 110 characters)`. Where a value must stay in sync with another one, the label says so, for example `Answer (if it mentions prices, check them against Pricing tiers)`.

**Code layout.**

- `cms/schema/<collection>.mjs`: one file per collection, same shape as `scripts/lib/case-studies-schema.mjs` (`SLUG`, `COLLECTION`, `FIELDS`), applied by a generic `applyCollectionSchema(request, def)` in `scripts/lib/emdash-schema.mjs` (built in PR 3; note that sub-field `maxLength` is not enforced by EmDash, see the PR 3 notes).
- `cms/content/<collection>.json`: the migrated values. Singletons: `{ "slug": "home", "data": { ... } }`. Collections: an array of those. Images are `{ "$file": "src/assets/about/family.jpg", "alt": "..." }` and the loader uploads them.
- `src/lib/cms.ts`: the only module that reads these collections (`getSingleton`, `getOrdered`, `getMenuItems`). Typed results; fields normalised (booleans from 0/1, repeaters to arrays, empty optional strings to `undefined`).
- Every reader passes its `cacheHint` to `Astro.cache.set()` when `Astro.cache?.enabled`.

### 1.2 Shared: `site_settings` (singleton, entry slug `site`)

Group `Site`, `sortOrder: 0`, `titleField: 'studio_name'`. Replaces the values in `src/data/site.ts`. `site.ts` keeps only `domain`, `url` and the derived helpers, and gains a `getSite()` that merges code constants with this entry.

| Field                 | Type   | Req | Validation                                         | Current source                                   |
| --------------------- | ------ | --- | -------------------------------------------------- | ------------------------------------------------ |
| `studio_name`         | string | yes | maxLength 40                                       | `site.studioName`                                |
| `owner_name`          | string | yes | maxLength 40                                       | `site.ownerName`                                 |
| `email`               | string | yes | maxLength 80, pattern `^[^@\s]+@[^@\s]+\.[^@\s]+$` | `site.email`; `emailHref` derived                |
| `phone`               | string | yes | maxLength 24                                       | `site.phone`; `phoneHref` derived (digits only)  |
| `location`            | string | yes | maxLength 40                                       | `site.address` ("Cincinnati, OH")                |
| `tagline`             | text   | yes | maxLength 160                                      | `site.tagline`; Organization JSON-LD description |
| `instagram_url`       | url    | yes |                                                    | `site.social.instagram`                          |
| `linkedin_url`        | url    | yes |                                                    | `site.social.linkedin`                           |
| `booking_url`         | url    | no  |                                                    | `site.bookingUrl` (empty hides "Book a call")    |
| `newsletter_url`      | url    | no  |                                                    | `site.newsletterUrl` (empty hides Newsletter)    |
| `header_cta_label`    | string | yes | maxLength 20                                       | Header "Start a project"                         |
| `footer_blurb`        | text   | yes | maxLength 220                                      | Footer brand paragraph                           |
| `footer_currently`    | text   | yes | maxLength 180                                      | Footer `currently`                               |
| `cta_default_title`   | string | yes | maxLength 60                                       | `CtaBanner` default title                        |
| `cta_default_sub`     | text   | yes | maxLength 200                                      | `CtaBanner` default sub                          |
| `cta_default_label`   | string | yes | maxLength 24                                       | `CtaBanner` default label                        |
| `default_description` | text   | yes | maxLength 160                                      | BaseLayout fallback description                  |
| `rss_title`           | string | yes | maxLength 70                                       | `rss.xml.js` title                               |
| `rss_description`     | text   | yes | maxLength 200                                      | `rss.xml.js` description                         |

Derived, not edited: Organization / LocalBusiness JSON-LD in `StructuredData.astro` (from studio_name, email, phone, location, tagline, socials, plus code `url`), the contact form subject line, the copyright line.

### 1.3 Shared: Menus

| Menu      | Label             | Read by                     | Items (migrated from code)                                                                   |
| --------- | ----------------- | --------------------------- | -------------------------------------------------------------------------------------------- |
| `primary` | Header navigation | `Header.astro`, `MobileNav` | Work `/work/`, Services `/services`, About `/about`, Journal `/journal/`                     |
| `footer`  | Footer navigation | `Footer.astro`              | Work `/work/`, Services `/services`, About `/about`, Journal `/journal/`, Contact `/contact` |

- **Mobile descriptor** = the item's "Title attribute" (`titleAttr`), shown as visible text under the label in the mobile panel and never emitted as an HTML `title`. Migrate the `DESCRIPTIONS` map into it. Contact's descriptor ("Email, phone, or the form") has no menu item in `primary`; it stays in `MobileNav` code next to the drawer CTA.
- **Journal auto-hide stays in code:** any item whose URL starts with `/journal` is dropped while there is no published journal entry (same rule as today).
- Nested items (`children`) are ignored; the header has no dropdown design. Active-route styling stays in code.
- `MobileNav.tsx` is a React island, so `Header.astro` passes the items as props (already the pattern).

### 1.4 Homepage: `page_home` (entry `home`)

| Field                   | Type     | Req | Validation                                                                                 | Current source                                                         |
| ----------------------- | -------- | --- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| common `seo_*`          |          | yes |                                                                                            | `index.astro` title; description new                                   |
| `hero_heading`          | string   | yes | maxLength 32                                                                               | `statementLead` "I make websites that"                                 |
| `hero_heading_accent`   | string   | yes | maxLength 28                                                                               | `statementAccent` "pull their weight."                                 |
| `hero_positioning`      | text     | yes | maxLength 110                                                                              | `positioning`                                                          |
| `hero_proof_before`     | string   | yes | maxLength 100                                                                              | "Based in Cincinnati. Every site designed, built, and photographed by" |
| `hero_proof_link_text`  | string   | yes | maxLength 24                                                                               | "one person" (links to `/about`, href in code)                         |
| `hero_proof_after`      | string   | yes | maxLength 40                                                                               | ", start to finish."                                                   |
| `hero_primary_label`    | string   | yes | maxLength 24                                                                               | "Start a project" (`/contact`)                                         |
| `hero_secondary_label`  | string   | yes | maxLength 24                                                                               | "See the work" (`/work/`)                                              |
| `work_heading`          | string   | yes | maxLength 40                                                                               | SelectedWork h2                                                        |
| `work_sub`              | text     | yes | maxLength 200                                                                              | SelectedWork sub                                                       |
| `work_link_label`       | string   | yes | maxLength 40                                                                               | SelectedWork link                                                      |
| `pricing_heading`       | string   | yes | maxLength 40                                                                               | PricingTeaser "What it costs"                                          |
| `pricing_sub`           | text     | yes | maxLength 220                                                                              | PricingTeaser sub                                                      |
| `pricing_includes_lead` | string   | yes | maxLength 80                                                                               | "Every build includes, whatever the tier:"                             |
| `pricing_includes`      | repeater | yes | minItems 4, maxItems 4; sub `text` string req maxLength 48                                 | `includes` array                                                       |
| `pricing_reassurance`   | text     | yes | maxLength 260                                                                              | reassurance paragraph                                                  |
| `pricing_link_label`    | string   | yes | maxLength 48                                                                               | "See full pricing and services"                                        |
| `process_heading`       | string   | yes | maxLength 40                                                                               | ProcessBand h2                                                         |
| `process_sub`           | text     | yes | maxLength 160                                                                              | "Four steps, from the first conversation to launch day."               |
| `process_steps`         | repeater | yes | minItems 4, maxItems 4; sub `title` string req maxLength 32, `body` text req maxLength 300 | `steps` (numbers 01 to 04 computed from order)                         |
| `process_cta_title`     | string   | yes | maxLength 48                                                                               | `ctaTitle`                                                             |
| `process_cta_sub`       | text     | yes | maxLength 200                                                                              | `ctaSub`                                                               |
| `process_cta_label`     | string   | yes | maxLength 24                                                                               | ProcessBand button label                                               |

`ProcessBand` on `/services` reads the same `process_*` fields, so the labels say "(also shown on Services)". Tier rows in the teaser come from `pricing_tiers`. Selected Work cards and the client marquee stay derived from `case_studies`. The hero device scene (`HeroShowcase`) becomes CMS-driven in PR 13 via two new `case_studies` fields (section 1.12).

### 1.5 Pricing: `pricing_tiers` and `pricing_addons` (collections)

Group `Pricing & services`. Supports `drafts`, `revisions`. `routable: false`, `admin.quickCreate: false`. Read by the homepage teaser and `/services`, ordered by `sort_order` ascending.

`pricing_tiers` (entries `launch`, `signature`, `flagship`; `titleField: 'name'`; `listColumns: ['price_from', 'sort_order']`):

| Field          | Type     | Req | Validation                                                 | Source (`pricing.ts`)                              |
| -------------- | -------- | --- | ---------------------------------------------------------- | -------------------------------------------------- |
| `name`         | string   | yes | maxLength 20                                               | `name`                                             |
| `price_from`   | integer  | yes | min 0, max 100000                                          | `priceFrom` (drives count-up and the static value) |
| `price_suffix` | string   | no  | maxLength 2                                                | `priceSuffix`                                      |
| `who`          | string   | yes | maxLength 40                                               | `who`                                              |
| `range`        | string   | yes | maxLength 60                                               | `range`                                            |
| `note`         | text     | yes | maxLength 320                                              | `note`                                             |
| `features`     | repeater | yes | minItems 2, maxItems 5; sub `text` string req maxLength 80 | `features`                                         |
| `highlighted`  | boolean  | no  |                                                            | `highlighted`                                      |
| `badge`        | string   | no  | maxLength 32                                               | `badge`                                            |
| `sort_order`   | integer  | yes | min 1, max 99, indexed                                     | array order                                        |

Render rules: the first 3 published tiers only (the layout has three columns); the first tier with `highlighted` true gets the accent treatment and any others render plain.

`pricing_addons` (entries `photography`, `brand-strategy`, `care-plan`; `titleField: 'name'`):

| Field        | Type    | Req | Validation    | Source                                   |
| ------------ | ------- | --- | ------------- | ---------------------------------------- |
| `name`       | string  | yes | maxLength 32  | `name`                                   |
| `price`      | string  | yes | maxLength 24  | `price` (display string, ranges allowed) |
| `note`       | text    | yes | maxLength 400 | `note`                                   |
| `sort_order` | integer | yes | min 1, max 99 | order                                    |

Render the first 3. After this PR `src/data/pricing.ts` is deleted.

### 1.6 Services: `page_services` (entry `services`) and `service_offerings`

`service_offerings` (collection, entries `strategy`, `web-design`, `photography`; `titleField: 'title'`; group `Pricing & services`):

| Field              | Type     | Req | Validation                                                 | Source                                                                                                              |
| ------------------ | -------- | --- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `title`            | string   | yes | maxLength 32                                               | `title`                                                                                                             |
| `lede`             | text     | yes | maxLength 180                                              | `lede`                                                                                                              |
| `body`             | text     | yes | maxLength 500                                              | `body` (also Service JSON-LD description)                                                                           |
| `price_from`       | integer  | no  | min 0, max 100000                                          | `priceFrom` (JSON-LD Offer only; never shown on the page). Empty for Web design, whose floor follows the first tier |
| `image`            | image    | no  |                                                            | NOT built in PR 7: the Web design screenshot stays an image file in code, keyed by slug (see the PR 7 notes)        |
| `image_alt`        | string   | no  | maxLength 160                                              | `imageAlt`                                                                                                          |
| `placeholder_icon` | select   | yes | options `strategy`, `photography`, `none`                  | `placeholderIcon` (`none` for web design)                                                                           |
| `points`           | repeater | yes | minItems 3, maxItems 5; sub `text` string req maxLength 90 | `points`                                                                                                            |
| `area_served`      | select   | yes | options `regional`, `anywhere`                             | the JSON-LD rule (Photography `regional`, others `anywhere`)                                                        |
| `sort_order`       | integer  | yes | min 1, max 99                                              | order                                                                                                               |

JSON-LD: one Service per offering, `areaServed` from the select (`regional` = "Greater Cincinnati region"; `anywhere` = both values), Offer only when `price_from` is set. The SVG markup for the placeholder icons stays in code, keyed by the select.

`page_services`:

| Field                   | Type     | Req | Validation                                                                                        | Source                                                                                                                                               |
| ----------------------- | -------- | --- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| common `seo_*`, `cta_*` |          |     |                                                                                                   | page props; CtaBanner overrides                                                                                                                      |
| `heading`               | string   | yes | maxLength 110                                                                                     | h1                                                                                                                                                   |
| `intro`                 | text     | yes | maxLength 260                                                                                     | hero sub                                                                                                                                             |
| `pricing_heading`       | string   | yes | maxLength 40                                                                                      | "What a website costs"                                                                                                                               |
| `pricing_sub`           | text     | yes | maxLength 220                                                                                     | its sub                                                                                                                                              |
| `pricing_footnote`      | text     | yes | maxLength 200 (built)                                                                             | the note under the tier cards, "Strategy is the front of every project..." (the "A starting point..." text is `pricing_sub`, maxLength 400 as built) |
| `addons_heading`        | string   | yes | maxLength 32                                                                                      | "Add to any project"                                                                                                                                 |
| `why_heading`           | string   | yes | maxLength 40                                                                                      | "Why it costs what it costs"                                                                                                                         |
| `why_sub`               | text     | yes | maxLength 200                                                                                     | its sub                                                                                                                                              |
| `why_items`             | repeater | yes | minItems 4, maxItems 4; sub `title` string req maxLength 40, `body` text req maxLength 360        | `whyItCosts`                                                                                                                                         |
| `why_closing`           | text     | yes | maxLength 420                                                                                     | closing paragraph after the grid                                                                                                                     |
| `faq_heading`           | string   | yes | maxLength 40                                                                                      | "Common questions"                                                                                                                                   |
| `faq_sub`               | text     | yes | maxLength 200                                                                                     | its sub                                                                                                                                              |
| `faq`                   | repeater | yes | minItems 3, maxItems 10; sub `question` string req maxLength 140, `answer` text req maxLength 900 | `faq`; FAQPage JSON-LD built from it                                                                                                                 |

### 1.7 About: `page_about` (entry `about`)

| Field                       | Type         | Req | Validation                                                                                                                                  | Source                                                |
| --------------------------- | ------------ | --- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| common `seo_*`, `cta_*`     |              |     |                                                                                                                                             | props; CtaBanner overrides                            |
| `heading`                   | string       | yes | maxLength 40                                                                                                                                | "A one-person studio for"                             |
| `heading_accent`            | string       | yes | maxLength 60                                                                                                                                | "organizations that take their work seriously."       |
| `intro`                     | text         | yes | maxLength 520                                                                                                                               | intro paragraph                                       |
| `headshot`                  | image        | yes |                                                                                                                                             | `assets/brand/headshot.jpg`                           |
| `headshot_alt`              | string       | yes | maxLength 120                                                                                                                               | "Nathan Nixon, smiling outdoors"                      |
| `thesis_before`             | text         | yes | maxLength 140                                                                                                                               | thesis up to the accent                               |
| `thesis_accent`             | string       | yes | maxLength 80                                                                                                                                | "churches, schools, nonprofits, and small businesses" |
| `thesis_after`              | text         | yes | maxLength 140                                                                                                                               | thesis after the accent                               |
| `story_heading`             | string       | yes | maxLength 40                                                                                                                                | "The longer story"                                    |
| `story_sub`                 | text         | yes | maxLength 160                                                                                                                               | its sub                                               |
| `story_body`                | portableText | yes |                                                                                                                                             | the 4 story paragraphs                                |
| `outside_heading`           | string       | yes | maxLength 40                                                                                                                                | "Outside the studio"                                  |
| `outside_sub`               | text         | yes | maxLength 160                                                                                                                               | its sub                                               |
| `photos`                    | repeater     | yes | minItems 3, maxItems 6; sub `image` image req, `caption` string req maxLength 40, `alt` string req maxLength 160                            | `photos`                                              |
| `principles_heading`        | string       | yes | maxLength 40                                                                                                                                | "How I work"                                          |
| `principles_sub`            | text         | yes | maxLength 160                                                                                                                               | its sub                                               |
| `principles`                | repeater     | yes | minItems 3, maxItems 3; sub `title` string req maxLength 48, `body` text req maxLength 360                                                  | `principles`                                          |
| `currently_heading`         | string       | yes | maxLength 40                                                                                                                                | "Currently"                                           |
| `currently_sub`             | text         | yes | maxLength 160                                                                                                                               | its sub                                               |
| `currently_updated`         | datetime     | yes |                                                                                                                                             | `lastUpdated` (drives the freshness pill)             |
| `working_on`                | repeater     | yes | minItems 1, maxItems 3; sub `text` string req maxLength 140                                                                                 | `workingOn`                                           |
| `booking`                   | repeater     | yes | minItems 1, maxItems 3; sub `label` string req maxLength 24, `status` select req options `open`, `limited`, `detail` text req maxLength 220 | `booking`                                             |
| `reading`                   | repeater     | yes | minItems 1, maxItems 4; sub `title` string req maxLength 60, `author` string req maxLength 40, `note` string maxLength 24                   | `reading`                                             |
| `learning`                  | repeater     | yes | minItems 1, maxItems 4; sub `text` string req maxLength 100                                                                                 | `learning`                                            |
| `testimonials_heading`      | string       | yes | maxLength 40                                                                                                                                | Testimonials heading                                  |
| `testimonials_sub`          | text         | yes | maxLength 160                                                                                                                               | Testimonials sub                                      |
| `lighthouse_performance`    | integer      | yes | min 0, max 100                                                                                                                              | `LighthouseScore` 92                                  |
| `lighthouse_accessibility`  | integer      | yes | min 0, max 100                                                                                                                              | 100                                                   |
| `lighthouse_best_practices` | integer      | yes | min 0, max 100                                                                                                                              | 100                                                   |
| `lighthouse_seo`            | integer      | yes | min 0, max 100                                                                                                                              | 100                                                   |
| `job_title`                 | string       | yes | maxLength 80                                                                                                                                | Person JSON-LD `jobTitle`                             |

`story_body` is rendered through a restricted Portable Text component map: `normal` blocks, `strong`, `em` and `link` marks only; any heading style renders as a paragraph and any non-block type renders nothing, so the story column cannot grow headings or images. The rail location stamp reads `site_settings.location`. The Lighthouse labels say "Measured facts: only change after a real re-measure". Testimonial quotes stay derived from case studies. The `Terminal` stays in code.

### 1.8 Contact: `page_contact` (entry `contact`)

| Field                   | Type     | Req | Validation                                                  | Source                                                                                                                |
| ----------------------- | -------- | --- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| common `seo_*`, `cta_*` |          |     |                                                             | props; CtaBanner overrides                                                                                            |
| `cta_label`             | string   | yes | maxLength 24                                                | "Email me" (href is the site email)                                                                                   |
| `heading`               | string   | yes | maxLength 40                                                | "Start a project, or just"                                                                                            |
| `heading_accent`        | string   | yes | maxLength 24                                                | "say hello."                                                                                                          |
| `intro`                 | text     | yes | maxLength 400                                               | hero paragraph                                                                                                        |
| `next_steps`            | repeater | yes | minItems 2, maxItems 4; sub `text` string req maxLength 120 | `nextSteps`                                                                                                           |
| `budgets`               | repeater | yes | minItems 2, maxItems 6; sub `label` string req maxLength 40 | `budgets`                                                                                                             |
| `timelines`             | repeater | yes | minItems 2, maxItems 6; sub `label` string req maxLength 48 | `timelines`                                                                                                           |
| `heard_from`            | repeater | yes | minItems 2, maxItems 8; sub `label` string req maxLength 64 | `heardFromOptions`                                                                                                    |
| `response_time`         | text     | yes | maxLength 200                                               | sidebar response-time text (dropped in PR 9: the page has no such text; see the PR 9 notes, `where_text` replaces it) |

The submitted value of a budget, timeline or heard-from option becomes its label text (today it is a slug like `under-4k`), so Nathan's inbound emails read naturally and he never edits an invisible value. Field labels, help text, validation messages, the success message (it interpolates the domain) and the Web3Forms handler stay in code. `orgTypes` stays in code (section 0, item 8).

### 1.9 Work index, photography, journal index, 404

`page_work` (entry `work`): common `seo_*`, `cta_*`; `eyebrow` string maxLength 40; `heading` string req maxLength 40; `intro` text req maxLength 260 (the computed project count stays in code and renders before it, exactly as today); `empty_filter_message` string req maxLength 120; `live_heading` string req maxLength 40 ("Open any of them"); `live_body` text req maxLength 300. Filter chip labels stay derived.

`page_photography` (entry `photography`): common `seo_*`, `cta_*`; `heading` string req maxLength 40; `heading_accent` string req maxLength 40; `intro` text req maxLength 300; `events_title`, `portraits_title`, `environments_title` string req maxLength 32; `events_intro`, `portraits_intro`, `environments_intro` text req maxLength 400 (replaces `CATEGORY_META`; three fixed fields, not a repeater, because the categories are the `photos.category` select); `empty_heading` string req maxLength 60; `empty_body` text req maxLength 300.

`page_journal` (entry `journal`): common `seo_*`, `cta_*`; `heading` string req maxLength 40; `intro` text req maxLength 260; `empty_kicker` string req maxLength 40; `empty_heading` string req maxLength 60; `empty_body` text req maxLength 300.

`page_not_found` (entry `not-found`): `seo_title`, `seo_description`; `label` string req maxLength 32 (the mono label); `heading` string req maxLength 40; `body` text req maxLength 220; `links` repeater minItems 1, maxItems 3, sub `label` string req maxLength 24, `href` string req maxLength 80 pattern `^/`.

**As built in PR 11** (see "PR 11 notes" in 2.5): the fields are as above, with these differences. `page_work.eyebrow` is optional. The 404 `links` repeater is the blue button first and plain links after it, and a row whose address does not start with one `/` is dropped. `page_photography` and `page_journal` have no field for the small fixed labels and links ("In progress", "See the work", "Where these photos come from", the Journal card's mark and buttons). `page_not_found` has no closing banner (the page has none).

### 1.10 Prose pages: `pages` (template collection, extended)

Relabel to "Other pages", group `Pages`, `urlPattern: '/{slug}/'`, supports `drafts`, `revisions`, `search`. Entries `privacy`, `accessibility`, `colophon`. Added fields (`title` and `content` already exist). **As built in PR 10** (see "PR 10 notes" in 2.5) the table below gained two fields, `heading` (the h1) and `eyebrow` (the small label above it), because the three pages' h1, tab title and label all differ today; `title` is the page name ("Privacy") and the tab reads `<title> | <studio>`:

| Field          | Type         | Req | Validation                                                                        | Notes                                              |
| -------------- | ------------ | --- | --------------------------------------------------------------------------------- | -------------------------------------------------- |
| `title`        | string       | yes | maxLength 60 (add)                                                                | page name; the tab reads `<title> \| <studio>`     |
| `heading`      | string       | yes | maxLength 80 (new in PR 10)                                                       | the h1 (today "What this site collects.")          |
| `eyebrow`      | string       | no  | maxLength 40 (new in PR 10)                                                       | small label above the h1 (empty on the colophon)   |
| `summary`      | text         | yes | minLength 50, maxLength 160                                                       | meta description                                   |
| `intro`        | portableText | no  |                                                                                   | lead paragraph (links allowed, for the email link) |
| `content`      | portableText | no  |                                                                                   | body; h2 headings become the table of contents     |
| `rows`         | repeater     | no  | maxItems 12; sub `label` string req maxLength 32, `detail` text req maxLength 400 | colophon label/detail rows                         |
| `show_toc`     | boolean      | no  |                                                                                   | privacy and accessibility on                       |
| `last_updated` | datetime     | no  |                                                                                   | "Last updated" line                                |

One template, `src/components/ProsePage.astro`, rendered by fixed routes `src/pages/privacy.astro`, `accessibility.astro`, `colophon.astro` (each reads its own slug; no catch-all yet). h2 ids come from `slugify` (`src/lib/portableText.ts`, the case-study rule); the Privacy ids (`contact-form`, `analytics`, ...) equal the slugified labels, but three Accessibility ids do not (`#how-its-checked`, `#where-it-stops`, `#report`), so `LEGACY_ANCHORS` in `src/lib/prosePage.ts` keeps them while the heading text is unchanged. Bullet lists inside `content` take the tick-list styling the accessibility "practices" list has today. The colophon's computed "Last built" row stays in code and renders after `rows`. The colophon's "Every page is static HTML" row was already rewritten in PR 2 ("Pages are put together on the Cloudflare network and then kept in a cache..."), so the migration copies today's text and the colophon renders with no text difference.

**Optional, PR 14:** a catch-all `src/pages/[slug].astro` that renders any published `pages` entry not matched by another route, so Nathan can publish a brand-new plain page without Claude. It must 404 for unknown slugs, add the entry to the sitemap and fall back to `og-default.png`.

### 1.11 Journal (`posts`, relabelled) and photos (`photos`, new)

`posts`: label "Journal", singular "Journal entry", `urlPattern: '/journal/{slug}/'`, supports `drafts`, `revisions`, `search`, `seo`. Field changes: `excerpt` relabel "Summary (max 200)", required, maxLength 200; `featured_image` relabel "Cover image"; `content` relabel "Body"; add `updated` datetime (optional). Publish date is the system `published_at` (correct for new entries; the journal has none today). Tags use the existing `tag` taxonomy. The `category` taxonomy is deleted. `/journal/` and `/journal/[slug]` read `posts`; drafts are native; the Header and Footer Journal visibility and `generate-og.mjs` (`journalEntries()`) switch from disk to the published `posts` entries (the OG script reads a public URL, so add journal items to `/rss.xml` and read them from there, the same fail-soft way case studies are read).

`photos` (collection, group `Photography`, supports `drafts`, `routable: false`, `titleField: 'title'`, `listColumns: ['category', 'year']`):

| Field        | Type    | Req | Validation                                             |
| ------------ | ------- | --- | ------------------------------------------------------ |
| `title`      | string  | yes | maxLength 80                                           |
| `image`      | image   | yes |                                                        |
| `alt`        | string  | yes | maxLength 160                                          |
| `category`   | select  | yes | options `events`, `portraits`, `environments`; indexed |
| `caption`    | string  | no  | maxLength 140                                          |
| `location`   | string  | no  | maxLength 60                                           |
| `year`       | integer | yes | min 2000, max 2100                                     |
| `featured`   | boolean | no  | indexed                                                |
| `sort_order` | integer | no  | min 1, max 999                                         |

Both are empty today, so migration is schema only. The Astro `journal` and `photos` content collections and their `content.config.ts` entries are deleted in PR 12.

**As built in PR 11, `photos`:** the schema is `cms/schema/photos.mjs` exactly as the table above (group "Photography", supports `drafts`, `listColumns: ['category', 'year']`; the `sort_order` field is optional and `alt` is required). `/photography` reads it through `getPhotos()` (`src/lib/photos.ts`); the Astro `photos` collection is no longer read by anything (its definition stays in `content.config.ts` until PR 12 deletes it). There is no committed fallback: zero photos, a read error and a missing table all give the "In progress" page. `posts` is untouched (PR 12).

### 1.12 Case studies (already in EmDash), small additions

PR 13 adds to `case_studies`: `in_hero` boolean (label "Show in the homepage device scene") and `hero_order` integer (min 1, max 99). `HeroShowcase` reads published entries with `in_hero` true and both `showcase_desktop` and `showcase_mobile` set, ordered by `hero_order`, host from `live_url`, tall images through `ScrollShot` (the 4096 px resizer limit, docs/EMDASH.md). Migration sets the five current hero sites. `/work/[slug]` template chrome stays in code.

### 1.13 Redirects

Move both entries from `astro.config.mjs` `redirects` into EmDash Redirects (301): `/now` to `/about/#now`, `/work/west-chester-preschool` to `/work/`. If EmDash's destination check rejects the `#` fragment, keep `/now` in `astro.config.mjs` and say so in the PR. Slug renames in the admin already create redirects automatically.

### 1.14 Stays in code (complete list)

UI strings (Back to top, Copied, theme toggle, filter "All", form labels and errors, the contact success message); CTA and button hrefs; the case-study page template text and the per-sector CTA and plural map; `orgTypes`; `Terminal.astro`; `ComingSoon.astro` copy (the standalone `/coming-soon/` page reads only `site_settings`); `ClientLogos` and `PressMentions` scaffolds (empty; becoming collections is a later, separate design once there is content and client permission); `Newsletter` copy (it renders nothing until `newsletter_url` is set); OG card titles (`STATIC_PAGES`); `domain`, `url`; analytics IDs and tokens (env vars).

---

## 2. Build plan

### 2.1 How every content PR works (the recipe)

Each PR follows these steps in this order. Steps 2 to 4 write to production and are run by the main session with Nathan's go-ahead, never by a builder agent on its own.

1. **Branch, schema file, content file.** Add `cms/schema/<collection>.mjs`. Move the literal values out of the `.astro`/`.ts` file into `cms/content/<collection>.json` by a scripted extraction where the source is a data module (`node --experimental-strip-types -e "import('./src/data/pricing.ts')..."`) and by moving the literal array verbatim where it is inline in a component. Images become `{ "$file": "<repo path>", "alt": "..." }`.
2. **Schema into production:** `EMDASH_TOKEN=... node scripts/cms/apply-schema.mjs --collection <slug> --url https://www.nixoncreativestudio.com --yes` (section 2.6) (REST; the CLI cannot set options, flags, groups or titleField). Idempotent.
3. **Content into production:** `node scripts/cms/load-content.mjs --collection <slug> --url <prod> --yes`: uploads `$file` images with `emdash media upload` (SHA-1 de-dup, reusing `scripts/lib/emdash-cli.mjs`), then `emdash content create --slug <slug> --file <tmp.json>` or `content update --rev`, published. Menus and redirects go through REST (`/menus`, `/redirects`) in the same script. Nothing reads the new data yet, so this is invisible on the live site.
4. **Seed and CI dataset:** re-export `seed/seed.json` from production (`node scripts/export-seed-from-instance.mjs --url <prod>`), then rebuild `ncs-ci` (section 2.3) and commit the regenerated `scripts/ci-dataset/rows.sql`.
5. **Code:** the page or component reads through `src/lib/cms.ts`; the hardcoded literals are deleted in the same PR (the JSON in `cms/content/` is the fallback, section 0 item 9).
6. **Docs in the same PR:** `CLAUDE.md` (what moved, any new gotcha), this file's status table (2.5), `docs/EDITING-GUIDE.md` (the section for what became editable), `tests/routes.ts` if a route changed.

**Acceptance gates, every PR.** Evidence goes in the PR description.

- `npm run check` (astro check plus lint, zero errors), `npm run format:check`, `npm run test:unit`.
- CI green: smoke, `a11y` (light) and `a11y-dark` on every route, reduced-motion, reflow, on chromium and webkit-iphone, against the PR's Worker preview on the rebuilt `ncs-ci` data.
- Lighthouse CI green (accessibility 1.0, LCP under 4.5 s, CLS under 0.1).
- **Render parity:** with `ncs-ci` rebuilt and the `ci` Worker running `main`, `npm run parity capture --url https://ncs-ci.nathanjnixon86.workers.dev --routes <changed routes>`, then `npm run parity compare --url <PR preview alias URL> --routes <same>`. Expected: zero DIFF, or only the DIFFs listed and explained in the PR. Both sides read the same `ncs-ci` data, so a DIFF can only come from the code or the migrated values. Capture and compare on the same day (the About freshness pill is relative).
- **Edit proof, after merge:** in the production admin, change one field of the migrated content, publish, and confirm the live page shows it within the cache window (section 3), then restore it from History. Screenshot both states.

### 2.2 Ordered PRs

Each is independently shippable: the site works and stays green after every one.

| #   | PR                                      | Contents                                                                                                                                                                                                                                                                                                 | Extra gate                                                                                                                                  |
| --- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 0   | Merge `ci-dedicated-dataset`            | Prerequisite: CI previews on the `ncs-ci` Worker, D1, R2, KV (branch already built, commit `4026554`).                                                                                                                                                                                                   | CI green on the PR.                                                                                                                         |
| 1   | CI dataset tooling                      | `scripts/ci-dataset/` (2.3) reproducing today's 3-case-study `ncs-ci` from `seed/seed.json` plus `rows.sql`; extend `export-seed-from-instance.mjs` to export menus, redirects and each collection's admin settings (`titleField`, `group`, `sortOrder`, `hidden`, `admin`, field `validation`).         | Rebuild `ncs-ci` from nothing; parity of all routes before vs after the rebuild: zero DIFF.                                                 |
| 2   | All routes server-rendered, route cache | `output: 'server'`; remove per-page `prerender`; `cache: { provider: cacheCloudflare() }`; `routeRules` default; `emdash({ toolbar: 'client' })`; sitemap `customPages` for every static route; `prefetch.defaultStrategy` decided by the measurement below. No content moves. Section 3 has the detail. | Parity all routes zero DIFF; unknown URL still 404; TTFB measured before/after (section 3.4); Lighthouse green.                             |
| 3   | CMS foundation                          | `scripts/lib/emdash-schema.mjs`, `scripts/cms/apply-schema.mjs`, `scripts/cms/load-content.mjs`, `src/lib/cms.ts` (with fallback), `cms/` folders, unit tests for the normalisers and the fallback (`src/lib/cms.test.ts`). No page changes.                                                             | Unit tests cover: 0/1 booleans, empty repeaters, missing entry falls back to JSON, D1 error falls back to JSON.                             |
| 4   | Site settings and menus                 | `site_settings`, menus `primary` and `footer`; Header, MobileNav (props), Footer, BaseLayout description, StructuredData, contact subject, RSS meta, CopyEmail sources; `site.ts` trimmed.                                                                                                               | Smoke asserts the footer email and the four header links on every route.                                                                    |
| 5   | Pricing                                 | `pricing_tiers`, `pricing_addons`; PricingTeaser and the services tier and add-on blocks; delete `pricing.ts`.                                                                                                                                                                                           | Count-up static values equal the CMS numbers (no-JS check).                                                                                 |
| 6   | Homepage copy                           | `page_home`; Hero, SelectedWork chrome, PricingTeaser copy, ProcessBand (both placements).                                                                                                                                                                                                               | Hero LCP element unchanged (Lighthouse LCP within 10% of PR 2's number).                                                                    |
| 7   | Services                                | `page_services`, `service_offerings`; Service and FAQPage JSON-LD from the data.                                                                                                                                                                                                                         | JSON-LD on `/services` byte-equal to before (parity covers it; also validate in Google's Rich Results test, screenshot).                    |
| 8   | About                                   | `page_about`; headshot and 5 photos to R2; Testimonials heading; LighthouseScore numbers; Person JSON-LD.                                                                                                                                                                                                | Headshot served as resized WebP from `/_image` (not the original); both themes screenshotted at 1440 and 390.                               |
| 9   | Contact                                 | `page_contact`; option lists submit labels.                                                                                                                                                                                                                                                              | One test submission per option list in a Web3Forms test (with Nathan) showing the label in the email.                                       |
| 10  | Prose pages                             | `pages` fields; `ProsePage.astro`; privacy, accessibility, colophon entries; TOC from h2.                                                                                                                                                                                                                | Every old in-page anchor resolves (link check); expected DIFF on the colophon row text only.                                                |
| 11  | Work, photography, journal index, 404   | `page_work`, `page_photography`, `page_journal`, `page_not_found`, `photos` schema; photography page reads `photos`.                                                                                                                                                                                     | Photography empty state unchanged with zero photos; with one test photo in `ncs-ci` rows, the gallery renders and passes axe.               |
| 12  | Journal into EmDash, cleanup            | `posts` relabel and fields, `/journal/*` from `posts`, nav visibility, OG from `/rss.xml`; delete the Astro `journal`, `photos` and `case-studies` collections, their content folders and the old MDX case studies.                                                                                      | `npm run build` with the deleted collections; journal routes 200 with zero entries; one draft entry in `ncs-ci` is not visible.             |
| 13  | Redirects and hero scene                | EmDash Redirects; `in_hero`, `hero_order` on `case_studies`; `HeroShowcase` from case studies.                                                                                                                                                                                                           | `/now` and the retired slug answer 301 on the preview; homepage bytes not above PR 6 (Lighthouse total byte weight).                        |
| 14  | Admin tidy and the editing guide        | Section 4 actions; collection `sortOrder` and labels; optional catch-all `pages` route; `docs/EDITING-GUIDE.md` finished (section 6); CLAUDE.md "Content editing" section rewritten.                                                                                                                     | Nathan does three real edits from the guide alone (a price, a FAQ answer, the Currently block) with no help; note anything he got stuck on. |

Model guidance for whoever delegates: PRs 2 and 3 carry the real design risk (caching, the fallback, the generic schema applier) and want a strong model with review; PRs 4 to 13 are mechanical against this document and suit a lighter model; the production data steps stay in the main session.

### 2.3 The `ncs-ci` dataset

Today `ncs-ci` was built once by hand-copied SQL (docs/TESTING.md on the `ci-dedicated-dataset` branch) and has no admin user, by design. That does not scale to a dozen new collections, so PR 1 makes it reproducible:

- `scripts/ci-dataset/rebuild.mjs` (run by hand, `CLOUDFLARE_ENV=ci`):
  1. Drop every table in D1 `ncs-ci` (list from `sqlite_master`, skip `sqlite_*` and `_cf_*`).
  2. `CLOUDFLARE_ENV=ci npm run build && CLOUDFLARE_ENV=ci npx wrangler deploy`, then one GET of `/` so EmDash runs its migrations and applies `seed/seed.json` (schema, taxonomies, menus, redirects).
  3. `wrangler d1 execute ncs-ci --remote --file scripts/ci-dataset/rows.sql`.
  4. Copy every R2 object listed in `scripts/ci-dataset/media.json` from `ncs-emdash-media-prod` to `ncs-ci-media` (`wrangler r2 object get` then `put`, skipping keys already present).
- `scripts/ci-dataset/snapshot.mjs` writes `rows.sql` and `media.json` from production, read-only (`wrangler d1 execute ncs-emdash-prod --remote --json --command "SELECT ..."`):
  - Content rows of an allowlist: `case_studies` (the 3 CI slugs only), every singleton collection, `pricing_tiers`, `pricing_addons`, `service_offerings`, `pages` (privacy, accessibility, colophon). `photos` and `posts`: hand-written test rows instead, so production does not need test content. As built in PR 11, the one test photo is `scripts/ci-dataset/ci-content/photos.json` (merged by `cms-fixtures.mjs`, because it needs a media row and an R2 file); the published and draft journal entries are still to come in PR 12 (`fixtures.sql`).
  - Each row as `INSERT OR REPLACE INTO ec_<slug> (<explicit column list>) VALUES (...)`, using only columns present in both databases, with `author_id`, `primary_byline_id`, `live_revision_id`, `draft_revision_id` set to NULL.
  - The `media` rows for every media id found inside those rows' JSON, plus `content_taxonomies` links and taxonomy terms for the 3 case studies.
  - An allowlist of `options` keys (site title, tagline, the setup-complete flags). Never users, sessions, tokens, passkeys or other options.
- `tests/routes.ts` keeps listing exactly the CI slugs. Add a fixtures line when a fixture adds a route (the journal entry).
- The snapshot is committed, so CI renders pinned content; it is refreshed only in a PR that adds a collection or needs new content to test. Nathan's day-to-day edits in production never touch CI.
- Docs: the "The `ncs-ci` dataset" section of `docs/TESTING.md` is rewritten around these two scripts.

### 2.4 Migration tooling details builders need

- **Auth for production writes:** `emdash login --url https://www.nixoncreativestudio.com` (device code, approved by Nathan in his browser) for CLI steps, and an API token in `EMDASH_TOKEN` for REST steps (Nathan creates it under Settings, API tokens, and keeps it in 1Password). The admin-console fallback in docs/EMDASH-SCHEMA.md works when no token is available.
- **Seed shape:** the exported seed must round-trip new field `validation` (maxLength, options, minItems, subFields) and collection admin settings; PR 1 checks this by diffing a re-export against the source definitions.
- **`$file` images:** the loader resolves the path from the repo root, uploads once, and writes the server's image value back into the entry. Re-running the loader is a no-op.
- **Portable Text** (About story, prose pages): convert the existing paragraphs with EmDash's `markdownToPortableText`, as `migrate-case-studies.mjs` does, after turning the inline `<a href>` links in the `.astro` source into Markdown links.

### 2.5 Status

| PR       | State                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0        | merged (#51)                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 1        | merged (#53): `scripts/ci-dataset/` (snapshot, rebuild, fixtures), `npm run ci-dataset`, seed export extended                                                                                                                                                                                                                                                                                                                                 |
| 2        | merged (#55): `output: 'server'`, route cache, `toolbar: 'client'`, measurements below                                                                                                                                                                                                                                                                                                                                                        |
| 3        | merged (#56): the shared tooling and reader (`scripts/cms/`, `src/lib/cms.ts`, notes below), no page changes                                                                                                                                                                                                                                                                                                                                  |
| 4        | built, in review: `site_settings` and the `primary` and `footer` menus, read with the committed-JSON fallback; production data NOT loaded yet (needs `EMDASH_TOKEN`, 2.6 and docs/LAUNCH-RUNBOOK.md)                                                                                                                                                                                                                                          |
| 5        | built, in review: `pricing_tiers` and `pricing_addons`, read by the homepage teaser and /services with the committed-JSON fallback, `src/data/pricing.ts` deleted; production data NOT loaded yet (needs `EMDASH_TOKEN`, 2.6 and docs/LAUNCH-RUNBOOK.md)                                                                                                                                                                                      |
| 6        | built, in review: `page_home`, read by the Hero, Selected Work, "What it costs" and Process Band (also on /services) with the committed-JSON fallback; production data NOT loaded yet (needs `EMDASH_TOKEN`, 2.6 and docs/LAUNCH-RUNBOOK.md)                                                                                                                                                                                                  |
| 7        | built, in review: `page_services` and `service_offerings`, read by /services with the committed-JSON fallback, Service and FAQPage JSON-LD built from the data, and the hero "byone person" typo fixed; production data NOT loaded yet (needs `EMDASH_TOKEN`, 2.6 and docs/LAUNCH-RUNBOOK.md)                                                                                                                                                 |
| 8        | built, in review: `page_about`, read by /about with the committed-JSON fallback, Person JSON-LD built from the data, pictures through the new `EmDashPhoto` (resized WebP from `/_image`); production data NOT loaded yet (needs `EMDASH_TOKEN`, 2.6 and docs/LAUNCH-RUNBOOK.md)                                                                                                                                                              |
| 9        | built, in review: `page_contact`, read by /contact with the committed-JSON fallback; the Budget, Timeline and Heard-from lists submit their visible LABEL instead of a code (Nathan's decision); production data NOT loaded yet (needs `EMDASH_TOKEN`, 2.6 and docs/LAUNCH-RUNBOOK.md)                                                                                                                                                        |
| 10       | built, in review: the template `pages` collection extended, read by /privacy, /accessibility and /colophon through `ProsePage.astro` with the committed-JSON fallback, section ids and the scroll-spy kept; production data NOT loaded yet (needs `EMDASH_TOKEN`, 2.6 and docs/LAUNCH-RUNBOOK.md)                                                                                                                                             |
| 11       | built, in review: `page_work`, `page_photography`, `page_journal`, `page_not_found` and the new `photos` collection; /work, /photography, /journal and the 404 page read them with the committed-JSON fallback, the photography page reads `photos` through `PhotoGallery.tsx` with width-only `/_image` URLs and keeps its empty state at zero photos; production data NOT loaded yet (needs `EMDASH_TOKEN`, 2.6 and docs/LAUNCH-RUNBOOK.md) |
| 12 to 14 | not started                                                                                                                                                                                                                                                                                                                                                                                                                                   |

**PR 1 notes (2026-10-03).** Two deviations from section 2.3, both forced by the rule that production is read only through the `emdash` CLI login and public URLs: (1) `snapshot.mjs` builds rows from `content get --raw --published`, `media list` and `taxonomy terms`, not from `wrangler d1 execute` on production, so it maps fields to `ec_<slug>` columns itself (images and repeaters as JSON text, system and author ids nulled) and was checked against the previously hand-built `ncs-ci` rows: body and highlights JSON semantically equal, only media storage keys differ (CI now uses production's keys); (2) per-entry taxonomy links are not readable through the CLI, so `terms.json` pins them. R2 files are copied from the live site's public media URLs with a size and SHA-1 check, not from the production bucket. `--from-scratch` drops tables children-first: dropping `users` before `_emdash_comments` fails with `no such table: main.users`, which is the real error D1 returns (as `D1_RESET_DO`) for an import that hits it. `export-seed-from-instance.mjs` gained `--check` and now writes the seed through prettier; its menu, redirect and `titleField`/`sortOrder`/`admin` paths need an API token or a non-empty menu to prove (docs/PENDING.md item 6). A re-export against production changed one thing in `seed/seed.json`: `urlPattern: "/work/{slug}/"` on `case_studies`.

**PR 2 notes (2026-10-03).** The route cache works on this account: Workers Cache answers `MISS` then `HIT` on workers.dev, partitioned by Worker version, and the adapter writes `cache.enabled` into the wrangler config itself, so the 3.2 fallback was not needed. Measured warm TTFB on ncs-ci: `/` 200 to 86 ms, `/about/` 186 to 84 ms, `/privacy/` 90 to 82 ms, `/contact/` 90 to 81 ms, case study 186 to 83 ms; the first request after a deploy is a MISS of 0.5 to 1.6 s. Lighthouse LCP did not regress (homepage 3.5 to 3.2 s, case study 3.9 to 3.8 s, same machine). Four deviations from 3.2 and 3.3, all in `docs/EMDASH.md` "Route cache": (1) no global `routeRules` entry, because `'/[...path]'` also matches `/_emdash/**`; `BaseLayout` sets the lifetime per page instead; (2) the lifetime is 5 minutes, not a day, until a real publish has been seen to purge on the live zone (the end-to-end proof needs an admin login, so it is a first-deploy check in `docs/PENDING.md`); stale-while-revalidate keeps visitors fast anyway; (3) `src/worker.ts` also redirects slashless page URLs, forces `no-store` on non-200s and cookies, and adds the five `_headers` security headers to HTML, because the assets binding no longer serves HTML; (4) `/404/` answers 200 by name so the Lighthouse gate can still audit the template. The colophon "Every page is static HTML" line was rewritten (question 7 was answered by the task, not by Nathan: say so if the wording needs changing).

**PR 3 notes (2026-10-03).** Built exactly the foundation in the table, plus `RestrictedPortableText.astro` (the restricted About and prose-page renderer, section 1.7), `scripts/cms/markdown-to-pt.mjs` and a parity `--snap-dir` flag. No collection is created, no page reads the new code, and `cms/schema/` and `cms/content/` are empty, so nothing about the site or production changed. What a builder of PRs 4 to 13 needs to know:

- **Repeater sub-field limits are not enforced.** EmDash 1.1.0 keeps only `slug`, `type`, `label`, `required` and `options` on a repeater sub-field (`repeaterSubFieldSchema` in `node_modules/emdash/src/api/schemas/schema.ts`); a `maxLength` on a sub-field is silently stripped. Every "sub `text` string req maxLength 48" in sections 1.4 to 1.9 is therefore a convention, not a server rule. Field-level `minItems` and `maxItems` on the repeater are enforced. `validateDef()` prints a warning for each sub-field limit it finds so the editing guide can state it ("keep each line under 48 characters"); keep the number in the field label and the guide, and let the component clamp or tolerate a longer value.
- **`titleField` and `commentsEnabled` cannot be sent when a collection is created.** `applyCollectionSchema` creates the collection, adds the fields, and only then applies the whole `COLLECTION` object with a PUT (titleField must name an existing field). Write `COLLECTION` as the full intended settings; the applier splits them.
- **Schema definitions** are `cms/schema/<collection>.mjs` exporting `SLUG` (must equal the file name), `COLLECTION`, `FIELDS` and optionally `OBSOLETE_FIELDS`. Build singletons with `singletonSettings({ label, group, titleField })` and `commonPageFields({ cta: true })` from `scripts/lib/emdash-schema.mjs`. `npm run test:unit` validates every definition in the folder (reserved slugs, select options, flat sub-field types, titleField and listColumns naming real fields), and warns on a string field with no `maxLength`.
- **Reader API** (`src/lib/cms.ts`): `getSingleton(collection, slug, normalize, { cache: Astro.cache })` returns `{ slug, data, source }`; `getOrdered(collection, normalize, { orderBy, descending, limit, cache })` for the lists (default sort `sort_order`, ties by slug); `getMenuItems(name, { cache })` for menus. `normalize(raw)` is the page's own function and builds its typed shape from the exported helpers `text`, `bool`, `int`, `num`, `date`, `image`, `rows`, `texts`, `portable`, `choice`. The fallback (committed JSON, bundled by `src/lib/cmsFallback.ts` with Vite's eager glob) is used when the entry is missing or unpublished, the read errors or throws, or `normalize` throws, and it logs `[cms] ...` through `console.error`. An empty list falls back too when a JSON list exists. With no JSON for the entry the call throws, because that is a developer error. A fallback image (`{ "$file" }`) reads as no image, so a component must tolerate that (the design already requires it for a missing alt).
- **Caching:** the read adds its `cacheHint` to the page even when it falls back, so publishing the missing entry later purges the page. A fallback render is cached like any other for `PAGE_MAX_AGE` (5 minutes); the outage case is bounded by that, not by a `no-store`.
- **Content files:** `cms/content/<collection>.json` is `{ "slug", "data" }` or an array of those; `menus.json` is `{ "<menu>": { "label", "items": [{ "label", "url", "titleAttr?", "target?" }] } }`; `redirects.json` is `[{ "source", "destination", "type?" }]`. Images are `{ "$file", "alt" }`. Portable Text fields hold literal blocks (the same JSON is the fallback); generate them with `npm run cms:pt -- file.md`. The loader's `$markdown` shortcut was considered and dropped, because the offline fallback cannot render Markdown.
- **Parity for CMS PRs** (the recipe's "capture on main, compare on the PR" step) uses a throwaway snapshot directory so it cannot overwrite the committed static-build baselines: `npm run parity capture -- --snap-dir .parity-cms --url <ncs-ci URL> --routes /,/services/`, then `npm run parity compare -- --snap-dir .parity-cms --url <PR preview URL> --routes /,/services/`. `.parity-cms/` is git-ignored. (`PARITY_SNAP_DIR` does the same.)
- **Not proven against a live authenticated instance.** `ncs-ci` has no admin user by design, so there was no token to run `apply-schema.mjs` or `load-content.mjs` against a real EmDash. They were tested against in-memory fakes modelled on the server's own zod schemas (create-only and update-only settings, the field and reorder endpoints) and against the CLI's documented command surface. Two shapes are read defensively because they could not be observed: the field rows' sort key (`sortOrder` or `sort_order`) and a menu item's URL key (`customUrl`, `custom_url` or `url`). The first real run is therefore a `--dry-run` (section 2.6, step 1); a surprise there is a one-line fix in the helper, not a data problem, because a dry run writes nothing.

**PR 4 notes (2026-10-03).** Site settings and menus are built, and the PR is safe to merge with production still empty: every read goes through `getSite()` (`src/data/site.ts`) and `getMenuItems()` (`src/lib/cms.ts`), and when the entry or menu is missing they serve the committed `cms/content/site_settings.json` and `menus.json`, which hold the literal values lifted from the old code. What a builder of PRs 5 to 13 needs to know:

- **Nothing was written to production.** There is no admin token, so the schema and content are committed (`cms/schema/site_settings.mjs`, `cms/content/site_settings.json`, `cms/content/menus.json`) and the main session loads them later with the commands in 2.6 ("PR 4 data"). Until then the live site renders from the fallback, and each page logs `[cms] site_settings/site is missing or unpublished; serving the committed fallback` once per cache window.
- **Render parity, measured.** `ncs-ci` was captured running `main`, then the PR build was deployed to it twice: first with no `site_settings` table (the same state as production today: fallback path), then after `npm run ci-dataset -- --from-scratch` with the collection and menus loaded (CMS path, proved live by editing a field in D1 and seeing the page change). All 14 pages and `/rss.xml` are byte-identical to `main` once one element is excluded: the `<astro-island ... MobileNav>` opening tag, whose `uid` and serialised `props` now carry the CMS values (`ctaLabel`, `email`, `phone`, social URLs, per-link `descriptor`). That is the only expected DIFF; the island hydrates to the same menu.
- **The reader pattern for shared values** is `const site = await getSite(Astro)` (or `getSite(context)` in an endpoint). One D1 read per request (a `WeakMap` keyed on `Astro.request`) and one cache tag no matter how many components ask. `SITE_URL` and `SITE_DOMAIN` are code constants for the callers that only need the origin. React islands must NOT import `src/data/site.ts` (it would put the reader in the browser bundle): `Header.astro` passes values as props, as it does for `MobileNav`.
- **`MobileNav` descriptors** come from each menu item's "Title attribute" (`titleAttr`), as designed. The old `DESCRIPTIONS` map is gone, including its `/contact` entry, which was dead (Contact is not a drawer link).
- **No `footer_blurb` field.** Section 1.2 lists one, but the footer has no brand paragraph today (its bottom row shows the tagline), so a field would edit nothing and a new paragraph would change the footer. Left out; add it with a design for the paragraph.
- **`CtaBanner` defaults** (`cta_default_*`) and `header_cta_label` are wired, because a field that edits nothing is worse than none. The footer's own "Start a project" button and the hero buttons stay in code (page copy, PR 6).
- **Journal auto-hide** stays in code for both menus: any item whose URL starts with `/journal` is dropped while the journal collection has no published entry.
- **CI exercises the CMS path.** `ncs-ci` has no admin user, so its CMS data comes from `scripts/ci-dataset/cms-fixtures.mjs`, which builds the collection and menus into `seed/seed.json` and the entries into `scripts/ci-dataset/cms-rows.sql` straight from `cms/`. A unit test (`ciFixtures.test.ts`) fails if those generated files are stale. The fallback path is covered by `site.test.ts` (and was exercised live, above). When production holds the data, add the collection to `PRODUCTION_HAS` in `cms-fixtures.mjs` so `snapshot.mjs` becomes the source.
- **The acceptance gate** is `tests/smoke.spec.ts`: on every route except the standalone `/coming-soon`, the header has Work, Services and About with the right hrefs (Journal is hidden until an entry exists), the "Start a project" button, and the footer email link.

**PR 5 notes (2026-10-03).** Pricing is built and safe to merge with production still empty: `getPricingTiers()` and `getAddOns()` (`src/lib/pricing.ts`) read the two collections through `getOrdered()`, and an empty, unpublished or unreadable collection serves the committed `cms/content/pricing_tiers.json` and `pricing_addons.json` whole. What a builder of PRs 6 to 13 needs to know:

- **Values were lifted from the code on main, not from older docs.** The care plan add-on reads "from $100/mo" (PR #41), Launch $4,000, Signature $7,000, Flagship $12,000. The extraction is a one-off script over `src/data/pricing.ts` (deleted in the same PR), so the JSON is byte-for-byte what the old module held.
- **Nothing was written to production.** Schemas and content are committed; the main session loads them with the commands in 2.6 ("PR 5 data"). Until then each page logs `[cms] pricing_tiers has no published entries; serving the committed fallback` once per cache window.
- **Render rules live in `src/lib/pricing.ts`, not the template:** first 3 tiers by `sort_order`, only the first recommended tier keeps the accent treatment and its badge (a second ticked box renders plain), first 3 add-ons. A tier with a blank name, price, who, range, note or no included lines makes the whole list fall back, so a half-saved edit cannot blank the table.
- **The count-up needs no special handling.** `price_from` is an integer; both templates print it as the static text of the count-up span and as `data-countup-to`. `tests/pricing.spec.ts` loads `/` and `/services/` with JavaScript off and asserts each static number equals its target and the committed price.
- **JSON-LD.** The Web design `Service` offer takes its `minPrice` from the first tier, so it follows the CMS. The Strategy ($1,500) and Photography ($900) floors stayed literals in `services.astro` until PR 7 moved them into `service_offerings.price_from` (the photography add-on's price is display text, with no number to read).
- **Prose that quotes prices stays in code:** the /services FAQ answers and the /contact budget brackets (PRs 7 and 9). The field labels and the editing guide say to check them after a price change.
- **CI exercises the CMS path** through `cms-fixtures.mjs` exactly as for PR 4 (a new collection needs `npm run ci-dataset -- --from-scratch`). **Render parity, measured.** `ncs-ci` was captured running `main` (routes `/`, `/services/`, `/contact/`, `/about/`, `/work/`), then the PR build was deployed to it twice: first with no pricing tables (production's state today: the fallback path), then after `npm run ci-dataset -- --from-scratch` and a refresh with both collections loaded (the CMS path). Both runs: 5/5 PASS, zero DIFF, no expected exceptions. The CMS path was proved live by editing Launch's `price_from` to 4100 in D1: `/services/` printed `4,100` with `data-countup-to="4100"` and the Web design JSON-LD `minPrice` became 4100; it was restored to 4000. One operational snag: right after `--from-scratch` the first request to `/` returned 500 while EmDash finished migrating and seeding, and `rebuild.mjs` stopped with "ncs-ci has no table ..."; a plain `npm run ci-dataset` a minute later completed it.

**PR 6 notes (2026-10-03).** The homepage words are built and safe to merge with production still empty: `getHomePage()` (`src/lib/homePage.ts`) reads the `page_home` singleton (entry `home`) and, when it is missing, unpublished, unreadable, has a blank required field or a short process or includes list, serves the committed `cms/content/page_home.json`, the literal text the four components held. What a builder of PRs 7 to 13 needs to know:

- **Nothing was written to production.** The schema (`cms/schema/page_home.mjs`, 25 fields) and content are committed; the main session loads them with the commands in 2.6 ("PR 6 data"). Until then each page that reads it logs `[cms] page_home/home is missing or unpublished; serving the committed fallback` once per cache window.
- **One reader, five consumers.** The Hero, `SelectedWork`, `PricingTeaser`, `ProcessBand` and `index.astro` (title and description) all call `getHomePage(Astro)`; a `WeakMap` on `Astro.request` makes it one D1 read and one cache tag per request. `ProcessBand` is also rendered by `/services`, so that page now carries the `page_home` tag too and a publish purges both.
- **Constrained fields, as designed.** The headline is `hero_heading` plus `hero_heading_accent` (maxLength 32 and 28, rendered in the existing `text-link dark:text-tertiary` span), the proof line is three fields around the `/about` link, `pricing_includes` and `process_steps` are exactly four rows (`minItems` and `maxItems` 4, enforced by the server; the reader also falls back on fewer and cuts extras), and the step numbers 01 to 04 are counted from order, never edited. Row-level limits (a step's title and body length) are not enforced by EmDash (PR 3 notes); the labels say them.
- **The hero is still the LCP element it was.** It stays server-rendered with the CSS-only first-frame entrance; the CMS read happens before render, so there is nothing for the visitor to wait on and no `data-reveal` ancestor (`tests/home-copy.spec.ts` asserts it). Measured on `ncs-ci` (Lighthouse CLI mobile, same machine and session, route cache warm, 12 runs per arm): median LCP 3614 ms on `main`, 3615 ms on the CMS path, 3624 ms on the fallback path (16 runs); the LCP element is the hero phone screenshot in every run. The scores are bimodal (2.7 to 2.9 s and 3.6 s), so the first 6-run baseline of 3227 ms was luck, not a faster page; compare 12 runs or more.
- **Render parity, measured.** `ncs-ci` was captured running `main` (routes `/`, `/services/`, `/about/`, `/work/`, `/contact/`), then the PR build was deployed twice: first with no `page_home` table (production's state: the fallback path), then after `npm run ci-dataset -- --from-scratch` with the entry loaded (the CMS path). Both runs: 4/5 PASS, and the one DIFF is the expected one: the homepage `meta name="description"`, `og:description` and `twitter:description` change from the bare studio name to the tagline. The design seeds the homepage description with the tagline (1.1) because it had none, so this is the single deliberate rendered change; say so to Nathan before merging. Everything else, including every hero byte, the three sections and the `/services` process recap, is identical. The CMS path was proved live by setting `hero_heading_accent` to a marker in D1 and seeing the hero change on a `?_preview` URL (never cached), then restoring it.
- **Found, not fixed (output kept identical on purpose):** the live hero proof line renders "photographed byone person" because there is no space before the link (the old template collapsed it identically). Logged in docs/PENDING.md.
- **Not in the entry:** section order, the buttons' hrefs, the step numbers, the hero device scene and the client marquee (derived from case studies), and the footer's own "Start a project" button.
- **CI exercises the CMS path** through `cms-fixtures.mjs` exactly as for PRs 4 and 5 (a new collection needs `npm run ci-dataset -- --from-scratch`), and `ciFixtures.test.ts` fails if the generated seed and rows are stale. The route cache keeps the empty page `--from-scratch` fetches for 5 minutes; a parity capture right after it needs a wait (or a new deploy, which starts a fresh cache).

**PR 7 notes (2026-10-03).** The Services page is built and safe to merge with production still empty: `getServicesPage()` and `getServiceOfferings()` (`src/lib/servicesPage.ts`) read the `page_services` singleton (entry `services`) and the `service_offerings` list, and a missing, unpublished or unreadable entry, a blank required field, a short reasons list, a FAQ under three complete rows or an offering with no included lines serves the committed `cms/content/page_services.json` and `service_offerings.json`, the literal text `services.astro` held. What a builder of PRs 8 to 13 needs to know:

- **Nothing was written to production.** The schemas (`cms/schema/page_services.mjs`, 17 fields, and `service_offerings.mjs`, 9 fields) and content are committed; the main session loads them with the commands in 2.6 ("PR 7 data"). Until then `/services` logs `[cms] page_services/services is missing or unpublished` and `service_offerings has no published entries` once per cache window and renders from the fallback.
- **JSON-LD is built from the data, and byte-equal to before.** `buildServiceSchemas()` (pure, in `servicesPage.ts`) makes one Service per offering plus the FAQPage from the same rows the page renders. `src/lib/servicesPage.jsonld.golden.json` is the Service and FAQPage part of the structured data captured from the live page on `main` before the change; `servicesPage.test.ts` requires the fallback path and the CMS path to reproduce it with `JSON.stringify` equality, and `tests/services-copy.spec.ts` checks the live page's JSON-LD against the content files. The Strategy ($1,500) and Photography ($900) floors are now `service_offerings.price_from`, so a price change needs no code edit. Web design's floor still follows the first Pricing tier (PR 5): leave its `price_from` empty (a number typed there would win over the tier), which is why that field is optional.
- **Deviation: no `image` field.** Section 1.6 listed an image on each offering. The Web design screenshot is a local Astro asset (`second-presbyterian-chicago.png`) rendered through `<Image>`, and a CMS image would need the remote-image path that PR 8 builds for the About headshot, so for now it stays in code, in an `offeringImages` map keyed by the offering slug. The `image_alt` field is real: it must be filled in for the picture to show, otherwise the placeholder panel renders, so a picture can never ship without alt text (the design's rule). When PR 8 lands the image path, add the field and drop the map.
- **Other deviations from the first draft, all in 1.6 now.** `pricing_sub` allows 400 characters (the real paragraph is 323; the draft's 220 would have rejected it) and `pricing_footnote` (200) is the "Strategy is the front of every project" line under the tier cards, which the draft's table mislabelled. The stored `seo_title` is the bare "Services": code adds " | <studio name>" (`servicesTitle()`), like the homepage. The closing-banner fields (`cta_title`, `cta_sub`) are seeded with the current "Ready to scope a project?" copy; empty would fall back to the site default.
- **Constrained fields, as designed.** `why_items` is exactly four rows (enforced), the FAQ allows 3 to 10 (enforced; the reader also cuts extras), each chapter has 3 to 5 included lines, and the three chapters are the first three by `sort_order`. Row-level limits (an answer's length) are not enforced by EmDash (PR 3 notes); the labels say them. `area_served` and `placeholder_icon` are selects, so the structured data and the placeholder glyph cannot be mistyped. The SVG markup for the glyphs stays in code.
- **FAQ prose that quotes prices is still prose.** "What does it cost?" and "Do you offer maintenance?" now live in the FAQ rows (editable in the admin), but the numbers inside them are text, not read from the tiers. The field label says to check them after a price change; a real price change is now two edits (the tier, and the FAQ answer) plus the contact budget brackets in PR 9.
- **Render parity, measured.** `ncs-ci` was captured running `main` (routes `/`, `/services/`, `/about/`, `/work/`, `/contact/`), then the PR build was deployed twice: first with no `page_services` or `service_offerings` table (production's state: the fallback path), then after `npm run ci-dataset -- --from-scratch` with both loaded (the CMS path). Both runs: 4/5 PASS, zero DIFF on `/services/`, and the one DIFF is the expected one, on the homepage: the hero proof line now has the space it was missing ("photographed by one person", was "photographed byone person"). With that single space applied to the baseline both runs are 5/5 PASS, which proves it is the only change. The `/services/` JSON-LD block, fetched raw from the CMS-path Worker, is byte-identical (`cmp`) to the one captured from `main`. The CMS path was proved live by editing the heading, Strategy's `price_from` and the first FAQ answer in D1: the page showed the new heading, the JSON-LD floor became 1777 and the answer appeared in both the visible FAQ and the FAQPage; restored with a plain `npm run ci-dataset`.
- **The hero typo.** `Hero.astro` rendered "photographed byone person" because Astro collapses the newline between `{proof.before}` and the `<a>`. The fix is `{proof.before}{' '}` in the template (not a trailing space in the stored value, which the admin would trim and a future editor could delete). `tests/home-copy.spec.ts` now asserts the space. Nothing else in the hero changed by a byte.
- **CI exercises the CMS path** through `cms-fixtures.mjs` exactly as for PRs 4 to 6 (new collections need `npm run ci-dataset -- --from-scratch`), and `ciFixtures.test.ts` fails if the generated seed and rows are stale. Wait out the 5-minute route cache after a rebuild, or redeploy the existing `dist` (`CLOUDFLARE_ENV=ci npx wrangler deploy`) for a clean cache, before a parity capture.

**PR 8 notes (2026-10-03).** The About page is built and safe to merge with production still empty: `getAboutPage()` (`src/lib/aboutPage.ts`) reads the `page_about` singleton (entry `about`) and serves the committed `cms/content/page_about.json` (the literal text, plus `$file` references to the bundled pictures) when the entry is missing, unpublished or unreadable or fails its checks. What a builder of PRs 9 to 13 needs to know:

- **Nothing was written to production.** The schema (`cms/schema/page_about.mjs`, 35 fields) and content are committed; the main session loads them with the commands in 2.6 ("PR 8 data"), which upload the six images. Until then `/about` logs `[cms] page_about/about is missing or unpublished; serving the committed fallback` once per cache window.
- **The image path.** CMS media renders through `src/components/emdash/EmDashPhoto.astro`: a plain `<img>` with width-only `/_image?href=<absolute media URL>&w=N&f=webp` URLs (the ScrollShot recipe, no 4096 px trap, no height). It exists because `Image` from `emdash/ui` sends width and height and, more to the point, importing it makes Astro add a stylesheet link to every page that imports it. The fallback keeps rendering the bundled assets with Astro `<Image>`: the `image()` helper reads a fallback `{ "$file" }` as no image, `picture()` in `aboutPage.ts` keeps the path as `file`, and `about.astro` maps it through a `bundled` table. A new page that wants the same behaviour copies that shape.
- **Alt text is enforced in the reader.** A photo with a blank description or no picture is dropped; under three usable photos the whole entry falls back; a headshot without a picture or description uses the bundled headshot and its stock description (a decision: the alternative, rendering an empty portrait frame, looked worse; say if you prefer it).
- **The story is paragraphs, rendered without `RestrictedPortableText`.** `blockHtml()` (`src/lib/portableText.ts`, unit tested) builds each paragraph's inner HTML from `restrictPortableText()`'s output and `about.astro` prints bare `<p set:html>`. `RestrictedPortableText` imports `emdash/ui`'s `PortableText`, whose 9.5 KB stylesheet became an extra render-blocking link on /about and renamed the shared chunk (`EmDashCover.*.css` to `ui.*.css`) on the homepage, /services and /work, the only differences the parity run found. Keep using it for the prose pages (headings, lists) and accept that cost there, or give them a lighter renderer too.
- **Date handling.** `currently_updated` is read as its calendar day (`dayOf()`), so a time of day or zone typed in the admin never moves the pill a day; the pill and stamp use the same logic as before (`freshnessLabel()`, injectable clock for tests).
- **Rendered difference, one deliberate.** The live thesis line had no space after the blue phrase ("small businessesaround Cincinnati", the same Astro whitespace collapse as the hero's "byone person"); the template now has an explicit `{' '}`. Everything else is identical. Parity on `ncs-ci` (captured on `main` for `/about/`, `/`, `/services/`, `/work/`, `/contact/`): fallback path 5/5 PASS, CMS path 5/5 PASS with the six `<img>` elements normalised out (the only intended difference), after applying the missing space to the baseline. Normalisations that were needed and are not rendered changes: the island `uid` (a hash of the component's path, so it differs when built from another checkout), `&#39;` for an apostrophe printed from an expression, and the CSS chunk link (see above, now unchanged). The CMS path was proved live by editing the Currently lists, date and a Lighthouse number in D1 and seeing them on a `?_preview` URL, then restoring with a plain `npm run ci-dataset`.
- **Picture proof.** On `ncs-ci` (CMS path) the six pictures are `image/webp`; the 125 KB headshot is 22 KB at 432 w. The same assertion runs in `tests/about-copy.spec.ts` for the fallback path too.
- **CI dataset images.** `cms-fixtures.mjs` turns every `$file` in an entry into a media row and an EmDash image value (ids and storage keys derived from the file, byte-stable) and writes `scripts/ci-dataset/cms-media.json`; `rebuild.mjs` uploads those files from the checkout to `ncs-ci-media`. `ciFixtures.test.ts` fails if the three generated files are stale.
- **Still in code:** the Terminal lines, the rail words, section order, testimonial quotes (from case studies). Not built: the `image` field on `service_offerings` that PR 7 deferred; the path now exists, so it is a small follow-up.

**PR 9 notes (2026-10-03).** The Contact page is built and safe to merge with production still empty: `getContactPage()` (`src/lib/contactPage.ts`) reads the `page_contact` singleton (entry `contact`) and serves the committed `cms/content/page_contact.json` when the entry is missing, unpublished or unreadable or fails its checks. What a builder of PRs 10 to 13 needs to know:

- **Nathan's decision, built as designed:** the Budget, Project timeline and "How did you hear" selects submit the visible LABEL (`<option value="Under $4,000">`), so the label is what Web3Forms emails ("Budget: Under $4,000"). Organization type is unchanged: its values are the case-study sector slugs the `/contact?org_type=<sector>` links rely on, and it stays in code (section 0, item 8).
- **Nothing was written to production.** The schema (`cms/schema/page_contact.mjs`, 13 fields, admin group "Pages", sort position 4) and content are committed; the main session loads them with the commands in 2.6 ("PR 9 data"). Until then `/contact` logs `[cms] page_contact/contact is missing or unpublished; serving the committed fallback` once per cache window.
- **Deviation from the field table in 1.8.** The design listed a `response_time` field for "sidebar response-time text", but the page has no such text (the response time is the second "What happens next" line, and the thank-you panel is code). Instead of inventing copy, that field is dropped and a `where_text` field is added for the "Where I am" paragraph that follows the address (the address itself stays in Site settings). `cta_label` is as designed. The next-steps list is 2 to 4 lines (the page ships 3).
- **Reader rules.** Blank rows are dropped, exact repeats are removed (two identical options could not be told apart in the email) and each label is trimmed (it is the submitted value). Lists are cut at 6, 6, 8 and 4 rows. Fewer than two usable rows in any list, or a blank required field, makes the whole entry fall back, so the form can never ship with an empty budget select.
- **Budgets and prices.** The first budget bracket must start at the lowest Pricing tier's price and every tier floor should appear in a bracket. The field's help text says so, and a unit test (`contactPage.test.ts`) fails if `cms/content/pricing_tiers.json` and the committed budget brackets drift apart. It cannot see edits made in the admin: after a price change, update the brackets there.
- **The form handler is unchanged** apart from one guard: the draft restore (`localStorage["ncs-contact-draft"]`) now restores a select only if an option with that exact value exists. A draft saved before this PR holds codes ("under-4k"), and without the guard the select would restore to blank. The dataset re-bind guard (`form.dataset.enhanced`) and the `astro:page-load` registration are untouched; `tests/contact-copy.spec.ts` proves the form still binds after a View Transitions navigation.
- **Form tests never submit.** `tests/contact-copy.spec.ts` intercepts every request to `api.web3forms.com/submit` with `page.route()`, answers it locally and asserts on the multipart payload (labels in `budget`, `timeline` and `heard_from`, the code in `org_type`, the empty honeypot), that a filled honeypot sends nothing, that a blank budget blocks the submit, and the no-JS markup (each option's value equals its text). No key is entered anywhere. The acceptance step that needs a human, one real submission per list showing the label in the email, is in `docs/PENDING.md`.
- **Rendered difference, expected.** Parity on `ncs-ci` (main captured, then this branch deployed, same checkout path so the island `uid` matches): `/`, `/services/` and `/about/` PASS untouched. `/contact/` differs in exactly three ways, all intended or equivalent: (1) the 16 option values of the three selects are labels instead of codes (the design-decided change); (2) the draft-restore guard in the bundled script; (3) the intro's apostrophe prints as `&#39;` (an expression) where the old static text had a literal one, the same entity note as PR 8, identical rendering. Every other tag, text node and attribute is byte-equal. The fallback-only render was not measured on the live Worker: removing the CI row is a destructive write that the session's permission check refused, so the fallback path is covered by unit tests (the fallback equals the literals copied from `contact.astro` on `main`, and the CMS path built from the same JSON equals the fallback path) and by the fact that the CI row is generated from the same JSON.
- **CI exercises the CMS path** through `cms-fixtures.mjs` as for PRs 4 to 8 (the new collection needed `npm run ci-dataset -- --from-scratch`), and `ciFixtures.test.ts` fails if the generated seed and rows are stale. A redeploy of the same `dist` is enough to clear the route cache before a parity capture (measured: the fresh version served new HTML at once).
- **Still in code:** the Organization type list, every field label, help and validation message, the success and error panels, the "Direct", "What happens next" and "Where I am" headings, the map, the booking block, the Web3Forms hidden fields and honeypot, and the section layout.

**PR 10 notes (2026-10-03).** The three prose pages are built and safe to merge with production still empty: `getProsePage(slug)` (`src/lib/prosePage.ts`) reads the entry of the template `pages` collection whose slug matches the route (`privacy`, `accessibility`, `colophon`) and `src/components/ProsePage.astro` draws it. If the entry is missing, unpublished, unreadable or half-filled, the reader serves the committed `cms/content/pages.json` (the literal prose lifted from the three `.astro` pages) and logs a `[cms]` line. What a builder of PRs 11 to 14 needs to know:

- **The `pages` collection already exists in production** (the EmDash template, Title and Content only). `cms/schema/pages.mjs` EXTENDS it: `cms:schema` finds it, updates the `title` and `content` labels, adds seven fields and reorders them. Because that stub could already hold an entry with the slug `privacy`, the normaliser refuses an entry with no headline, description or body (or a ledger with no rows) and the reader then serves the fallback whole, so an old stub can never render as an empty legal page.
- **Two fields beyond the design table, and why.** Today the three pages' tab title, h1 and small label all differ ("Privacy | Nixon Creative Studio", "What this site collects.", "Privacy notice"), so with only `title` a zero-difference render was impossible. `title` is now the page name (the admin list and the tab: `<title> | <studio>`), `heading` is the h1 and `eyebrow` the label (empty on the colophon). `show_toc` picks the layout: on is the document layout (label, h1, lead, "Last updated" badge, "On this page" list beside the sections), off is the ledger layout (h1, lead, the `rows`, the closing links).
- **Anchors.** A section's id is `slugify(heading text)`. That reproduces every Privacy id and two of the five Accessibility ids, but NOT `how-its-checked` (heading "How it is checked"), `where-it-stops` ("Where it stops short") or `report` ("Found a problem?"). The design's claim that every old id equals its slugified label was wrong for those three, so `LEGACY_ANCHORS` in `prosePage.ts` pins them for as long as the heading text is unchanged; reword a heading and its id follows the new text. The list on the left is built from the same headings, so it cannot drift. `tests/prose-pages.spec.ts` types in the old ids (it does not read them from the JSON) and checks each resolves to an `h2`, and `npm run check:links` now runs linkinator with `--check-fragments`, so every in-page `#anchor` must find its element.
- **Rendering: not `RestrictedPortableText`.** PR 8 measured that `emdash/ui`'s `PortableText` adds a 9.5 KB render-blocking stylesheet link and renames a shared chunk on other pages. The prose pages follow PR 8's lighter route: `restrictPortableText()` (now with an opt-in `code` mark) then `blockHtml()` (now with link class, new-tab-for-external, code class and literal-quote options) build plain HTML strings that `ProsePage.astro` prints with `set:html`. The markup is the hand-written markup, byte for byte, and the parity run below shows no extra `<link>` and no changed chunk on any page. Headings 2 and 3, bullet and numbered lists, strong, em, code and safe links are the whole vocabulary; images, embeds and unsafe links render nothing. External `http(s)` links open in a new tab with `rel="noopener noreferrer"` whatever the editor ticked, the `mailto:` link does not. `RestrictedPortableText.astro` is still unused; PR 14's catch-all page could use it if it needs richer content.
- **Byte-parity quirks kept on purpose.** Paragraph text keeps `"` literal while list items entity-escape it (`&quot;`), because the old paragraphs were static template text and the old tick list printed each item through an expression. Browsers render both identically; the difference exists so the parity check can prove nothing else moved.
- **Production data is not loaded** (no admin token). Commands: 2.6 ("PR 10 data") and docs/LAUNCH-RUNBOOK.md. No files upload.
- **Code facts need a developer.** The colophon rows (stack, type, hosting) and the Privacy and Accessibility claims are editable prose, but they must stay true; the field help says "ask a developer before changing the tools, type or hosting". The email address is typed into the text (it is a link inside the body), so after changing it in Site settings it must be changed in these three entries too (the field help says so).
- **Parity, measured on `ncs-ci`** (`main` captured with this checkout path, this branch deployed, route cache cleared by the redeploy; `/`, `/about/`, `/services/` and `/contact/` PASS untouched). The three prose pages differ from the harness's raw comparison in exactly three explained ways and in nothing else (checked by comparing both sides after removing them): (1) the developer HTML comments that the hand-written pages shipped to visitors are gone, because `ProsePage.astro` carries no comments in its markup; (2) the page script is one shared script that finds the list by `nav[aria-label="On this page"]` instead of `[data-privacy-toc]` or `[data-a11y-toc]`; (3) the list's marker attribute is `data-prose-toc` for both pages. The colophon has no text difference (its "static HTML" row was rewritten in PR 2). The CMS path was proved live by changing the Privacy headline and date in D1 and seeing both on a cache-busting URL (the "On this page" list unchanged), then restoring with a plain `npm run ci-dataset`. The fallback-only render was not measured on the live Worker: emptying `ec_pages` on `ncs-ci` is a destructive write that the session's permission check refused (as in PR 9), so the fallback path is covered by `prosePage.test.ts` (the fallback holds the literals copied from the three pages, and the CMS path built from the same JSON equals the fallback path) and by the fact that the CI rows are generated from the same JSON.
- **Gates run (2026-10-03, against `ncs-ci` running this branch).** `npm run check` 0 errors, `npm run test:unit` 257 pass, `npm run build` clean, `npm run check:links` "Successfully scanned 186 links" with `--check-fragments` on (a scratch page linking `/accessibility/#report` and `#how-its-checked` passed and `#bogus-anchor` failed, so the check bites; the CI dataset has three case studies, which is why the count is below the old "300+" note), Playwright chromium 136 passed and webkit-iphone 70 passed (both axe sweeps included).
- **CI exercises the CMS path** through `cms-fixtures.mjs` as for PRs 4 to 9 (`pages` is in the generated seed with its new fields, so the CI database needed `npm run ci-dataset -- --from-scratch`), and `ciFixtures.test.ts` fails if the generated files are stale.
- **Still in code:** the "On this page" heading, the "Last updated" wording, the scroll-spy script, the ledger layout's closing links, the colophon's computed "Last built" row, and the optional catch-all route for brand-new pages (PR 14).

**PR 11 notes (2026-10-03).** The four index pages and the photo collection are built and safe to merge with production still empty: `getWorkPage()`, `getPhotographyPage()`, `getJournalPage()` and `getNotFoundPage()` (all in `src/lib/indexPages.ts`) read their singleton and serve the committed `cms/content/page_*.json` when the entry is missing, unpublished, unreadable or half-filled, and `getPhotos()` (`src/lib/photos.ts`) reads the new `photos` collection. What a builder of PRs 12 to 14 needs to know:

- **`photos` has no committed fallback, on purpose.** Production has zero photos and the page's "In progress" state is what it shows. `getPhotos()` returns `[]` for an empty collection, for a read error and for a table that does not exist yet (production before the schema is applied: EmDash answers `{ entries: [], error }`; `photos.test.ts` covers that shape), so the page renders its empty state in all three cases. There is therefore no `cms/content/photos.json`, and the loader has nothing to load for it: Nathan adds photos by hand in the admin (Photography, Photos). `cms-fixtures.mjs` accepts a schema with no content file for exactly this reason.
- **A photo is dropped, not half-rendered,** when it has no picture, no stored width and height (the justified grid needs them), no description for screen readers, no title or an unknown category. This is the "no alt, no image" rule of 1.1 applied to the gallery.
- **Images: width-only resizer URLs.** `src/lib/photos.ts` builds `/_image?href=<absolute media URL>&w=N&f=webp` (the `EmDashPhoto` and `ScrollShot` shape) and never sends a height, so a tall photo cannot reach the 4096 px trap in docs/EMDASH.md. The hero and the category cards use `EmDashPhoto`. The gallery island, `PhotoGallery.tsx`, now passes each photo's `srcSet` through to its `<img>` (the custom `renderFadeImage` ignored it before) and gives the viewer a larger `lightboxSrc` plus alternatives, so a phone does not download the biggest copy. Widths offered: 480, 800, 1200 and 1600, capped at the original's own width; the viewer asks for 2048 at most (the original, if smaller).
- **The gallery is empty in the server HTML.** react-photo-album lays its rows out after the island hydrates (`client:visible`, so on scroll); until then the section holds only an empty container. That was already true of the component. It matters for testing: the shared axe sweeps see the un-hydrated page, so `tests/index-pages.spec.ts` scrolls the gallery in, waits for the picture and runs axe in both themes, then again with the viewer open.
- **The viewer does not draw a caption.** `PhotoGallery.tsx` passes each slide a title and description, but the Lightbox is built with only the Zoom and Thumbnails plugins, and captions need the Captions plugin. That is how it was before this PR; the data is carried so adding the plugin is one line. Found, not fixed (a visual change).
- **Alt changes meaning.** The old gallery used the photo's title as its alt text. The new `alt` field is a real description ("Sunday morning" is a title, "A congregation standing to sing" is a description); `title` is the viewer title. The `location` field is stored and not shown yet.
- **Order inside a group:** Order number first (empty ones after the numbered ones), then newest year, then slug. The hero is the first Featured photo in that order, else the first photo. Groups with no photos get neither a card nor a section.
- **Deviations from 1.9.** `page_photography` has no field for the "In progress" label, its "See the work" link or the "Where these photos come from" note (the design listed none; they stay in code). `page_work.eyebrow` is optional (an empty label hides the line) because the design did not say the "Portfolio" label was required. The 404 `links` repeater is read as: the first row is the blue button and the others are plain links (the design only gave the repeater). A row whose address does not start with exactly one `/` is dropped (a typo cannot send a lost visitor off-site), and an entry with no usable link falls back whole. `page_journal` owns only the words around the entries: the journal itself still reads the Astro `journal` collection until PR 12.
- **The 404 page keeps answering a real 404.** `src/pages/404.astro` only swaps its words for `getNotFoundPage()`; nothing about how the status is chosen changed. Measured on `ncs-ci`: an unknown URL answers 404 (`CF-Cache-Status: BYPASS`) with the same body as `main`, and `/404/` by name answers 200 so the Lighthouse audit path from PR 2 still works. The page only hands `Astro.cache` to the reader when its status is below 400, as `BaseLayout` does for the lifetime, so a 404 is never tagged for the cache (`src/worker.ts` would also force `no-store`).
- **CI test photo.** `scripts/ci-dataset/ci-content/photos.json` holds one hand-written photo (`ci-test-photo`, using the committed `src/assets/photography/events-01.jpg`), merged by `cms-fixtures.mjs` into `cms-rows.sql` and `cms-media.json` for CI only, so the gallery renders and is axe-checked there while production carries none. `NCS_CI_NO_TEST_CONTENT=1 node scripts/ci-dataset/cms-fixtures.mjs` leaves it out and makes the refresh delete it (`DELETE FROM ec_photos;`), which is how the zero-photo render is measured on the same CI data; the committed generated files are always built without the variable (`ciFixtures.test.ts` builds with `testContent: true` and fails if they drift). Real production photos are NOT copied into CI: `photos` is not in `SNAPSHOT_ALL`, deliberately.
- **Parity, measured on `ncs-ci`** (`main` captured from this checkout path for `/`, `/work/`, `/photography/`, `/journal/`, `/404/`, `/about/`, `/contact/`, `/services/`; then this branch deployed after `NCS_CI_NO_TEST_CONTENT=1 ... --from-scratch`, so the CMS path with ZERO photos; route cache cleared by redeploying the same dist). `/`, `/work/`, `/about/`, `/contact/`, `/services/` PASS untouched. `/photography/` (the empty state), `/journal/` and `/404/` differ in one way only: an apostrophe inside a sentence that now prints from an expression is escaped `&#39;` where the static template text had a literal `'` (the same note as PR 8 and 9; identical rendering). With those five sentences rewritten in the baseline copy, 8/8 PASS. The unknown-URL body was compared the same way (identical, status 404). The fallback-only render was not measured on the live Worker (emptying `ec_page_*` on `ncs-ci` is a destructive write the permission check refuses); it is covered by `indexPages.test.ts`, which pins every literal the four pages held and proves the CMS path built from the same JSON equals the fallback path.
- **Production data is not loaded** (no admin token). Commands: 2.6 ("PR 11 data") and docs/LAUNCH-RUNBOOK.md. No files upload, because the only picture in CI is CI's.
- **Still in code:** the Work filter chips and cards, the project count, the Photography "In progress" label and link, the "Where these photos come from" note, the Journal card's mark and buttons, the big decorative "404", every layout and the sections' order.

### 2.6 Running the tooling (the recipe's production steps, in order)

Steps 2 to 4 of section 2.1 write to a live instance, so the main session runs them with Nathan's go-ahead. Replace `<collection>` and `<instance>`; `--yes` is required for anything that is not the `ncs-ci` Worker or a local address, and `--dry-run` reads without writing.

1. **Look first.** `EMDASH_TOKEN=... npm run cms:schema -- --collection <collection> --url <instance> --dry-run` prints `would created ...`, `would added field ...` or `unchanged ...` per field. Offline check of every definition: `npm run cms:schema -- --all --check`.
2. **Schema.** `EMDASH_TOKEN=... npm run cms:schema -- --collection <collection> --url <instance> --yes`. Idempotent: a second run prints `unchanged` for everything and writes nothing. A field whose type changed is dropped and re-added (rerun step 3 to refill it).
3. **Content.** One-time login: `npx emdash login --url <instance>`. Then `npm run cms:load -- --collection <collection> --url <instance> --dry-run`, and the same without `--dry-run` plus `--yes`. Prints `created`, `updated`, `publish` or `unchanged` per entry. Menus and redirects: `EMDASH_TOKEN=... npm run cms:load -- --collection menus --url <instance> --yes` (and `redirects`), because the CLI cannot write them. `--force` rewrites entries even when the values already match.
4. **Seed and CI dataset**, then the PR's parity check, as in section 2.1 steps 4 to 6.

To test a definition or a content file before it goes near production, run steps 1 to 3 against `https://ncs-ci.nathanjnixon86.workers.dev` once an admin user and token exist there (it has none today); no `--yes` is needed for that host.

**PR 4 data (site settings and menus). Needs `EMDASH_TOKEN` from Nathan; nothing below has been run.** Safe at any time: the live site reads the data only after this PR deploys, and until the data is loaded it renders from the committed fallback, so the order does not matter and a failed step changes nothing visible. `<prod>` is `https://www.nixoncreativestudio.com`.

```bash
npx emdash login --url <prod>                       # once, device code
export EMDASH_TOKEN=...                             # Settings, API tokens (keep in 1Password)
npm run cms:schema -- --collection site_settings --url <prod> --dry-run   # expect: would created collection, would added field x18
npm run cms:schema -- --collection site_settings --url <prod> --yes
npm run cms:schema -- --collection site_settings --url <prod> --yes       # second run: every line "unchanged"
npm run cms:load -- --collection site_settings --url <prod> --dry-run
npm run cms:load -- --collection site_settings --url <prod> --yes
npm run cms:load -- --collection menus --url <prod> --dry-run
npm run cms:load -- --collection menus --url <prod> --yes
npm run cms:load -- --collection site_settings --url <prod> --yes         # second run: "unchanged"
```

Then switch CI to read the real rows: add `'site_settings'` to `PRODUCTION_HAS` in `scripts/ci-dataset/cms-fixtures.mjs`, run `node scripts/export-seed-from-instance.mjs --url <prod>` (needs the token; it now emits the collection and both menus), `node scripts/ci-dataset/cms-fixtures.mjs`, `npm run ci-dataset -- --from-scratch`, `npm run ci-dataset:snapshot`, `npm run ci-dataset`, and commit `seed/seed.json`, `rows.sql`, `cms-rows.sql`, `media.json`. Finally the edit proof: in `/_emdash/admin`, change the footer "Currently" line in Site settings, publish, reload any page within five minutes, then restore it from History.

**PR 5 data (pricing tiers and add-ons). Needs `EMDASH_TOKEN` from Nathan; nothing below has been run.** Same safety as PR 4: the live site reads the data only after this PR deploys, and until the data is loaded it renders from the committed fallback, so the order does not matter and a failed step changes nothing visible. `<prod>` is `https://www.nixoncreativestudio.com`. Both collections are created in the admin group "Pricing & services".

```bash
npx emdash login --url <prod>                       # once, device code
export EMDASH_TOKEN=...                             # Settings, API tokens (keep in 1Password)
npm run cms:schema -- --all --check
npm run cms:schema -- --collection pricing_tiers --url <prod> --dry-run   # expect: would created collection, would added field x10
npm run cms:schema -- --collection pricing_tiers --url <prod> --yes
npm run cms:schema -- --collection pricing_tiers --url <prod> --yes       # second run: every line "unchanged"
npm run cms:schema -- --collection pricing_addons --url <prod> --dry-run  # expect: would created collection, would added field x4
npm run cms:schema -- --collection pricing_addons --url <prod> --yes
npm run cms:schema -- --collection pricing_addons --url <prod> --yes      # second run: every line "unchanged"
npm run cms:load -- --collection pricing_tiers --url <prod> --dry-run     # expect: would create launch, signature, flagship
npm run cms:load -- --collection pricing_tiers --url <prod> --yes
npm run cms:load -- --collection pricing_addons --url <prod> --dry-run    # expect: would create photography, brand-strategy, care-plan
npm run cms:load -- --collection pricing_addons --url <prod> --yes
npm run cms:load -- --collection pricing_tiers --url <prod> --yes         # second run: "unchanged"
npm run cms:load -- --collection pricing_addons --url <prod> --yes        # second run: "unchanged"
```

Then switch CI to read the real rows: add `'pricing_tiers'` and `'pricing_addons'` to `PRODUCTION_HAS` in `scripts/ci-dataset/cms-fixtures.mjs` (and `'site_settings'` if PR 4's data is already loaded), run `node scripts/export-seed-from-instance.mjs --url <prod>` (needs the token), `node scripts/ci-dataset/cms-fixtures.mjs`, `npm run ci-dataset -- --from-scratch`, `npm run ci-dataset:snapshot`, `npm run ci-dataset`, and commit `seed/seed.json`, `rows.sql`, `cms-rows.sql`, `media.json`. Finally the edit proof: in `/_emdash/admin`, open Pricing tiers, change Launch's starting price (4000 to 4100), publish, reload `/services/` and `/` within five minutes and see $4,100 (and the Web design JSON-LD floor), then restore it from History. The prices here also appear in prose that stays in code until PRs 7 and 9 (the /services FAQ answer "What does it cost?" and the /contact budget brackets), so a real price change is three edits, not one.

**PR 6 data (homepage copy). Needs `EMDASH_TOKEN` from Nathan; nothing below has been run.** Same safety as PRs 4 and 5: the live site reads the data only after this PR deploys, and until the data is loaded it renders from the committed fallback, so the order does not matter and a failed step changes nothing visible. `<prod>` is `https://www.nixoncreativestudio.com`. The collection is created in the admin group "Pages", sort position 1 (the other page collections join it in PRs 7 to 11).

```bash
npx emdash login --url <prod>                       # once, device code
export EMDASH_TOKEN=...                             # Settings, API tokens (keep in 1Password)
npm run cms:schema -- --all --check
npm run cms:schema -- --collection page_home --url <prod> --dry-run   # expect: would created collection, would added field x25
npm run cms:schema -- --collection page_home --url <prod> --yes
npm run cms:schema -- --collection page_home --url <prod> --yes       # second run: every line "unchanged"
npm run cms:load -- --collection page_home --url <prod> --dry-run     # expect: would create home
npm run cms:load -- --collection page_home --url <prod> --yes
npm run cms:load -- --collection page_home --url <prod> --yes         # second run: "unchanged"
```

Then switch CI to read the real row: add `'page_home'` to `PRODUCTION_HAS` in `scripts/ci-dataset/cms-fixtures.mjs` (and the PR 4 and PR 5 collections if their data is already loaded), run `node scripts/export-seed-from-instance.mjs --url <prod>` (needs the token), `node scripts/ci-dataset/cms-fixtures.mjs`, `npm run ci-dataset -- --from-scratch`, `npm run ci-dataset:snapshot`, `npm run ci-dataset`, and commit `seed/seed.json`, `rows.sql`, `cms-rows.sql`, `media.json`. Finally the edit proof: in `/_emdash/admin`, open Home page, change "Headline, the coloured last part" from "pull their weight." to another phrase, publish, reload `/` within five minutes and see it in the hero (amber on dark, blue on light), then restore it from History. The four process steps are the same fields the Services page shows, so open `/services/` too. The homepage title and description are in this entry as well (`seo_title`, `seo_description`).

**PR 7 data (Services page and service offerings). Needs `EMDASH_TOKEN` from Nathan; nothing below has been run.** Same safety as PRs 4 to 6: the live site reads the data only after this PR deploys, and until the data is loaded it renders from the committed fallback, so the order does not matter and a failed step changes nothing visible. `<prod>` is `https://www.nixoncreativestudio.com`. `page_services` goes in the admin group "Pages" (sort position 2), `service_offerings` in "Pricing & services". Production's CMS is empty today because there is no admin token, so these are the exact commands to run once Nathan supplies one.

```bash
npx emdash login --url <prod>                       # once, device code
export EMDASH_TOKEN=...                             # needs EMDASH_TOKEN from Nathan: Settings, API tokens (keep in 1Password)
npm run cms:schema -- --all --check
npm run cms:schema -- --collection page_services --url <prod> --dry-run      # expect: would created collection, would added field x17
npm run cms:schema -- --collection page_services --url <prod> --yes
npm run cms:schema -- --collection page_services --url <prod> --yes          # second run: every line "unchanged"
npm run cms:schema -- --collection service_offerings --url <prod> --dry-run  # expect: would created collection, would added field x9
npm run cms:schema -- --collection service_offerings --url <prod> --yes
npm run cms:schema -- --collection service_offerings --url <prod> --yes      # second run: every line "unchanged"
npm run cms:load -- --collection page_services --url <prod> --dry-run        # expect: would create services
npm run cms:load -- --collection page_services --url <prod> --yes
npm run cms:load -- --collection service_offerings --url <prod> --dry-run    # expect: would create strategy, web-design, photography
npm run cms:load -- --collection service_offerings --url <prod> --yes
npm run cms:load -- --collection page_services --url <prod> --yes            # second run: "unchanged"
npm run cms:load -- --collection service_offerings --url <prod> --yes        # second run: "unchanged"
```

Then switch CI to read the real rows: add `'page_services'` and `'service_offerings'` to `PRODUCTION_HAS` in `scripts/ci-dataset/cms-fixtures.mjs` (and the PR 4 to 6 collections if their data is already loaded), run `node scripts/export-seed-from-instance.mjs --url <prod>` (needs the token), `node scripts/ci-dataset/cms-fixtures.mjs`, `npm run ci-dataset -- --from-scratch`, `npm run ci-dataset:snapshot`, `npm run ci-dataset`, and commit `seed/seed.json`, `rows.sql`, `cms-rows.sql`, `media.json`. Then verify the structured data did not move: `curl -s <prod>/services/` before and after the load, extract the `application/ld+json` block and `cmp` the two (they must be identical), and run the live URL through Google's Rich Results test (screenshot the FAQ and Service results). Finally the edit proof: in `/_emdash/admin`, open Services page, change the first FAQ answer's last sentence, publish, reload `/services/` within five minutes and see it in the visible FAQ (and in the JSON-LD), then restore it from History. In Service offerings, Strategy's "Standalone starting price" (1500) and Photography's (900) are the JSON-LD floors that used to be code.

---

**PR 8 data (About page). Needs `EMDASH_TOKEN` from Nathan; nothing below has been run.** Same safety as PRs 4 to 7: the live site reads the data only after this PR deploys, and until the data is loaded it renders from the committed fallback and the bundled pictures. `<prod>` is `https://www.nixoncreativestudio.com`. `page_about` goes in the admin group "Pages" (sort position 3). This is the first load that uploads files: the loader runs `emdash media upload` for `src/assets/brand/headshot.jpg` and the five `src/assets/about/*.jpg` (de-duplicated by SHA-1, about 1.2 MB in all).

```bash
npx emdash login --url <prod>                       # once, device code
export EMDASH_TOKEN=...                             # needs EMDASH_TOKEN from Nathan: Settings, API tokens (keep in 1Password)
npm run cms:schema -- --all --check
npm run cms:schema -- --collection page_about --url <prod> --dry-run   # expect: would created collection, would added field x35
npm run cms:schema -- --collection page_about --url <prod> --yes
npm run cms:schema -- --collection page_about --url <prod> --yes       # second run: every line "unchanged"
npm run cms:load -- --collection page_about --url <prod> --dry-run     # expect: would upload 6 images, would create about
npm run cms:load -- --collection page_about --url <prod> --yes
npm run cms:load -- --collection page_about --url <prod> --yes         # second run: "unchanged", nothing uploaded
```

Then switch CI to read the real row: add `'page_about'` to `PRODUCTION_HAS` in `scripts/ci-dataset/cms-fixtures.mjs` (the six images then arrive through `snapshot.mjs`' media list instead of `cms-media.json`), run `node scripts/export-seed-from-instance.mjs --url <prod>`, `node scripts/ci-dataset/cms-fixtures.mjs`, `npm run ci-dataset -- --from-scratch`, `npm run ci-dataset:snapshot`, `npm run ci-dataset`, and commit `seed/seed.json`, `rows.sql`, `cms-rows.sql`, `cms-media.json`, `media.json`. Verify on the live domain: the six `<img>` use `/_image?href=...&f=webp` and each answers `content-type: image/webp` to `curl -s -D - -o /dev/null <url>` (GET). Edit proof: rewrite a Working on line and set "Currently last updated" to today, publish, reload /about within five minutes, restore from History.

**PR 9 data (Contact page). Needs `EMDASH_TOKEN` from Nathan; nothing below has been run.** Same safety as PRs 4 to 8: the live site reads the data only after this PR deploys, and until the data is loaded `/contact` renders from the committed fallback, identical to before except that the Budget, Timeline and "How did you hear" options now submit their labels (that part ships with the code and needs no data step). `<prod>` is `https://www.nixoncreativestudio.com`. `page_contact` goes in the admin group "Pages" (sort position 4). No files to upload.

```bash
npx emdash login --url <prod>                       # once, device code
export EMDASH_TOKEN=...                             # needs EMDASH_TOKEN from Nathan: Settings, API tokens (keep in 1Password)
npm run cms:schema -- --all --check
npm run cms:schema -- --collection page_contact --url <prod> --dry-run   # expect: would created collection, would added field x13
npm run cms:schema -- --collection page_contact --url <prod> --yes
npm run cms:schema -- --collection page_contact --url <prod> --yes       # second run: every line "unchanged"
npm run cms:load -- --collection page_contact --url <prod> --dry-run     # expect: would create contact
npm run cms:load -- --collection page_contact --url <prod> --yes
npm run cms:load -- --collection page_contact --url <prod> --yes         # second run: "unchanged"
```

Then switch CI to read the real row: add `'page_contact'` to `PRODUCTION_HAS` in `scripts/ci-dataset/cms-fixtures.mjs`, run `node scripts/export-seed-from-instance.mjs --url <prod>`, `node scripts/ci-dataset/cms-fixtures.mjs`, `npm run ci-dataset -- --from-scratch`, `npm run ci-dataset:snapshot`, `npm run ci-dataset`, and commit `seed/seed.json`, `rows.sql` and `cms-rows.sql`. Verify on the live domain after a five-minute wait: `curl -sL <prod>/contact/` still shows the same headline and the three selects with label values. Edit proof: rename one Budget choice in the admin, publish, reload /contact within five minutes, restore from History. **Real submission check, with Nathan:** with the real Web3Forms key live, send one inquiry that picks a Budget, a Timeline and a "How did you hear" choice and confirm the email shows the labels (docs/PENDING.md). No agent sends it.

**PR 10 data (Privacy, Accessibility and Colophon). Needs `EMDASH_TOKEN` from Nathan; nothing below has been run.** Same safety as PRs 4 to 9: the live site reads the data only after this PR deploys, and until the data is loaded the three pages render from the committed fallback, identical to before. `<prod>` is `https://www.nixoncreativestudio.com`. Unlike the earlier PRs this EXTENDS a collection production already has: `pages` (group "Pages" after the update, label "Other pages") exists from the EmDash template with only Title and Content. Look first, because an old stub could already use one of the three slugs (the load would then update it in place).

```bash
npx emdash login --url <prod>                       # once, device code
export EMDASH_TOKEN=...                             # needs EMDASH_TOKEN from Nathan: Settings, API tokens (keep in 1Password)
npx emdash content list pages --url <prod>          # note any existing entries; expect none or a starter page
npm run cms:schema -- --all --check
npm run cms:schema -- --collection pages --url <prod> --dry-run   # expect: updated field title, updated field content, added field x7 (heading, eyebrow, summary, intro, rows, show_toc, last_updated), reorder fields, applied collection settings (no "created collection": it exists)
npm run cms:schema -- --collection pages --url <prod> --yes
npm run cms:schema -- --collection pages --url <prod> --yes       # second run: every line "unchanged"
npm run cms:load -- --collection pages --url <prod> --dry-run     # expect: would create privacy, accessibility, colophon
npm run cms:load -- --collection pages --url <prod> --yes
npm run cms:load -- --collection pages --url <prod> --yes         # second run: "unchanged"
```

Before the first load save the live pages: `for p in privacy accessibility colophon; do curl -sL <prod>/$p/ > $p-before.html; done`. After the load and a five-minute wait they must match the "before" files except for the three explained differences in the PR 10 notes (comments, the shared script, `data-prose-toc`) and the colophon's "Last built" month. Then switch CI to read the real rows: add `'pages'` to `PRODUCTION_HAS` in `scripts/ci-dataset/cms-fixtures.mjs` (`snapshot.mjs` already lists it in `SNAPSHOT_ALL`), run `node scripts/export-seed-from-instance.mjs --url <prod>`, `node scripts/ci-dataset/cms-fixtures.mjs`, `npm run ci-dataset -- --from-scratch`, `npm run ci-dataset:snapshot`, `npm run ci-dataset`, and commit `seed/seed.json`, `rows.sql` and `cms-rows.sql`. Edit proof: in `/_emdash/admin`, Other pages, open Privacy, change one sentence in the "Cookies" section and set "Last updated" to today, publish, reload `/privacy/` within five minutes (the sentence and the date change, the "On this page" list is unchanged), then restore from History. Second proof: reword the "Found a problem?" heading, publish, and see that its list entry and id change (`#found-a-bug`) while `#report` stops resolving; restore it.

**PR 11 data (Work, Photography, Journal and Not-found pages, and the Photos collection). Needs `EMDASH_TOKEN` from Nathan; nothing below has been run.** Same safety as PRs 4 to 10: the live site reads the data only after this PR deploys, and until the data is loaded the four pages render from the committed fallback, identical to before, and `/photography/` shows its "In progress" state because production has zero photos. `<prod>` is `https://www.nixoncreativestudio.com`. The four page collections go in the admin group "Pages" (sort positions 5 to 8), `photos` in a new group "Photography". Production's CMS is empty today because there is no admin token, so these are the exact commands to run once Nathan supplies one. `photos` has no content file: its schema is applied and Nathan adds photos in the admin, so there is no `cms:load` line for it.

```bash
npx emdash login --url <prod>                       # once, device code
export EMDASH_TOKEN=...                             # needs EMDASH_TOKEN from Nathan: Settings, API tokens (keep in 1Password)
npm run cms:schema -- --all --check
npm run cms:schema -- --collection page_work --url <prod> --dry-run          # expect: would created collection, would added field x10
npm run cms:schema -- --collection page_work --url <prod> --yes
npm run cms:schema -- --collection page_work --url <prod> --yes              # second run: every line "unchanged"
npm run cms:schema -- --collection page_photography --url <prod> --dry-run   # expect: would created collection, would added field x15
npm run cms:schema -- --collection page_photography --url <prod> --yes
npm run cms:schema -- --collection page_photography --url <prod> --yes       # second run: every line "unchanged"
npm run cms:schema -- --collection page_journal --url <prod> --dry-run       # expect: would created collection, would added field x9
npm run cms:schema -- --collection page_journal --url <prod> --yes
npm run cms:schema -- --collection page_journal --url <prod> --yes           # second run: every line "unchanged"
npm run cms:schema -- --collection page_not_found --url <prod> --dry-run     # expect: would created collection, would added field x6
npm run cms:schema -- --collection page_not_found --url <prod> --yes
npm run cms:schema -- --collection page_not_found --url <prod> --yes         # second run: every line "unchanged"
npm run cms:schema -- --collection photos --url <prod> --dry-run             # expect: would created collection, would added field x9
npm run cms:schema -- --collection photos --url <prod> --yes
npm run cms:schema -- --collection photos --url <prod> --yes                 # second run: every line "unchanged"
npm run cms:load -- --collection page_work --url <prod> --dry-run            # expect: would create work
npm run cms:load -- --collection page_work --url <prod> --yes
npm run cms:load -- --collection page_photography --url <prod> --dry-run     # expect: would create photography
npm run cms:load -- --collection page_photography --url <prod> --yes
npm run cms:load -- --collection page_journal --url <prod> --dry-run         # expect: would create journal
npm run cms:load -- --collection page_journal --url <prod> --yes
npm run cms:load -- --collection page_not_found --url <prod> --dry-run       # expect: would create not-found
npm run cms:load -- --collection page_not_found --url <prod> --yes
# second run of each load: "unchanged"
```

Before the first load save the live pages: `for p in work photography journal; do curl -sL <prod>/$p/ > $p-before.html; done` and `curl -s -o 404-before.html -w '%{http_code}\n' <prod>/no-such-page-check/` (the status must print 404). After the load and a five-minute wait each page must match its "before" file except for the `&#39;` apostrophe entity in the sentences that now print from the CMS (and the `/work/` count and cards, which follow the case studies), and the unknown URL must still answer 404. Then switch CI to read the real rows: add `'page_work'`, `'page_photography'`, `'page_journal'` and `'page_not_found'` to `PRODUCTION_HAS` in `scripts/ci-dataset/cms-fixtures.mjs` (`snapshot.mjs` already lists all four in `SNAPSHOT_ALL`; keep `photos` OUT of both, CI's test photo is hand-written), run `node scripts/export-seed-from-instance.mjs --url <prod>`, `node scripts/ci-dataset/cms-fixtures.mjs`, `npm run ci-dataset -- --from-scratch`, `npm run ci-dataset:snapshot`, `npm run ci-dataset`, and commit `seed/seed.json`, `rows.sql` and `cms-rows.sql`. Edit proofs, in `/_emdash/admin`: Photography page, change the accent phrase of the headline, publish and see it on `/photography/` within five minutes (amber on the dark hero), restore from History; then **add the first real photo** under Photography, Photos (upload, description, group, year), publish, and see the page switch from "In progress" to the gallery within five minutes, and run it through axe once (open `/photography/`, scroll the gallery in, run the browser's axe or Lighthouse accessibility); unpublish it again if it was only a test. Not-found page: change the first link's words, publish, request an unknown URL and see the new words with status 404, restore from History.

## 3. Performance and caching

### 3.1 What changes

Today 6 routes are server-rendered (`/`, `/work/`, `/work/<slug>/`, `/about/`, `/services/`, `/rss.xml`) and the rest are static files served by the Worker's assets binding, with no Worker code and no D1 query. After PR 2 every HTML route runs the Worker and reads D1: about 4 to 8 queries per page (site settings, two menus, the page singleton, plus pricing or case studies where shown). EmDash's request cache de-duplicates repeats within one request.

Two side effects to plan for:

- **Prefetch multiplies renders.** `prefetchAll` with the viewport strategy fetches every link that scrolls into view. Static, that was free; server-rendered and uncached, each prefetch is a Worker render with D1 queries. With the route cache below it is a cache hit.
- **Worker CPU and request limits.** Every page view becomes a Worker request. On the Workers Free plan that is 100,000 requests a day and 10 ms CPU per request, which an Astro plus EmDash render can exceed; on Workers Paid it is a non-issue. See question 5 in section 7.

### 3.2 Recommendation: Astro route cache with purge on publish

PR 2 turns on Astro 7 route caching with the Cloudflare provider:

```js
// astro.config.mjs
import { cacheCloudflare } from '@astrojs/cloudflare/cache';
export default defineConfig({
  output: 'server',
  cache: { provider: cacheCloudflare() },
  routeRules: { '/[...path]': { maxAge: 86400, swr: 604800 } },
  // ...
});
// emdash({ ..., toolbar: 'client' })
```

- Every CMS read already returns a `cacheHint`; `src/lib/cms.ts` and `src/lib/caseStudies.ts` call `Astro.cache.set(cacheHint)`, and BaseLayout's chrome reads (settings, menus) add theirs, so every page carries the tags of everything it rendered. A publish in the admin purges those tags (`cache.invalidate` in EmDash's publish, unpublish and terms routes; `emdash:menu:<name>` and `emdash:settings` tags for chrome). Edits are live on the next request; everything else is served from Cloudflare's cache with no Worker CPU and no D1.
- `toolbar: 'client'` keeps the public HTML identical for everyone; with the default `server` mode a cached anonymous page would hide the editor toolbar from Nathan intermittently (EmDash's own warning).
- `CACHE_CONTROL` in `caseStudies.ts` (the `s-maxage=300` header that only works behind a cache rule) is retired in favour of the route cache.
- Workers.dev CI previews are never cached, so Lighthouse CI keeps measuring the uncached worst case. That is the right gate.

**Fallback, if PR 2's measurement shows the Workers cache or tag purge is not available on this zone or plan:** extend the existing edge-cache wrapper in `src/worker.ts` (today it caches `/_image` and media for 30 days) to GET HTML responses with a 300-second TTL, no purge. Edits then show within 5 minutes, and the editing guide says "allow up to 5 minutes". Keep `prefetch.defaultStrategy` at `viewport` with the route cache, switch it to `hover` under this fallback.

### 3.3 Per page

| Page                                                        | Recommendation                       | Why                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`, `/services`, `/about`, `/work/`, `/work/<slug>/`       | Server, cached, purged on publish    | Already server; their content is the most edited.                                                                                                                                                                                                                                                                                   |
| `/contact`, `/photography`, `/journal/`, `/journal/<slug>/` | Server, cached                       | Page copy, option lists, photos and posts are CMS content.                                                                                                                                                                                                                                                                          |
| `/privacy`, `/accessibility`, `/colophon`                   | **Server, cached.** Not prerendered. | The tempting call is to leave tiny, rarely edited legal pages static. Rejected: they carry the header, footer and contact email, so a static copy shows a stale email after Nathan changes it, and a legal notice that names the wrong contact is worse than one that loads 100 ms later. Cached, they cost one render per publish. |
| `/404` (and real unknown URLs)                              | Server, cached for `/404` itself     | Same chrome reason. An unknown URL must still answer 404 with the page (smoke test).                                                                                                                                                                                                                                                |
| `/coming-soon/`                                             | Server                               | Reads studio name and email from `site_settings`; standalone, no chrome.                                                                                                                                                                                                                                                            |
| `/rss.xml`, `/sitemap-case_studies.xml`                     | Server, cached                       | Already server.                                                                                                                                                                                                                                                                                                                     |
| Static assets, `/_image`, media                             | Unchanged                            | Assets binding and the `worker.ts` 30-day image cache.                                                                                                                                                                                                                                                                              |

The sitemap needs every route in `customPages` once nothing is prerendered (`@astrojs/sitemap` only lists prerendered routes), plus journal entries via a `sitemap-posts.xml` route like the case-studies one (PR 12).

### 3.4 Measurement gate for PR 2

Before and after, on production-like data (the `ncs-ci` Worker with `main`, then with the PR), 10 GET runs each: `curl -s -o /dev/null -w "%{time_starttransfer}\n" <url>` for `/`, `/privacy`, `/contact` (cold and warm), plus Lighthouse CI's LCP for the audited set. Record the numbers in the PR. Pass: no LCP gate failure, and warm TTFB on the production domain after deploy within 50 ms of today's static TTFB for `/privacy` (proves the cache is serving). If warm TTFB stays at uncached levels, the cache is not working: switch to the 3.2 fallback rather than shipping uncached.

---

## 4. What to hide in the admin, and how

### 4.1 What can and cannot be hidden (EmDash 1.1.0)

| Item                                  | Used by the site after this plan    | Action                                                                                                                                                                   |
| ------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Comments                              | No                                  | **Cannot be hidden** (unconditional sidebar item). Keep `commentsEnabled: false` on every collection so nothing can arrive. Guide: "ignore".                             |
| Widgets                               | No                                  | **Cannot be hidden.** Delete any template widget areas so the screen is empty. Guide: "ignore".                                                                          |
| Sections                              | No                                  | **Cannot be hidden.** Delete any template sections. Guide: "ignore". (Inserting a section into a Portable Text field would render nothing, by the restricted renderers.) |
| Bylines, Byline Schema                | No                                  | **Cannot be hidden.** Delete template bylines. The author on the site is Nathan, from `site_settings.owner_name`.                                                        |
| Menus                                 | **Yes**                             | Keep. Two menus only; delete any template menu.                                                                                                                          |
| Redirects                             | **Yes**                             | Keep.                                                                                                                                                                    |
| `posts` collection                    | Yes (Journal) from PR 12            | Until PR 12 set `hidden: true` so it does not invite writing into a collection nothing reads. Unhide in PR 12.                                                           |
| `pages` collection                    | Yes from PR 10                      | `hidden: true` until PR 10.                                                                                                                                              |
| `category` taxonomy                   | No                                  | Delete (PR 14; it is attached to `posts` only and empty).                                                                                                                |
| `tag` taxonomy                        | Yes (journal tags)                  | Keep.                                                                                                                                                                    |
| `service`, `topic`, `stack`           | Yes (case studies)                  | Keep, in the Portfolio group.                                                                                                                                            |
| Settings: General (title, tagline)    | No (the site reads `site_settings`) | Keep them equal to `site_settings` once; the guide says the site does not read this screen. Settings, API tokens stays (needed for scripts).                             |
| Content Types, Users, Plugins, Import | No (admin tooling)                  | Visible to Admin role only. Hidden from an Editor-role user (see 4.2).                                                                                                   |

Patching `node_modules/@emdash-cms/admin` to remove sidebar items was considered and rejected: it breaks on every EmDash upgrade and fails silently. If the noise bothers Nathan, the right fix is an upstream request for an `admin.hiddenNav` option.

### 4.2 Role

The most destructive thing Nathan could do by accident is delete or retype a field under **Content Types** (data in that column is lost; History does not cover schema). Two options; recommendation first:

1. **Recommended:** a second user, "Nathan (editing)", with the **Editor** role, for day-to-day edits. Editors do not see Content Types, Users, Plugins or Redirects. He signs in as Admin only to add a redirect or a user. Needs a second email address for the invite (question 1 in section 7).
2. If he prefers one login: stay Admin; the guide says "never open Content Types", and `cms/schema/*.mjs` plus `apply-schema.mjs` can recreate a deleted field (the content comes back from D1 Time Travel, section 5).

### 4.3 Sidebar layout (PR 14 sets `sortOrder` and `group`)

1. Site settings (`site_settings`)
2. **Pages** group: Home page, Services page, About page, Contact page, Work page, Photography page, Journal page, Not-found page, Other pages
3. **Pricing & services** group: Pricing tiers, Add-ons, Service offerings
4. **Portfolio** group: Case Studies, Services, Stack, Topics (existing)
5. Journal, Tags
6. **Photography** group: Photos
7. Media, then the Manage items EmDash always shows

---

## 5. Risks and rollback

| Risk                                                                                                                                                    | Mitigation                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Every page now depends on the Worker and D1; a D1 outage used to affect 6 routes, now all                                                               | Route cache serves cached pages through an outage (`swr`); singleton reads fall back to `cms/content/*.json`, so chrome and page copy still render; only case-study lists and the journal would be missing.  |
| Tag purge not available or not firing                                                                                                                   | PR 2 measures it; fallback is a 5-minute TTL with no purge (3.2). The edit proof in every PR catches a regression.                                                                                           |
| An edit breaks a layout                                                                                                                                 | `maxLength` on every string, fixed repeater counts, selects instead of free text, accent split into fields, no HTML anywhere, restricted Portable Text renderers, image-without-alt renders no image.        |
| Nathan saves but the change is not live                                                                                                                 | Drafts are on: Save keeps a draft, Publish makes it live. First line of the editing guide.                                                                                                                   |
| Facts duplicated in prose drift (prices in the FAQ and contact budgets; the email inside the privacy text; analytics tools named in the privacy notice) | Labels on those fields say what to check; the editing guide has a "When your prices change" and "When your email changes" checklist.                                                                         |
| Schema drift between production, `seed/seed.json` and `ncs-ci`                                                                                          | Schema only changes through `cms/schema/*.mjs` plus `apply-schema.mjs`; the seed is re-exported and `ncs-ci` rebuilt in the same PR.                                                                         |
| A field deleted or retyped in Content Types                                                                                                             | Editor-role login (4.2); `apply-schema.mjs` recreates the field; D1 Time Travel restores the data (`wrangler d1 time-travel restore ncs-emdash-prod --timestamp <iso>`; 30 days on Workers Paid, 7 on Free). |
| Fallback JSON silently serves old copy                                                                                                                  | It only triggers on a missing entry or a D1 error, and logs `console.error` (Workers observability is on). The guide tells Nathan never to unpublish or delete a "page" entry.                               |
| Passkey origin                                                                                                                                          | Unchanged: `EMDASH_SITE_URL` stays `https://www.nixoncreativestudio.com`.                                                                                                                                    |
| Prefetch load on uncached pages                                                                                                                         | Only under the fallback; `hover` strategy there.                                                                                                                                                             |

**Rollback.**

- **A code PR:** `git revert` on `main` (or Cloudflare Deployments, roll back). Safe in every PR because the production data step is additive: the old code ignores the new collections.
- **A content edit:** the entry's History (revisions) in the admin, restore and publish. No Claude needed.
- **A bad bulk data step:** D1 Time Travel to a timestamp just before the step (record the timestamp in the PR before running step 2).
- **Everything:** `npx emdash site export backup.emdash` before PR 2 and monthly afterwards (a `#nathan` task, or a scheduled GitHub Action once `EMDASH_TOKEN` is a repo secret), restored with `emdash site import`.

---

## 6. Editing-without-Claude guide (outline)

File: `docs/EDITING-GUIDE.md`, written in plain language for Nathan, one section added by each PR, finished in PR 14. Outline:

1. **Signing in.** `https://www.nixoncreativestudio.com/_emdash/admin`, the passkey, which login to use (Editor for edits, Admin for redirects).
2. **The two rules.** Save keeps a draft; Publish makes it live. Changes show on the site within a minute (or 5 minutes under the fallback). Never delete or unpublish an entry under "Pages" or "Site settings".
3. **Where everything lives.** A table: thing on the site, admin location, field name (for example "Footer email: Site settings, Email").
4. **Common jobs, step by step.**
   1. Update the About "Currently" block (and bump "Currently updated").
   2. Change a price (tier, add-on), then the price checklist: FAQ answer "What does it cost?", contact budget brackets, the services pricing footnote.
   3. Add, edit or reorder an FAQ question.
   4. Change contact details, then the email checklist: privacy and accessibility intros.
   5. Edit the header or footer menu, and the mobile description (the "Title attribute" box).
   6. Publish a case study (existing doc, summarised), including the "Featured" and "Show in the homepage device scene" switches.
   7. Write and publish a journal entry; save a draft.
   8. Add photos to the photography page.
   9. Edit the privacy, accessibility or colophon page, and "Last updated".
   10. Add a redirect when you retire or rename a page.
   11. Swap the About headshot or a photo, with alt text.
   12. (If PR 14's catch-all ships) Publish a new plain page.
5. **Field limits and what they protect.** Why a box stops at 40 characters, why there are exactly four process steps, why an image without alt text does not appear.
6. **Undoing a mistake.** History and restore; what to do if a page looks broken (restore the last good revision, then publish).
7. **What you cannot change here, and why.** The list from 1.14, so nothing feels missing by accident.
8. **Screens to ignore.** Comments, Widgets, Sections, Bylines, Content Types, Settings General.
9. **When something is really wrong.** Cloudflare Deployments rollback, D1 Time Travel (with the exact command), who to call; where the monthly backup lives.

---

## 7. Questions only Nathan can answer

1. **Editor-role login:** do you want a second "editing" login that hides the schema screens (needs a second email address for the invite), or stay on one Admin login?
2. **Contact form values:** OK for the budget, timeline and "heard from" answers in your inquiry emails to show the visible label ("Under $4,000") instead of the internal code (`under-4k`)?
3. **Journal timing:** do you plan to write soon? If not, PR 12 can wait and `posts` stays hidden.
4. **Production writes:** will you create an EmDash API token (Settings, API tokens) and keep it in 1Password, or approve each data step live in the admin console?
5. **Workers plan:** are you on Workers Paid? It decides the CPU limit for server-rendering every page, the D1 Time Travel window (30 vs 7 days), and is worth confirming before PR 2.
6. **OG share images:** OK that the share-card titles stay in code (they only regenerate on a deploy)?
7. **Colophon wording:** approve replacing "Every page is static HTML" with a line saying the pages are rendered on Cloudflare's edge.
8. **New pages without Claude:** do you want the optional catch-all so you can publish a new plain page yourself (PR 14)?
