# Gotchas

Moved out of CLAUDE.md (the index lives there).

Things that cost real time, with the reason attached. Add to the list when
something bites; a gotcha written a week later is a gotcha written from memory.
Every entry below was measured, not assumed.

1. **`npm run lint` is green and gated (since 2026-09-06), so a red run is
   your change.** The 7 false-positive errors that used to sit on a clean tree
   (an `eslint-plugin-astro` misread of `<!-- -->` inside a `{ ... }`
   expression) are gone because those comments became `{/* */}`. Writing an
   HTML comment inside a template expression brings the error back, and it
   breaks `npm run format:check` too. The only expected output is a handful
   of unused-variable warnings.

2. **`variant="secondary"` on the shadcn Button or Badge fails contrast.** In
   light mode that renders `--secondary-foreground` (white) on `--secondary`
   (sky blue `#40AAED`): **2.56:1**, well under the 4.5:1 the rest of this site
   holds. It is not a live defect only because the variant is unused across the
   entire codebase. The day you reach for it, either fix the token pair or use
   a different variant, and add the pair to `src/lib/theme-tokens.test.ts`.
   Dark mode is fine (navy on lighter sky, 9.8:1).

3. **The `--link` comment in `globals.css` overclaims.** It says AA on
   `#FFFFFF`, `#F4F7FA` **and** `#0A1628`. The first two are true (5.25:1 and
   4.88:1); navy is **3.45:1** and fails body text. Harmless today because the
   pair is never rendered (the navy Footer is a dark-mode state, where the link
   colour switches to `--secondary`), but do not trust the comment as a licence
   to put `text-link` on a navy surface. Logged in `docs/PENDING.md`.

4. **The live site does two redirect hops, so uptime checks need `-L`.**
   `www.nixoncreativestudio.com` 301s to the apex (the canonical host since
   2026-10-03), and `…/about` 307s to `/about/`. A curl check copied from a sibling repo that asserts a literal
   `200` without following redirects fails **every** route and reads like an
   outage. `.github/workflows/uptime.yml` uses `curl -sSL` and trailing slashes
   for this reason.

5. **The parity harness needs no site-specific normalizer rules here, and that
   was measured.** Despite the three.js / r3f content and the pre-build asset
   generation (`placeholders`, `og:pages`), three builds (a warm rebuild and a
   fully cold one with `dist`, `.astro` and `node_modules/.astro` deleted) all
   produced 23/23 PASS. The r3f content ships as an `<astro-island>` and
   hydrates in the browser, so no canvas output ever reaches the compared HTML.
   Do not add a speculative normalizer rule: a rule that strips more than the
   varying value is a hole in the gate, not a fix.

6. **`npm run build` now kills stale dev servers first.** The `prebuild` hook
   runs `scripts/free-dist.mjs`, which stops any `node.exe` / `workerd.exe`
   whose command line mentions **both** this project directory **and** a dev
   server (wrangler / miniflare / http-server / astro preview). It exists
   because a running `wrangler dev` holds a handle on `dist/` and the next
   build dies with `EPERM, Permission denied: \\?\...\dist\client`, which reads
   like a permissions problem and is not. Windows only; it no-ops on CI.

7. **`dist/server/wrangler.json` carries `legacy_env: true`.** The adapter
   writes it on every build, and wrangler 4.126+ rejects that field outright.
   Latent rather than live, because `npm run deploy` runs a plain
   `wrangler deploy` against the **root** `wrangler.jsonc`, which has no such
   field. It becomes a real failure if anything ever points wrangler at the
   generated config while `wrangler` (declared `^4.94.0`) has resolved past
   4.126. See `docs/PENDING.md`.

8. **Unit tests import `.ts` with the extension.** They run under Node's native
   type stripping (`node --experimental-strip-types --test`), so
   `import { contrastRatio } from './contrast.ts'` is correct and
   `from './contrast'` will not resolve. Same reasoning as the
   `with { type: 'json' }` note in `.claude/rules/testing-ci.md`: the test runner is Node, not Vite.

9. **`npx lhci autorun` does not complete on this Windows machine.** It reaches
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

10. **An entrance animation that starts at `opacity: 0` destroys Largest
    Contentful Paint.** Chrome does not count a zero-opacity element as a
    contentful paint, so whatever is on the first screen simply does not exist
    for LCP until the fade has run. Two shapes of this cost a red Lighthouse
    gate on 2026-09-06: the JS-gated `[data-reveal]` state pushed `/contact` to
    LCP 5.8s (the h1 painted 1.65s after first paint) and `/404` to a similar
    miss, and `/coming-soon`, whose whole entrance was a CSS fade, produced no
    LCP value at all ("audit did not produce a value"), which also voids the
    whole performance category. The rule is: nothing in the first viewport may
    start at opacity 0. Below-the-fold reveals are fine, a translate-only lift
    is fine, and `globals.css` now exempts the first block of `<main>` from the
    reveal gate. Do not "fix" this by animating from `opacity: 0.01`; that
    fakes the metric without the visitor seeing anything sooner.

11. **WebKit drops `box-shadow` on natively rendered form controls, so a
    Tailwind `focus:ring-*` is invisible on a `<select>` in Safari and on iOS.**
    The four selects on `/contact` had no focus ring at all there while every
    text field on the same classes did; the select does enter `:focus` (this is
    not a harness artifact, confirmed by screenshot in a real WebKit), the
    engine just never paints the shadow. `outline` paints on native controls in
    every engine and follows the border radius, so selects carry their ring as
    an outline. The webkit-iphone project of `tests/a11y-dark.spec.ts` is what
    caught it; if a sibling repo "fixed" the same failure by skipping the check
    on webkit, that repo probably still ships the bug.
