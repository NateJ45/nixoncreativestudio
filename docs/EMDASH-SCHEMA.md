# EmDash `case_studies` collection

Reference for the case study collection on the EmDash instance (built on the
trial Worker, which has since been deleted; production and the `ncs-ci` sample
now carry the same schema from `seed/seed.json`), and for the script that
filled it from the 9 MDX files (West Chester Preschool was deliberately dropped from the portfolio and must not be re-added). Written so page templates can be built from this
doc alone. Last verified against the trial instance (since deleted) on 2026-10-02, after the taxonomy pass.

- Collection slug: `case_studies` (label "Case Studies", singular "Case Study")
- Supports: `drafts`, `revisions`, `seo` (per-entry SEO panel, sitemap entry), `search`. Sidebar group "Portfolio" (Case Studies, Services, Stack, Topics). Routable. Comments off.
- Entry `slug` = the old MDX filename without `.mdx` (for example
  `second-presbyterian-chicago`), so `/work/<slug>/` URLs are unchanged.
- All 9 entries are `published`. Entry count verified: 9.
- Define it again on a fresh instance with `EMDASH_TOKEN=<token> node
scripts/emdash-schema-case-studies.mjs --url <instance>`, then fill it with
  `EMDASH_TOKEN=<token> node scripts/migrate-case-studies.mjs --url <instance>`
  (see "Re-creating the schema" below). Or let `seed/seed.json` create the schema
  on a fresh production instance.

## Field definitions

Field slugs are snake_case and are the keys of `entry.data`. System fields (`id`,
`slug`, `status`, `published_at`, `updated_at`, ...) are reserved by EmDash and are
separate from the `published` and `updated` content fields below.

| Field               | Type         | Req | Stored shape                                                                            | MDX source                                 |
| ------------------- | ------------ | --- | --------------------------------------------------------------------------------------- | ------------------------------------------ |
| `title`             | string       | yes | string                                                                                  | `title`                                    |
| `client`            | string       | yes | string                                                                                  | `client`                                   |
| `sector`            | select       | yes | `"church"`, `"school"`, `"nonprofit"` or `"small-business"` (real option list, indexed) | `sector`                                   |
| `role`              | string       | no  | string                                                                                  | `role`                                     |
| `summary`           | text         | yes | string, max 200 chars                                                                   | `summary`                                  |
| `description`       | text         | no  | string, max 500 chars (no case study uses it yet)                                       | `description`                              |
| `cover`             | image        | yes | image value (below)                                                                     | `cover`                                    |
| `year`              | integer      | yes | number                                                                                  | `year`                                     |
| `featured`          | boolean      | no  | stored as `0` or `1`                                                                    | `featured`                                 |
| `published`         | datetime     | yes | ISO string with `Z`, for example `"2026-05-01T00:00:00.000Z"`                           | `published`                                |
| `updated`           | datetime     | no  | ISO string (no entry has one yet)                                                       | `updated`                                  |
| `live_url`          | url          | no  | string                                                                                  | `liveUrl`                                  |
| `outcome`           | text         | no  | string, max 160 chars                                                                   | `outcome`                                  |
| `testimonial_quote` | text         | no  | string (no entry has one yet)                                                           | `testimonial.quote`                        |
| `testimonial_name`  | string       | no  | string                                                                                  | `testimonial.name`                         |
| `testimonial_title` | string       | no  | string                                                                                  | `testimonial.title`                        |
| `results`           | repeater     | no  | rows `{ text: string }`, one sub-field `text` (label "Result")                          | `results`                                  |
| `designer_note`     | text         | no  | string                                                                                  | `designerNote`                             |
| `body`              | portableText | no  | Portable Text block array                                                               | the MDX prose                              |
| `showcase_desktop`  | image        | no  | image value                                                                             | `shots/<slug>-home.png`                    |
| `showcase_mobile`   | image        | no  | image value; absent on first-baptist-muncie and first-presbyterian-orangeburg           | `shots/<slug>-mobile.png`                  |
| `showcase_alt`      | string       | no  | string                                                                                  | `<SiteShowcase alt>`                       |
| `showcase_href`     | url          | no  | string                                                                                  | `<SiteShowcase href>`                      |
| `showcase_label`    | string       | no  | string                                                                                  | `<SiteShowcase label>`                     |
| `showcase_variant`  | select       | no  | `"scroll"` or `"zoom"`                                                                  | `<SiteShowcase variant>`, default `scroll` |
| `highlights`        | repeater     | no  | array of highlight rows (below); absent when none                                       | `<FeatureHighlight>`                       |
| `before_image`      | image        | no  | image value                                                                             | `<BeforeAfter before>`                     |
| `before_alt`        | string       | no  | string                                                                                  | `<BeforeAfter beforeAlt>`                  |
| `before_label`      | string       | no  | string, default `"Before"`                                                              | `<BeforeAfter beforeLabel>`                |
| `after_image`       | image        | no  | image value (the same media item as `cover`)                                            | `<BeforeAfter after>`                      |
| `after_alt`         | string       | no  | string                                                                                  | `<BeforeAfter afterAlt>`                   |
| `after_label`       | string       | no  | string, default `"After"`                                                               | `<BeforeAfter afterLabel>`                 |

