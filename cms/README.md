# cms/

The committed side of the editable-content build (design: `docs/CMS-DESIGN.md`). Nothing here is read by a page until a content PR (4 to 13) moves a page onto it.

| Folder         | What lives here                                                                                                                                                                                                                                                                                             |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cms/schema/`  | One `<collection>.mjs` per collection exporting `SLUG`, `COLLECTION`, `FIELDS` (and optionally `OBSOLETE_FIELDS`). Applied by `npm run cms:schema`. Build them with `singletonSettings()` and `commonPageFields()` from `scripts/lib/emdash-schema.mjs`.                                                    |
| `cms/content/` | The migrated literal values, one `<collection>.json` per collection (a singleton `{ "slug", "data" }` or an array of them), plus `menus.json` and `redirects.json`. Loaded by `npm run cms:load`, and bundled into the site as the offline fallback `src/lib/cms.ts` serves when an entry or D1 is missing. |

Images in a content file are `{ "$file": "src/assets/...", "alt": "..." }`; the loader uploads them. Portable Text fields hold literal blocks: write the text as Markdown and run `npm run cms:pt -- file.md` to get the JSON.

Commands and the full recipe: `docs/CMS-DESIGN.md` section 2.1, and `docs/LAUNCH-RUNBOOK.md` for the production steps.
