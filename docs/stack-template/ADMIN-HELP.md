# Admin help for a new EmDash site (about 10 minutes)

The `studio-help` plugin gives every EmDash site a first-run pop-up tour, a Help page, a "Start here" dashboard widget and an "About this screen" note in each entry editor, all from one JSON file. The plugin lives in the NCS repo at `plugins/studio-help/` and has no NCS-specific text in its code. Full reference: `plugins/studio-help/README.md`.

Use it on every site where someone other than the developer will edit content (a church volunteer, a nonprofit's office staff). Do it near the end of the build, once the sidebar groups and collection names are settled.

## Step 1: copy the folder (1 minute)

Copy `plugins/studio-help/` from the NCS repo into the new site at the same path. Nothing to install: it uses React and EmDash, which the site already has.

Also copy `plugins/studio-help/src/*.test.ts` if you want the unit tests, and add `plugins/studio-help/src/*.test.ts` to the site's `test:unit` script. `validate.test.ts` reads `cms/help/tour.json` and the `cms/schema` folder; if the site has no `cms/schema`, delete the test called "names only collections that exist in cms/schema" or point it at the site's collection list.

## Step 2: register it (2 minutes)

In `astro.config.mjs`:

```js
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { studioHelp } from './plugins/studio-help/src/descriptor.ts';

const helpContent = JSON.parse(
  readFileSync(fileURLToPath(new URL('./cms/help/tour.json', import.meta.url)), 'utf8'),
);

// inside emdash({ ... }):
plugins: [studioHelp({ content: helpContent })],
```

If the site's `tsconfig` does not extend `astro/tsconfigs/strict` or base, make sure `allowImportingTsExtensions` is on (the plugin imports `./engine.ts` style paths so it also runs under `node --test`). If `astro dev` dies on a fresh checkout with `MISSING_EXPORT ... use-sync-external-store-with-selector.js` (zustand pulled in by a WebGL hero), see the zustand shim and `optimizeDeps.exclude` in the NCS `astro.config.mjs`; that is unrelated to this plugin.

## Step 3: write the content file (5 minutes)

Copy `cms/help/tour.json` from NCS to `cms/help/tour.json` and edit. Change these, in this order:

1. `tour.id`: a new id for the site, for example `acme-welcome-1`.
2. `tour.steps`: one step per sidebar group, plus the publish rule, the one or two things that hide content when forgotten (the NCS Journal Summary rule is the model), what to leave alone, and where the guide lives. Aim for 7 to 10 steps. Each `target` is a selector for a sidebar link: `a[href$="/content/<collection-slug>"]`.
3. `help.goals`: the "I want to change X, go to Y" table. Take it straight from the site's editing guide.
4. `help.leaveAlone` and `help.topics`: Content Types, unused screens, who to call.
5. `collections`: one note per collection slug (what it controls, what to leave alone, what Publish does).

Writing rules for the words: plain language for a non-technical reader, no HTML or markdown (it is plain text; a blank line starts a new paragraph), and each field has a length limit that the validator enforces. A mistake stops `astro dev` and `astro build` with a message listing every problem and its JSON path.

To show the tour again to everyone after you rewrite it, change `tour.id`.

## Step 4: test it (2 minutes, plus one click-through)

1. `npm run test:unit` (validates the file and the logic).
2. `npm run build` (the plugin must build into the admin chunk only; `grep -rl "studio-help" dist/client` should list one `PluginRegistry.*.js` file and no HTML).
3. Run the parity check on the public pages, which must be zero DIFF (`npm run parity compare`, see the site's `docs/TESTING.md`).
4. After deploy, sign in to the admin once and check the list below. The automated tests cannot sign in, so this is the only proof the real admin accepts the plugin.

### Click-through checklist (real admin)

- The dashboard shows a "Start here" card, and the tour opens on its own on first visit.
- Tab goes Next, Back, dots, Skip tour and wraps; Escape skips; the arrow keys step.
- Spotlight rings land on the sidebar links (if a link is not found the card shows centred, which is fine but worth fixing in the selector).
- Reload the dashboard: the tour does not open again. Take the tour from the card: it opens. Sign in as a second user: it opens once for them.
- Sidebar has **Help**; the page lists the steps, the table and the leave-alone list.
- An entry editor shows "About this screen" in its sidebar.
- Light and dark admin themes both read well.

## What to customise per site, and what to leave alone

Customise: `cms/help/tour.json` only, plus the path in `astro.config.mjs`. Leave alone: everything under `plugins/studio-help/src/`. If a site needs something the plugin cannot do, fix it in NCS's `plugins/studio-help/` and copy the folder again, so every site keeps one version.

## Known limits (all sites)

- The tour opens from the dashboard widget, not from an arbitrary first screen: EmDash offers a plugin no global slot (only pages, widgets, field widgets and editor panels). Everyone lands on the dashboard after sign-in, so this is the same moment in practice.
- Per-user state is stored in the plugin's key-value store on the server (`seen:<userId>`), with a browser fallback if the server is unreachable.
- The "About this screen" panel appears on every collection (the plugin API takes no per-collection list at build time); a collection with no note and no `collectionDefault` shows nothing inside it.
