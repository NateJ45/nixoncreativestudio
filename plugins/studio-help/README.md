# studio-help

A reusable help layer for the EmDash admin. Non-technical editors get a pop-up tour the first time they open the dashboard, a Help page that is always there, a "Start here" dashboard widget, and a short "About this screen" note in every entry editor. All the words come from one JSON file, so a new site changes one file and no code.

The plugin code contains no site-specific text. Copy this folder into another EmDash site, write that site's `tour.json`, register it, done (see `docs/stack-template/ADMIN-HELP.md` in the NCS repo for the 10-minute version).

## What it adds to the admin

| Piece                     | Where it shows                                                                                            | Source in this folder                            |
| ------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Pop-up tour (modal)       | Opens on its own the first time a user lands on the dashboard; re-launch from the widget or the Help page | `src/ui/TourModal.tsx`, logic in `src/engine.ts` |
| Dashboard widget          | Dashboard, "Start here": intro, Take the tour, quick links                                                | `src/ui/StartHereWidget.tsx`                     |
| Help page                 | Sidebar, "Help": tour written out, "I want to change X, go to Y" table, leave-alone list, extra topics    | `src/ui/HelpPage.tsx`                            |
| "About this screen" panel | Sidebar of every entry editor, text by collection slug                                                    | `src/ui/EditorPanel.tsx`                         |
| Server routes             | `/_emdash/api/plugins/studio-help/content` and `/state`                                                   | `src/plugin.ts`                                  |

It is a **trusted (native) plugin**: it ships React for the admin, which a sandboxed plugin cannot. It therefore runs in the site's Worker, not in an isolate, and it does not use the `LOADER` binding (that binding is for sandboxed plugins). The admin half is bundled only into the admin page (`/_emdash/admin`); no public page imports it, so public HTML, CSS and JavaScript are byte-identical with or without the plugin.

## How "first sign-in" works (and its limit)

EmDash gives a plugin no global slot that runs on every admin screen. A plugin can add pages, dashboard widgets, field widgets and editor panels, nothing else. So the tour is opened by the dashboard widget: the first time a user's dashboard shows the current tour id, the tour opens. EmDash sends everyone to the dashboard after sign-in, so for a normal sign-in this is the same moment. A user who deep-links straight into an entry sees the tour the next time they open the dashboard. The tour's cards spotlight sidebar links (sidebar is on every screen) but the tour itself only auto-opens from the dashboard.

The per-user "seen" record is stored on the server in the plugin's key-value store (`ctx.kv`, key `seen:<userId>`), so it follows a person across browsers. If the server cannot be reached, a browser copy (`localStorage`, key `studio-help:seen:<userId>`) keeps it to once per person per browser, and a per-tab `sessionStorage` flag stops it re-opening within a session.

Change `tour.id` in the content file and everyone sees the revised tour once more.

## The content file

One JSON file, validated when `astro.config.mjs` loads (so a typo fails `astro dev` and `astro build` with every problem listed, each with its JSON path) and again when the Worker starts. Types: `src/types.ts`. Validator: `src/validate.ts`.

```jsonc
{
  "version": 1,
  "tour": {
    "id": "welcome-1", // lowercase letters, digits, dashes. Change it to re-show the tour to everyone.
    "title": "How this site works", // 80 chars
    "intro": "Two sentences.", // 400 chars, optional
    "autoStart": true, // default true; false = only the buttons open it
    "steps": [
      // 1 to 30
      {
        "id": "welcome", // unique, lowercase/digits/dashes
        "title": "Welcome", // 80 chars
        "body": "Paragraph one.\n\nParagraph two.", // 900 chars, blank line = new paragraph, plain text only
        "target": "a[href$=\"/content/posts\"]", // optional CSS selector to spotlight; no match = centred card
        "path": "/content/posts", // optional admin path (starts with /) shown as a link
        "pathLabel": "Open the Journal", // optional, 60 chars
      },
    ],
  },
  "help": {
    "intro": "Top of the Help page.",
    "quickLinks": [
      { "label": "Home page", "path": "/content/page_home", "description": "optional" },
    ], // max 8, shown on the widget
    "goals": [
      {
        "want": "A price",
        "goTo": "Pricing tiers",
        "path": "/content/pricing_tiers",
        "note": "optional",
      },
    ], // max 60
    "leaveAlone": [{ "title": "Content Types", "body": "Never edit anything here." }], // max 20
    "topics": [{ "title": "Who to call", "body": "..." }], // max 20, free-form sections
  },
  "collections": {
    // notes keyed by collection slug (the last part of the admin URL)
    "posts": { "controls": "One Journal entry.", "leaveAlone": "optional", "live": "optional" },
  },
  "collectionDefault": { "controls": "...", "live": "..." }, // optional; used for any collection with no entry above
}
```

`path` values are relative to `/_emdash/admin`. Everything is plain text; there is no HTML or markdown, so a typo cannot break a screen.

Writing the sidebar selectors: sidebar links are anchors whose `href` ends in the screen's path, so `a[href$="/content/<collection-slug>"]` (or `/menus`, `/media`) points at them. If the admin is restyled or a group is collapsed and nothing matches, the step shows centred, which is still correct. Selectors were written from the admin's router paths and have not been checked against the rendered sidebar (see the NCS `docs/TESTING.md` for what was and was not exercised).

## Register it

In `astro.config.mjs`:

```js
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { studioHelp } from './plugins/studio-help/src/descriptor.ts';

const helpContent = JSON.parse(
  readFileSync(fileURLToPath(new URL('./cms/help/tour.json', import.meta.url)), 'utf8'),
);

emdash({
  // ...database, storage...
  plugins: [studioHelp({ content: helpContent })],
});
```

Requirements: EmDash 1.1.x with the Astro integration (`emdash/astro`), React 19 in the project, `tsconfig` allowing `.ts` import extensions (Astro's base config does). No new npm dependency is needed. Where the content file lives is up to the site; only the `readFileSync` path changes.

## Tests

`src/engine.test.ts` and `src/validate.test.ts` run under `node --experimental-strip-types --test` (the NCS `npm run test:unit` includes them). They cover step navigation, the once-per-user decision, the seen-record shape, card placement, the validator's error messages, and (in `validate.test.ts`) the real NCS `cms/help/tour.json` against the studio's writing rules. A browser test of the UI components lives in the NCS repo (`tests/studio-help.spec.ts`). Neither can sign in to a real admin; click through once after wiring a new site (checklist in `docs/stack-template/ADMIN-HELP.md`).

## Files

```
plugins/studio-help/
  README.md           this file
  package.json        marker only (no dependencies; the plugin uses what the site already has)
  src/
    types.ts          the content-file types
    validate.ts       validator + noteFor()
    engine.ts         pure tour logic (navigation, once-per-user, placement)
    constants.ts      plugin id, route names, admin URLs (one place)
    descriptor.ts     studioHelp(): what astro.config.mjs calls
    plugin.ts         server half: createPlugin(), the two routes
    admin.tsx         admin half: exports pages, widgets, contentEditorPanels
    ui/               TourModal, StartHereWidget, HelpPage, EditorPanel, api, styles, useHelp
    *.test.ts         unit tests
```