Empty optional fields are omitted from `entry.data` (no `null` padding) unless the
CMS returns the column as `null`; test for presence with a plain truthiness check.

### Taxonomies (replace the old services / tags / stack fields)

Flat (non-hierarchical) taxonomies attached to `case_studies`. They are not fields,
so they are absent from `entry.data`'s own keys and arrive hydrated on
`entry.data.terms`, keyed by taxonomy name.

| Taxonomy  | Label    | MDX source | Terms (current)                                             |
| --------- | -------- | ---------- | ----------------------------------------------------------- |
| `service` | Services | `services` | Strategy, Web Design                                        |
| `topic`   | Topics   | `tags`     | 29 terms (Church, Wix, Trail Running, ...)                  |
| `stack`   | Stack    | `stack`    | 15 terms (Astro, Sanity, Tailwind, Cloudflare Workers, ...) |

- **Why `topic`, not `tag`:** the template already ships a built-in `tag` taxonomy
  (label "Tags", attached to `posts`), and `category` too. Reusing the name would
  have mixed case study tags into the posts' Tags screen. The names must match
  exactly in queries: `where: { service: 'strategy' }`, never `services`.
- Term labels are the MDX strings verbatim; the slug is derived (`Web Design` is
  `web-design`).
- **Order.** Hydrated `entry.data.terms` come back alphabetical, but the MDX lists
  were written in a deliberate order ("Astro, Sanity, Cloudflare Workers, ...").
  Terms are therefore created in a merged order that satisfies every study (the
  migration's `mergeOrders`), and `src/lib/caseStudies.ts` sorts each entry's
  labels by the taxonomy's term order (`getTaxonomyTerms`). Adding a term in the
  admin appends it to the end of that order. All 9 studies render their lists in
  exactly the MDX order.
- Per-entry terms via the API use `entry.data.id` (the ULID) with
  `getEntryTerms()`; hydration makes that unnecessary on the site.

### Treat these with care

- `featured` comes back as `0` or `1`. Use `Boolean(entry.data.featured)`.
- To list the homepage Selected Work: filter on `featured`, sort by `published`
  descending, take 3. `published`, `featured`, `year` and `sector` are marked
  `indexed`; the page still filters and sorts in code, which is fine at 9 entries. Do not use the system `published_at` column for the case study
  date: it is the moment of the migration, not the project date.
- `results` is `[{ text }]`; `getCaseStudies()` flattens it to `string[]`.
- Entry link: `/work/${entry.id}/` (`entry.id` is the slug, per the EmDash docs).

## Shared shapes

### Image value

Every `image` field, and every `image` inside a highlight row, holds a reference to
a media library item. Images are uploaded once (de-duplicated by SHA-1 content
hash), so `cover` and `after_image` point at the same media id.

Real value read back from `case_studies/second-presbyterian-chicago`, field
`showcase_mobile` (top-level image fields are re-normalised by the server on write):

```json
{
  "id": "01M3ZCV3NGJJF2F909VXX6X04G",
  "provider": "local",
  "filename": "second-presbyterian-chicago-mobile.png",
  "mimeType": "image/png",
  "width": 545,
  "height": 4000,
  "blurhash": "LRLqIR%L%M%M4nj[xuj[~poft7of",
  "dominantColor": "rgb(163,158,149)",
  "alt": "",
  "meta": {
    "storageKey": "01M3ZCV3CDFN6SZ09EFZH6YTFM.png",
    "caption": null,
    "blurhash": "LRLqIR%L%M%M4nj[xuj[~poft7of",
    "dominantColor": "rgb(163,158,149)"
  }
}
```

Images inside `highlights` rows are stored exactly as the migration wrote them, which
also carries `src`:

```json
{
  "id": "01M3ZCV4XV5BBNXYFB05ZKYF55",
  "src": "/_emdash/api/media/file/01M3ZCV4QS7G6VNG44HWPG4XHK.png",
  "alt": "The Plan a Visit page on the new Second Presbyterian site",
  "width": 1440,
  "height": 900,
  "provider": "local",
  "meta": { "storageKey": "01M3ZCV4QS7G6VNG44HWPG4XHK.png" }
}
```

Always rely on `id`, `width`, `height`, `alt`, `provider` and `meta.storageKey`; do
not rely on `src` being present.

Alt text defaults: `cover` is `The <client> homepage` (a true description; pass
`alt=""` when the image sits right next to a heading naming the same thing, per the
site's accessibility rules). `showcase_desktop` carries the showcase alt,
`showcase_mobile` is `""` (decorative phone frame), `before_image` and
`after_image` carry `before_alt` and `after_alt`, and each highlight image carries
that highlight's `alt`.

### Highlight row (`highlights`, array, in page order)

Real first row from `second-presbyterian-chicago`:

```json
{
  "image": {
    "id": "01M3ZCV4XV5BBNXYFB05ZKYF55",
    "src": "/_emdash/api/media/file/01M3ZCV4QS7G6VNG44HWPG4XHK.png",
    "alt": "The Plan a Visit page on the new Second Presbyterian site",
    "width": 1440,
    "height": 900,
    "provider": "local",
    "meta": { "storageKey": "01M3ZCV4QS7G6VNG44HWPG4XHK.png" }
  },
  "alt": "The Plan a Visit page on the new Second Presbyterian site",
  "title": "A front door built for first-time guests",
  "caption": "Service times, what to expect on a Sunday, and how to find the building, answered up front so a guest never has to dig for the basics.",
  "side": "left"
}
```

Row keys: `image` (image value), `alt`, `title`, `caption`, `side` (`"left"` or
`"right"`, the image side at md and up; the rows alternate). `eyebrow` is carried
if an MDX ever sets one; none do today. `caption` is the MDX `body` prop renamed.
Highlights per study: first-baptist-muncie 2, first-presbyterian-orangeburg 2,
foundation-for-reformed-theology 2, mas-monograms 3, presbyterian-academy 2,
reid-design 0 (field absent), second-presbyterian-chicago 3, stone-steps-50k 3,
theology-matters 2.

### Body (`body`, Portable Text)

An array of standard Portable Text blocks, produced by emdash's own
`markdownToPortableText`. The prose only uses headings (`h2`), paragraphs and
bullet lists, so those are the only shapes present. Real examples:

```json
{
  "_type": "block",
  "_key": "k67",
  "style": "h2",
  "markDefs": [],
  "children": [{ "_type": "span", "_key": "k66", "text": "The brief", "marks": [] }]
}
```

A bullet is a `normal` block with `"listItem": "bullet", "level": 1`. Render with
`PortableText` from `emdash/ui`. Block counts per study: first-baptist-muncie 19,
first-presbyterian-orangeburg 16, foundation-for-reformed-theology 17,
mas-monograms 20, presbyterian-academy 20, reid-design 19,
second-presbyterian-chicago 18, stone-steps-50k 18, theology-matters 23,
(west-chester-preschool is gone).

## Rendering in Astro

Query (per the EmDash querying guide):

```astro
---
import { getEmDashCollection, getEmDashEntry } from 'emdash';
import { Image, PortableText } from 'emdash/ui';

const { entry } = await getEmDashEntry('case_studies', slug); // slug = entry.id
const d = entry.data;
---
```

Images: pass the whole field value to `Image` from `emdash/ui`. It builds the URL
from `meta.storageKey` (or `id`), generates the srcset, and paints the blurhash
placeholder. Override alt or size with props.

```astro
{d.cover && <Image image={d.cover} alt="" priority />}
{/* hero, alt="" next to the h1 */}
{d.showcase_desktop && <Image image={d.showcase_desktop} alt={d.showcase_alt} />}
{d.highlights?.map((h) => (
  <Image image={h.image} alt={h.alt} sizes="(min-width: 48rem) 46vw, 92vw" />
))}
<PortableText value={d.body} />
```

Template rules that replace the MDX component imports:

1. **SiteShowcase**: render `showcase_desktop` in the browser frame, linking to
   `showcase_href`, address-bar text `showcase_label`, motion per
   `showcase_variant`. If `showcase_mobile` is set, show it in the phone frame;
   if not, desktop only (this is the old component's behaviour). The old
   component took a `slug` and looked the files up; the new one reads the fields.
2. **FeatureHighlight**: one per `highlights` row, `side` from the row.
3. **BeforeAfter**: render only when both `before_image` and `after_image` exist,
   with `before_alt`/`after_alt` and `before_label`/`after_label`.
4. **Lightbox**: render once at the end of the page whenever `highlights` is
   non-empty (it was a manual `<Lightbox />` line at the bottom of each MDX).

Placement inside the page. MDX embedded components in the prose, and the
collection stores them separately, so the page order is a template rule. It matched
all 9 MDX files exactly:

1. `showcase_*` block at the very top, above the body.
2. Body, with these insertions: `before_image`/`after_image` (when present) go
   immediately before the `## The approach` heading (they sat after the last
   paragraph of "The brief"); the `highlights` rows go immediately after the
   `## What we built` heading, before its bullet list.
3. Lightbox at the end.

Split the body array on the first block whose `style` is `h2` with text
`The approach` and the one with text `What we built`. Both headings exist in all 9
bodies.

## How the migration maps MDX to fields

`scripts/migrate-case-studies.mjs` (idempotent; `--only <slug>` and `--dry-run`
supported):

1. Splits the MDX into frontmatter (parsed with `js-yaml`) and body.
2. Reads the `import x from '...png'` lines to resolve image variables to files.
3. Finds every `<SiteShowcase>`, `<FeatureHighlight>` and `<BeforeAfter>` tag and
   parses its `name="text"` and `name={importedImage}` props.
4. Uploads each distinct image once (`emdash media upload`), reusing an existing
   media item when its SHA-1 matches; builds the image value from the upload
   result.
5. Fills the fields per the "MDX source" column above. `<SiteShowcase>` has no
   image props, so the script resolves `shots/<slug>-home.png` and
   `shots/<slug>-mobile.png` the same way the component did (mobile only if the
   file exists).
6. Deletes imports, the three component tags, `<Lightbox />` and `{/* */}` comments
   from the body, rewrites `*italic*` to `_italic_` (the converter does not read
   single-star italics; none of the current prose uses them), and converts the rest
   with `markdownToPortableText`.
7. `published` is `new Date(frontmatter.published).toISOString()`; js-yaml reads
   `2026-05-01` as UTC midnight, so the stored value is exactly
   `2026-05-01T00:00:00.000Z`. Verified for all 9.
8. `results` becomes repeater rows `[{ text }]`. `services`, `tags` and `stack` become
   term labels for the `service`, `topic` and `stack` taxonomies; after the last
   entry the script calls `applyTerms()`, which wipes and recreates the three
   taxonomies' terms in a merged order and assigns them (needs `EMDASH_TOKEN`; with
   no token pass `--terms-out plan.json` and apply the plan from the admin console).
9. Looks the entry up by slug (`content get`); `content create --slug` if missing,
   `content update --rev` if present. Entries are published (the CLI default).

Content and media go through the `emdash` CLI (`scripts/lib/emdash-cli.mjs`), which
uses its stored login. The schema and the terms need the REST API, because the CLI
cannot create taxonomies, set select options, set indexed or searchable flags,
turn on `seo`, set the sidebar group, or assign terms.

## Re-creating the schema

The single definition is `scripts/lib/case-studies-schema.mjs` (collection
settings, every field, the three taxonomies, plus `applySchema()` and
`applyTerms()`). Idempotent. Three ways to run it:

1. **Node with a token:** create an API token in the admin (Settings, API tokens),
   then `EMDASH_TOKEN=... node scripts/emdash-schema-case-studies.mjs --url <instance>`
   and `EMDASH_TOKEN=... node scripts/migrate-case-studies.mjs --url <instance>`.
2. **Admin console (no token):** open the admin, paste the two functions into the
   browser console with a tiny `request(method, path, body)` that does
   `fetch('/_emdash/api' + path, { method, headers: { 'X-EmDash-Request': '1',
'Content-Type': 'application/json' }, body })` and returns `json.data`. The
   signed-in session is the credential. This is how the trial was done on
   2026-10-02. Large `applyTerms()` runs can exceed the console's 45 s tool
   timeout in this environment, so assign terms per taxonomy.
3. **`seed/seed.json` on a fresh production instance:** created by
   `node scripts/export-seed-from-instance.mjs --url <trial>` (schema, taxonomies and
   their terms, no content). EmDash picks up `seed/seed.json` with no `package.json`
   change and applies it once, before the setup wizard is completed. Then run the
   migration to load entries. `npx emdash export-seed` was not used because it reads a
   local SQLite file, not a deployed D1 database.

Changing a field's type (json to repeater) means dropping and re-adding it, so rerun
the migration afterwards. The migration also uploaded 7 stone-steps images a second
time on 2026-10-02 (its media de-dup could not find the earlier uploads), so the media
library holds duplicates of those; delete the older copies in the admin if it matters.

## Known limits and how to fix them

- **`highlights.side` and `results.text`** are repeater sub-fields. `side` is a select with options `left` and `right`; stored shape unchanged.
- **Showcase, before/after and testimonial are flat fields**, not nested objects,
  because EmDash has no object field type and the CLI cannot define a repeater
  with sub-fields. This keeps every image a real, typed `image` field.
- **Component position inside prose is not stored**, only the page-order rule above.
  A new study that wants a component somewhere else would need a custom Portable
  Text block (a plugin component), which was out of scope.
- **Max upload.** The largest file is `stone-steps-50k-home.png` (7 MB), which the
  instance accepted.
- **CLI noise on Windows.** The CLI prints a libuv assertion
  (`UV_HANDLE_CLOSING`) at exit after it has already written its result. The helper
  treats parsed JSON as success.
- The probe collection used while building this was deleted; one soft-deleted
  entry (`probe`) may still sit in the collection trash.

## Update 2026-10-02

The `highlights` repeater now has sub-fields defined in the admin (image: image, alt: string, title: string, caption: text, side: string). Stored data is unchanged: 3 highlights still read back intact on second-presbyterian-chicago. `side` is a plain string (the sub-field UI has no options list for select), so keep the template tolerant of any value and default to alternating.

## Editor setup, done 2026-10-02

The plan below was applied. What differs from the plan:

- Taxonomy for tags is `topic`, not `tag` (built-in `tag` belongs to posts).
- `search` support was enabled too, because the `searchable` flags only take effect with it.
- The Group setting exists: the sidebar shows a "Portfolio" folder with Case Studies,
  Services, Stack and Topics.
- `posts` test entry `hello-emdash` and `src/pages/emdash-test.astro` are deleted; the
  `posts` and `pages` collections remain.
- Entry term order is not stored per entry (see Taxonomies above).
- `seed/seed.json` exported (about 10 KB, schema and taxonomies only).

### Original plan

1. **services, stack, tags become flat taxonomies** (`hierarchical: false`) attached to `case_studies`. Editors get chip pickers instead of raw JSON, and `getEmDashCollection('case_studies', { where: { services: 'strategy' } })` filters natively (the /work chips). Gotchas: the taxonomy name must match exactly (singular vs plural returns empty results silently), and per-entry terms are read with `entry.data.id` (the ULID), not the slug.
2. **results becomes a repeater** with one `text` sub-field (the docs' own portfolio example does the same for galleries).
3. **sector and showcase_variant get option lists** (church, school, nonprofit, small-business; scroll, zoom). Selects, because the set is small and fixed.
4. **Index only what queries sort or filter on:** `published`, `featured`, `year`, `sector`. Mark `title`, `summary`, `body` as `searchable`.
5. **Enable only the features the site uses:** keep drafts and revisions, add `seo` (per-entry SEO panel, sitemap entry, OG image, noindex toggle; render with `<EmDashHead>`), add `search` only if we build site search. Leave comments off.
6. **Use the Group setting** to put case studies in a collapsible sidebar folder; delete the unused template `posts` test entry (`hello-emdash`) and `emdash-test.astro` when the trial ends.
7. **Type changes are not safe in place** (only string/text/slug can swap). json to taxonomy or repeater means removing the field and re-running `scripts/migrate-case-studies.mjs`, which is idempotent.
8. **Schema is applied once from a seed.** After the trial schema is final, run `npx emdash export-seed` into `seed/seed.json` so the production database is created from the same schema at setup instead of being rebuilt by hand.
9. **Site Settings** (title, tagline, social, default OG image) and **Menus** are admin-managed; consider driving the header nav from a `primary` menu later. Slug renames create 301 redirects automatically.
