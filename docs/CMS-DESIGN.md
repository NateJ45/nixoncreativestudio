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

- `cms/schema/<collection>.mjs`: one file per collection, same shape as `scripts/lib/case-studies-schema.mjs` (`SLUG`, `COLLECTION`, `FIELDS`), applied by a generic `applyCollectionSchema(request, def)` in `scripts/lib/emdash-schema.mjs` (PR 3).
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

| Field              | Type     | Req | Validation                                                 | Source                                                                                                        |
| ------------------ | -------- | --- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `title`            | string   | yes | maxLength 32                                               | `title`                                                                                                       |
| `lede`             | text     | yes | maxLength 180                                              | `lede`                                                                                                        |
| `body`             | text     | yes | maxLength 500                                              | `body` (also Service JSON-LD description)                                                                     |
| `price_from`       | integer  | no  | min 0, max 100000                                          | `priceFrom` (display + JSON-LD Offer)                                                                         |
| `image`            | image    | no  |                                                            | `image` (web design: the Second Presbyterian cover; the loader's SHA-1 de-dup reuses the existing media item) |
| `image_alt`        | string   | no  | maxLength 160                                              | `imageAlt`                                                                                                    |
| `placeholder_icon` | select   | yes | options `strategy`, `photography`, `none`                  | `placeholderIcon` (`none` for web design)                                                                     |
| `points`           | repeater | yes | minItems 3, maxItems 5; sub `text` string req maxLength 90 | `points`                                                                                                      |
| `area_served`      | select   | yes | options `regional`, `anywhere`                             | the JSON-LD rule (Photography `regional`, others `anywhere`)                                                  |
| `sort_order`       | integer  | yes | min 1, max 99                                              | order                                                                                                         |

JSON-LD: one Service per offering, `areaServed` from the select (`regional` = "Greater Cincinnati region"; `anywhere` = both values), Offer only when `price_from` is set. The SVG markup for the placeholder icons stays in code, keyed by the select.

`page_services`:

| Field                   | Type     | Req | Validation                                                                                        | Source                                  |
| ----------------------- | -------- | --- | ------------------------------------------------------------------------------------------------- | --------------------------------------- |
| common `seo_*`, `cta_*` |          |     |                                                                                                   | page props; CtaBanner overrides         |
| `heading`               | string   | yes | maxLength 110                                                                                     | h1                                      |
| `intro`                 | text     | yes | maxLength 260                                                                                     | hero sub                                |
| `pricing_heading`       | string   | yes | maxLength 40                                                                                      | "What a website costs"                  |
| `pricing_sub`           | text     | yes | maxLength 220                                                                                     | its sub                                 |
| `pricing_footnote`      | text     | yes | maxLength 420                                                                                     | "A starting point, not a fixed menu..." |
| `addons_heading`        | string   | yes | maxLength 32                                                                                      | "Add to any project"                    |
| `why_heading`           | string   | yes | maxLength 40                                                                                      | "Why it costs what it costs"            |
| `why_sub`               | text     | yes | maxLength 200                                                                                     | its sub                                 |
| `why_items`             | repeater | yes | minItems 4, maxItems 4; sub `title` string req maxLength 40, `body` text req maxLength 360        | `whyItCosts`                            |
| `why_closing`           | text     | yes | maxLength 420                                                                                     | closing paragraph after the grid        |
| `faq_heading`           | string   | yes | maxLength 40                                                                                      | "Common questions"                      |
| `faq_sub`               | text     | yes | maxLength 200                                                                                     | its sub                                 |
| `faq`                   | repeater | yes | minItems 3, maxItems 10; sub `question` string req maxLength 140, `answer` text req maxLength 900 | `faq`; FAQPage JSON-LD built from it    |

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

| Field                   | Type     | Req | Validation                                                  | Source                              |
| ----------------------- | -------- | --- | ----------------------------------------------------------- | ----------------------------------- |
| common `seo_*`, `cta_*` |          |     |                                                             | props; CtaBanner overrides          |
| `cta_label`             | string   | yes | maxLength 24                                                | "Email me" (href is the site email) |
| `heading`               | string   | yes | maxLength 40                                                | "Start a project, or just"          |
| `heading_accent`        | string   | yes | maxLength 24                                                | "say hello."                        |
| `intro`                 | text     | yes | maxLength 400                                               | hero paragraph                      |
| `next_steps`            | repeater | yes | minItems 2, maxItems 4; sub `text` string req maxLength 120 | `nextSteps`                         |
| `budgets`               | repeater | yes | minItems 2, maxItems 6; sub `label` string req maxLength 40 | `budgets`                           |
| `timelines`             | repeater | yes | minItems 2, maxItems 6; sub `label` string req maxLength 48 | `timelines`                         |
| `heard_from`            | repeater | yes | minItems 2, maxItems 8; sub `label` string req maxLength 64 | `heardFromOptions`                  |
| `response_time`         | text     | yes | maxLength 200                                               | sidebar response-time text          |

The submitted value of a budget, timeline or heard-from option becomes its label text (today it is a slug like `under-4k`), so Nathan's inbound emails read naturally and he never edits an invisible value. Field labels, help text, validation messages, the success message (it interpolates the domain) and the Web3Forms handler stay in code. `orgTypes` stays in code (section 0, item 8).

### 1.9 Work index, photography, journal index, 404

`page_work` (entry `work`): common `seo_*`, `cta_*`; `eyebrow` string maxLength 40; `heading` string req maxLength 40; `intro` text req maxLength 260 (the computed project count stays in code and renders before it, exactly as today); `empty_filter_message` string req maxLength 120; `live_heading` string req maxLength 40 ("Open any of them"); `live_body` text req maxLength 300. Filter chip labels stay derived.

`page_photography` (entry `photography`): common `seo_*`, `cta_*`; `heading` string req maxLength 40; `heading_accent` string req maxLength 40; `intro` text req maxLength 300; `events_title`, `portraits_title`, `environments_title` string req maxLength 32; `events_intro`, `portraits_intro`, `environments_intro` text req maxLength 400 (replaces `CATEGORY_META`; three fixed fields, not a repeater, because the categories are the `photos.category` select); `empty_heading` string req maxLength 60; `empty_body` text req maxLength 300.

`page_journal` (entry `journal`): common `seo_*`, `cta_*`; `heading` string req maxLength 40; `intro` text req maxLength 260; `empty_kicker` string req maxLength 40; `empty_heading` string req maxLength 60; `empty_body` text req maxLength 300.

`page_not_found` (entry `not-found`): `seo_title`, `seo_description`; `label` string req maxLength 32 (the mono label); `heading` string req maxLength 40; `body` text req maxLength 220; `links` repeater minItems 1, maxItems 3, sub `label` string req maxLength 24, `href` string req maxLength 80 pattern `^/`.

### 1.10 Prose pages: `pages` (template collection, extended)

Relabel to "Other pages", group `Pages`, `urlPattern: '/{slug}/'`, supports `drafts`, `revisions`, `search`. Entries `privacy`, `accessibility`, `colophon`. Added fields (`title` and `content` already exist):

| Field          | Type         | Req | Validation                                                                        | Notes                                              |
| -------------- | ------------ | --- | --------------------------------------------------------------------------------- | -------------------------------------------------- |
| `title`        | string       | yes | maxLength 60 (add)                                                                | h1 and `seo_title`                                 |
| `summary`      | text         | yes | minLength 50, maxLength 160                                                       | meta description                                   |
| `intro`        | portableText | no  |                                                                                   | lead paragraph (links allowed, for the email link) |
| `content`      | portableText | no  |                                                                                   | body; h2 headings become the table of contents     |
| `rows`         | repeater     | no  | maxItems 12; sub `label` string req maxLength 32, `detail` text req maxLength 400 | colophon label/detail rows                         |
| `show_toc`     | boolean      | no  |                                                                                   | privacy and accessibility on                       |
| `last_updated` | datetime     | no  |                                                                                   | "Last updated" line                                |

One template, `src/components/ProsePage.astro`, rendered by fixed routes `src/pages/privacy.astro`, `accessibility.astro`, `colophon.astro` (each reads its own slug; no catch-all yet). h2 ids come from `slugify` in `src/lib/caseStudies.ts`; the current ids (`contact-form`, `analytics`, ...) equal the slugified labels, so inbound anchors survive. Bullet lists inside `content` take the tick-list styling the accessibility "practices" list has today. The colophon's computed "Last built" row stays in code and renders after `rows`. Migration is a content correction for the colophon: its "Every page is static HTML" row is false after section 3, so the migrated text says the pages are rendered on Cloudflare's edge (flagged in section 7 for Nathan to approve).

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
2. **Schema into production:** `EMDASH_TOKEN=... node scripts/cms/apply-schema.mjs --collection <slug> --url https://www.nixoncreativestudio.com` (REST; the CLI cannot set options, flags, groups or titleField). Idempotent.
3. **Content into production:** `node scripts/cms/load-content.mjs --collection <slug> --url <prod>`: uploads `$file` images with `emdash media upload` (SHA-1 de-dup, reusing `scripts/lib/emdash-cli.mjs`), then `emdash content create --slug <slug> --file <tmp.json>` or `content update --rev`, published. Menus and redirects go through REST (`/menus`, `/redirects`) in the same script. Nothing reads the new data yet, so this is invisible on the live site.
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
  - Content rows of an allowlist: `case_studies` (the 3 CI slugs only), every singleton collection, `pricing_tiers`, `pricing_addons`, `service_offerings`, `pages` (privacy, accessibility, colophon). `photos` and `posts`: the fixtures in `scripts/ci-dataset/fixtures.sql` instead (one photo, one published and one draft journal entry, written by hand so production does not need test content).
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

| PR      | State                                                                                                             |
| ------- | ----------------------------------------------------------------------------------------------------------------- |
| 0       | merged (#51)                                                                                                      |
| 1       | built, in review: `scripts/ci-dataset/` (snapshot, rebuild, fixtures), `npm run ci-dataset`, seed export extended |
| 2       | built, in review: `output: 'server'`, route cache, `toolbar: 'client'`, measurements below                        |
| 3 to 14 | not started                                                                                                       |

**PR 1 notes (2026-10-03).** Two deviations from section 2.3, both forced by the rule that production is read only through the `emdash` CLI login and public URLs: (1) `snapshot.mjs` builds rows from `content get --raw --published`, `media list` and `taxonomy terms`, not from `wrangler d1 execute` on production, so it maps fields to `ec_<slug>` columns itself (images and repeaters as JSON text, system and author ids nulled) and was checked against the previously hand-built `ncs-ci` rows: body and highlights JSON semantically equal, only media storage keys differ (CI now uses production's keys); (2) per-entry taxonomy links are not readable through the CLI, so `terms.json` pins them. R2 files are copied from the live site's public media URLs with a size and SHA-1 check, not from the production bucket. `--from-scratch` drops tables children-first: dropping `users` before `_emdash_comments` fails with `no such table: main.users`, which is the real error D1 returns (as `D1_RESET_DO`) for an import that hits it. `export-seed-from-instance.mjs` gained `--check` and now writes the seed through prettier; its menu, redirect and `titleField`/`sortOrder`/`admin` paths need an API token or a non-empty menu to prove (docs/PENDING.md item 6). A re-export against production changed one thing in `seed/seed.json`: `urlPattern: "/work/{slug}/"` on `case_studies`.

**PR 2 notes (2026-10-03).** The route cache works on this account: Workers Cache answers `MISS` then `HIT` on workers.dev, partitioned by Worker version, and the adapter writes `cache.enabled` into the wrangler config itself, so the 3.2 fallback was not needed. Measured warm TTFB on ncs-ci: `/` 200 to 86 ms, `/about/` 186 to 84 ms, `/privacy/` 90 to 82 ms, `/contact/` 90 to 81 ms, case study 186 to 83 ms; the first request after a deploy is a MISS of 0.5 to 1.6 s. Lighthouse LCP did not regress (homepage 3.5 to 3.2 s, case study 3.9 to 3.8 s, same machine). Four deviations from 3.2 and 3.3, all in `docs/EMDASH.md` "Route cache": (1) no global `routeRules` entry, because `'/[...path]'` also matches `/_emdash/**`; `BaseLayout` sets the lifetime per page instead; (2) the lifetime is 5 minutes, not a day, until a real publish has been seen to purge on the live zone (the end-to-end proof needs an admin login, so it is a first-deploy check in `docs/PENDING.md`); stale-while-revalidate keeps visitors fast anyway; (3) `src/worker.ts` also redirects slashless page URLs, forces `no-store` on non-200s and cookies, and adds the five `_headers` security headers to HTML, because the assets binding no longer serves HTML; (4) `/404/` answers 200 by name so the Lighthouse gate can still audit the template. The colophon "Every page is static HTML" line was rewritten (question 7 was answered by the task, not by Nathan: say so if the wording needs changing).

---

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
