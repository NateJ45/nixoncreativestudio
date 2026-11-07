# Gotchas

Moved out of CLAUDE.md (the index lives there).

Things that cost real time, with the reason attached. Add to the list when
something bites; a gotcha written a week later is a gotcha written from memory.
Every entry below was measured, not assumed.

Numbers are stable: other files and code comments cite them (Gotcha 9 is named
in the Lighthouse workflows and `lighthouserc.json`). Gotchas 2 and 3 were
about the shadcn Button and the old `--link` token, and were retired with
Tailwind and shadcn in the November 2026 redesign. Do not reuse their numbers.

1. **`npm run lint` is green and gated (since 2026-09-06), so a red run is
   your change.** The 7 false-positive errors that used to sit on a clean tree
   (an `eslint-plugin-astro` misread of `<!-- -->` inside a `{ ... }`
   expression) are gone because those comments became `{/* */}`. Writing an
   HTML comment inside a template expression brings the error back, and it
   breaks `npm run format:check` too. The only expected output is a handful
   of unused-variable warnings.

2. **The live site does two redirect hops, so uptime checks need `-L`.**
   `www.nixoncreativestudio.com` 301s to the apex (the canonical host since
   2026-10-03), and `…/about` 307s to `/about/`. A curl check copied from a sibling repo that asserts a literal
   `200` without following redirects fails **every** route and reads like an
   outage. `.github/workflows/uptime.yml` uses `curl -sSL` and trailing slashes
   for this reason.

3. **The parity harness needs no site-specific normalizer rules, but its
   committed baselines predate the redesign.** Determinism was measured on
   install (a warm rebuild and a fully cold one gave identical output), so do
   not add a speculative normalizer rule: a rule that strips more than the
   varying value is a hole in the gate, not a fix. The baselines in
   `scripts/.parity/` came from the old front end, so `npm run parity compare`
   fails on every page until `capture` is run on a good build of the new one
   and the result is committed.

4. **`npm run build` now kills stale dev servers first.** The `prebuild` hook
   runs `scripts/free-dist.mjs`, which stops any `node.exe` / `workerd.exe`
   whose command line mentions **both** this project directory **and** a dev
   server (wrangler / miniflare / http-server / astro preview). It exists
   because a running `wrangler dev` holds a handle on `dist/` and the next
   build dies with `EPERM, Permission denied: \\?\...\dist\client`, which reads
   like a permissions problem and is not. Windows only; it no-ops on CI.

5. **`dist/server/wrangler.json` carries `legacy_env: true`.** The adapter
   writes it on every build, and wrangler 4.126+ rejects that field outright.
   Latent rather than live, because `npm run deploy` runs a plain
   `wrangler deploy` against the **root** `wrangler.jsonc`, which has no such
   field. It becomes a real failure if anything ever points wrangler at the
   generated config while `wrangler` has resolved past 4.126. See
   `docs/PENDING.md`.

6. **Unit tests import `.ts` with the extension.** They run under Node's native
   type stripping (`node --experimental-strip-types --test`), so
   `import { contrastRatio } from './contrast.ts'` is correct and
   `from './contrast'` will not resolve. The test runner is Node, not Vite.

7. **`npx lhci autorun` does not complete on this Windows machine.** It reaches
   "Healthcheck passed", collects the Accessibility artifact, and then dies
   during Chrome-profile cleanup:
   `Runtime error encountered: EPERM, Permission denied:
\\?\C:\Users\...\AppData\Local\Temp\lighthouse.NNNNNNNN`, preceded by a
   `taskkill ... process not found` from the Chrome launcher. Reproduced twice
   on 2026-08-27, including after clearing every stale `lighthouse.*` temp
   directory, so it is not a leftover-handle problem. It fails at **collect**
   time, before a single assertion is evaluated, which means a local red here
   says nothing about the accessibility gate. `lighthouse.yml` runs on
   `ubuntu-latest` and is unaffected. Read the CI run, not the local one.

8. **An entrance animation that starts at `opacity: 0` destroys Largest
   Contentful Paint.** Chrome does not count a zero-opacity element as a
   contentful paint, so whatever is on the first screen simply does not exist
   for LCP until the fade has run. Two shapes of this cost a red Lighthouse
   gate on 2026-09-06: a JS-gated reveal pushed `/contact` to LCP 5.8s, and
   `/coming-soon`, whose whole entrance was a CSS fade, produced no LCP value
   at all ("audit did not produce a value"), which also voids the whole
   performance category. The rule is: nothing in the first viewport may start
   at opacity 0. Below-the-fold reveals are fine, and a translate-only lift is
   fine. Do not "fix" this by animating from `opacity: 0.01`; that fakes the
   metric without the visitor seeing anything sooner.

   **The one deliberate exception is the H1's words.** In the deal design each
   word (`.w`) starts at opacity .02 with a blur and rises in, which does
   paint, so the headline still counts for LCP. The small `.me` portrait in the
   home headline starts the same way and is exempt in
   `tests/first-viewport.spec.ts`. Nothing else gets this: the study blocks
   (`.rv`) are hidden only below the fold and only once `study.js` has added
   `rv-on`, and a first-viewport image or video never takes it.

   Two older lessons still apply. A wrapper, island or fixed-position helper
   placed ahead of the page's first section can push the real content out of
   what the page treats as the first block (the case-study reading bar once cost
   LCP 6.1 to 6.4s this way, 2026-10-13); keep `<main>` starting on the page's
   real content. And a sideways reveal that starts off to the side can widen
   the document (`/services` was 328px wide at a 320px viewport until its card
   scrolled in): `html` and `body` carry `overflow-x: clip` as a guard, and `tests/reflow.spec.ts` measures every route
   unscrolled and while scrolling, because `settle()` force-reveals everything
   and hides it.

9. **WebKit drops `box-shadow` on natively rendered form controls, so a
   shadow-based focus ring is invisible on a `<select>` in Safari and on iOS.**
   The contact form's timeline and "how did you hear" selects entered `:focus`
   but never painted the shadow (confirmed by screenshot in a real WebKit).
   `outline` paints on native controls in every engine and follows the border
   radius, so the form's fields carry their focus ring as an outline
   (`.f:focus` in `src/styles/pages/start.css`, with `box-shadow: none`). A
   future field style must keep the ring an outline. The old dark-mode
   accessibility spec that caught this is gone; the WebKit iPhone project of
   `tests/a11y.spec.ts` and a manual Tab pass on /contact are what check it now.
