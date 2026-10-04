# Gotchas (full text)

Moved out of CLAUDE.md. CLAUDE.md keeps a one-line index of every gotcha by number; this file holds the full text. Code comments and docs cite these by number ("Gotcha 15"), so keep the numbers stable and add new ones at the end. Read the entry before touching anything its index line mentions.

## Gotchas

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

2. **Retired 2026-10-04: `variant="secondary"` used to fail contrast.** It
   rendered white on the old sky blue (2.56:1). Since the redesign
   `--secondary` is the sunk paper with ink text (13.96:1), asserted in
   `src/lib/theme-tokens.test.ts`, so the variant is safe to use.

3. **Retired 2026-10-04: the `--link` comment overclaimed AA on navy.** The
   redesign replaced the palette: `--link` is brick on paper (7.23:1) and the
   `.on-ink` scope switches it to vermilion on ink (7.07:1); both are asserted
   in `src/lib/theme-tokens.test.ts`.

4. **The live site does two redirect hops, so uptime checks need `-L`.**
   `nixoncreativestudio.com` 301s to `www.`, and `www.…/about` 307s to
   `/about/`. A curl check copied from a sibling repo that asserts a literal
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
   `with { type: 'json' }` note above: the test runner is Node, not Vite.

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
    an outline. The webkit-iphone project of the dark-mode axe spec (since folded
    into `tests/a11y.spec.ts`, dark mode was retired in 2026) is what
    caught it; if a sibling repo "fixed" the same failure by skipping the check
    on webkit, that repo probably still ships the bug.

12. **`dist/client` is not the site, it is only the assets.** Since the EmDash
    migration pages are rendered from D1 + R2 by the Worker (hybrid until
    CMS-DESIGN PR 2, now every page: nothing is prerendered). Anything that assumed a static tree is wrong for them:
    `http-server dist/client` (404s on `/`), a linkinator crawl of `dist/client`
    (reports the server pages as broken), lhci `staticDistDir`, and the parity
    harness's default mode. Playwright, the link check and Lighthouse therefore
    all take a URL (`PLAYWRIGHT_BASE_URL`, `LINKCHECK_URL`, `LHCI_BASE_URL`);
    CI supplies a Worker version preview and Nathan supplies the ncs-ci URL by
    hand. A local `wrangler dev` cannot stand in: it starts with an empty local
    D1/R2, so every server page renders with no content (`--remote` would read
    the live bindings, which a test run should not). If a tool "finds nothing"
    or 404s on `/`, check which tree it is reading before debugging the page.

13. **The OG generator reads public pages, not the EmDash REST API.**
    `GET /_emdash/api/content/case_studies` answers 401 to an anonymous caller,
    so `scripts/generate-og.mjs` takes slugs and titles from `/rss.xml` and the
    cover from the first `<img>` on `/work/<slug>/`. If those pages change shape
    (the cover stops being the first image on the page, a title leaves the feed),
    the script warns and keeps the committed cards rather than failing, so the
    symptom is stale cards, not a red build. Check the `[og]` lines in the build
    log after touching `/work/[slug]` or the RSS route.

14. **Lighthouse counts every request that starts before the observed LCP, so
    below-the-fold image downloads inflate the homepage LCP.** Measured
    2026-10-03 on the ncs-ci Worker (Lighthouse CLI mobile, simulated
    throttling, same method before and after): median LCP 6297ms with the six
    Selected Work screenshots loading, 3586ms with just those requests blocked
    (`--blocked-url-patterns=*emdash*`). The LCP element was the hero phone image
    (115 KB, 891ms on the wire); the rest was the lazy-image pile-up. A native
    `loading="lazy"` image is NOT held back inside Chrome's lazy-load distance
    (1250px or more), and a phone's first screen plus the hero reaches that. So
    `ScrollShot` has a `defer` prop (used by `SelectedWork`): placeholder `src`,
    real URL in `data-defer-*`, promoted on scroll-into-view (no rootMargin) or
    3.5s after `load`, with a `<noscript>` real image. `HeroShowcase` follows the
    same logic: its next-site preload waits 2.5s after `load` (was 0.8s), and
    only the stage that is actually displayed (a `matchMedia` on the same lg
    breakpoint Hero.astro hides it with) downloads or cycles, because the hidden
    desktop cluster used to fetch its own captures on phones. When the homepage
    LCP regresses with no code change, look at what starts before the LCP in the
    trace before blaming the LCP element. Local Lighthouse on this Windows
    machine reads higher than CI in absolute terms (GPU start-up delays first
    paint by about a second), so compare before and after on the same machine,
    never against the CI number. The 2026 home rebuild hit the same wall: with the
    hero reel's neighbouring frames and the proof-sheet crops loading beside the
    start frame, local LCP was 2.66 s; parking them (`HeroReel` promotes after
    load, `home/DeferredPicture.astro` on scroll-in or 3.5 s) brought it to 1.98 s.

15. **The route cache is a second layer in front of the Worker, and it stores
    whatever a response asks for.** Added 2026-10-03 (CMS-DESIGN PR 2). The
    Cloudflare adapter's cache provider turns on Workers Cache
    (`cache.enabled` in the generated wrangler config); it works on workers.dev
    previews too, so `Cf-Cache-Status: MISS` then `HIT` on two GETs proves it.
    The cache is partitioned by Worker version, so every deploy starts cold, and
    the first visitor to a URL pays a render (about 1 to 1.6s on ncs-ci: cold
    isolate plus D1 reads) instead of the 90ms a static file took. Warm TTFB is
    about 80ms, below the static numbers. Traps, each one measured or read from
    source rather than assumed:
    - **No global `routeRules`.** The design sketch had `'/[...path]'`; it also
      matches `/_emdash/**`, and the adapter only stamps `no-store` on a response
      that has no cache lifetime, so admin and API responses would become
      cacheable. Pages opt in through `cachePublicPage()` in BaseLayout instead.
    - **A page is purged only by the tags it carries.** A new CMS reader that does
      not call `cache.set(cacheHint)` leaves its page uncached-by-tag: it expires
      on the lifetime (5 minutes), not on publish. `getCaseStudies(Astro.cache)`
      is the pattern. EmDash's publish route calls `cache.invalidate({ tags:
[collection, id] })`.
    - **Never cache a non-200.** The cache stores a 404 as happily as a 200, so a
      slug published after someone requested it would keep returning 404. Unknown
      slugs call `Astro.cache.set(false)`, and `src/worker.ts` forces
      `Cloudflare-CDN-Cache-Control: no-store` on anything that is not a clean 200
      or that sets a cookie. `?_edit` and `?_preview` URLs are never cached.
    - **`public/_headers` no longer reaches HTML.** It only applies to files the
      assets binding serves, and no HTML is a file now, so `src/worker.ts` adds
      the same five security headers to every HTML response outside `/_emdash`.
      Keep the two lists in step.
    - **Trailing slashes.** The static asset handler used to redirect `/about` to
      `/about/`; `src/worker.ts` does it now (301, skipping `/_*` and
      extension paths). `trailingSlash: 'always'` in astro.config was rejected
      because it would also redirect EmDash's `/_emdash/api/*` routes.
    - **`/404/` answers 200, an unknown URL answers 404**, both from the same
      page, because Lighthouse refuses 4xx pages and the gate audits that template.
    - **Purge on publish is proven on the live zone** (Nathan confirmed on 2026-10-03: an
      admin edit shows on the live site within seconds). The 5-minute lifetime is only the
      fallback for a missed purge; the editing guide says "within seconds, five minutes at
      worst". Raising `PAGE_MAX_AGE` to a day is now a free choice (docs/PENDING.md).

16. **EmDash does not enforce a limit on a repeater sub-field.** Verified in
    `node_modules/emdash/src/api/schemas/schema.ts` (1.1.0): a sub-field keeps
    only `slug`, `type`, `label`, `required` and `options`, so a `maxLength` on
    one is stripped silently. The per-row limits in docs/CMS-DESIGN.md (FAQ
    answers, process-step bodies) are labels and editing-guide text, not server
    rules; the component must tolerate a longer value. Repeater-level
    `minItems` / `maxItems` are enforced. `validateDef()` warns about each
    sub-field limit. Related: `titleField` and `commentsEnabled` cannot be sent
    when a collection is created, which is why `applyCollectionSchema` applies
    the settings in a second PUT after the fields.

17. **What the first real production load taught (2026-10-03, PRs 68 to 70).**
    Keep these in mind for any new field or any value you add to `cms/content`.
    (a) **Booleans are stored as 0/1**, so a stored `false` reads back `0`; the
    loader folds booleans before comparing and `src/lib/cms.ts` normalises them,
    and a new reader must do the same (`Boolean(d.in_hero)`, never `=== true`).
    (b) **Images come back without `src`** and with extra `meta` (blurhash,
    dominant colour), so the loader compares a stored image by its media `id`
    and `alt` only. (c) **A datetime field needs a full ISO timestamp**
    (`2026-10-03T00:00:00.000Z`); a bare `2026-10-03` is rejected with "Invalid
    input", so write ISO strings in `cms/content/*.json`. (d) **An existing
    optional field cannot be made required** (nor given a `maxLength`): the
    schema PUT fails with `FIELD_UPDATE_REQUIRES_MIGRATION`. Every field you add
    to a collection that already has entries must be optional and the page must
    enforce the rule itself (the Journal's required summary is enforced by
    `/journal/` leaving the entry out). `in_hero` and `hero_order` follow this.
    (e) **`supports` comes back without `"seo"`**: EmDash keeps the SEO panel as
    the `hasSeo` flag, so `cms/schema/case_studies.mjs` omits it from `supports`
    (listing it made the applier's comparison never read "unchanged") and the CI
    seed adds it back (`seedCollection`).
18. **Redirects are EmDash rows, edited in the admin.** The two retired URLs
    (`/now`, `/work/west-chester-preschool`) are rows in production EmDash
    (loaded 2026-10-03; `cms/content/redirects.json` is the committed record the
    loader and the CI seed use). Add, change or delete one in the admin under
    Redirects. EmDash's middleware applies them before a page renders (it matches
    with or without a trailing slash, and a destination with a `#fragment` is
    accepted). `astro.config.mjs` has NO `redirects` and `src/worker.ts` has no
    redirect code: a config redirect would shadow the row, and the temporary code
    fallback was deleted so a row removed in the admin really stops working.
19. **A prefetch is only worth anything if the browser may reuse it, and every
    internal link must already carry its trailing slash.** Measured 2026-10-03 on
    the live site with a real foreground browser (the strategy was viewport then;
    it is hover since 2026-10-04, so only links a visitor points at are fetched): Astro's viewport prefetch fired
    for every link, then the click fetched the page AGAIN (80 to 400ms per
    navigation, against about 5ms when pages were static files). Two causes.
    (a) The route cache sends the browser `Cache-Control: no-cache` and no ETag,
    so the prefetched copy can never be reused. `finalize()` in `src/worker.ts`
    now gives a clean cached 200 HTML page `public, max-age=120,
stale-while-revalidate=3600` for the browser only (the edge lifetime is
    untouched; the editor view, previews, cookies and `/_emdash` never qualify).
    A publish therefore reaches a returning browser within about 2 minutes, not
    instantly. (b) Menu and button links without a slash (`/about`) were
    prefetched, then 301-redirected by the Worker, then fetched again. Menu items
    go through `withTrailingSlash()` in `src/lib/cms.ts`; hardcoded links need the
    slash by hand. Also measured: after the 5-minute edge lifetime a page is still
    served instantly (`CF-Cache-Status: UPDATING`, 85ms) while it refreshes, so
    visitors only wait for a render on the first request per Cloudflare location
    after a deploy (about 0.4 to 1.3s, 22 D1 reads). A test of "cold" needs a
    cache-busting query string, not a repeat request.
20. **Cold renders are D1 round-trips, so the Worker is placed next to the
    database (Smart Placement, 2026-10-03).** A page render makes 11 to 26
    sequential D1 reads; with the Worker at the visitor's edge and D1 in ENAM
    each one paid the distance. `"placement": { "mode": "smart" }` in
    `wrangler.jsonc` (production and the `ci` environment) runs it near D1.
    Measured on ncs-ci with cache-busted GETs (18 requests per run, 3 to 4 runs per setting; script idea:
    `?cold=<random>` so the route cache cannot answer): average cold render
    about 815ms without placement, about 570ms with it (about 30% faster; run-to-run noise is about 100ms, so never trust one pair of runs). Cache hits never run the Worker,
    so they are unchanged. Check the `Cf-Placement` response header (`remote-DFW`
    when active); it needs some traffic after a deploy before it takes effect.
    Ruled out in the same pass: bundle size (19 MB, 4.9 MB gzip, but Worker
    startup is 21 ms, shown in the CI "Worker Startup Time" line), and the cache
    lifetime (stale pages are served instantly while they refresh). Also tried and
    dropped: starting the layout, header, footer and homepage reads together with
    `Promise.all` (3 runs: about 572ms against about 570ms, no gain, so the
    sequencing is inside EmDash, not in our components). The zone already has
    Tiered Cache, Smart Tiered Cache, HTTP/3, Early Hints, Brotli and 0-RTT on.
21. **Any admin write purges pages, and the next view of each purged page is a
    cold render (about 0.4 to 1.4s instead of about 35ms).** Found 2026-10-03:
    a Lighthouse trace on the live homepage showed LCP 960ms with 853ms of it
    waiting for the first byte, and a poll of `/`, `/about/` and `/work/` every
    15s showed all three flip from HIT to MISS at the same instant, twice. The
    Worker log (`observability` query grouped by `$metadata.trigger`) showed a
    content loader writing `POST /_emdash/api/menus/{primary,footer}/items` at
    that moment. Every page carries the menu tag, so one menu write clears the
    whole site; a case study edit clears `/`, `/work/` and its own page. Purges
    remove the entry, so stale-while-revalidate does not cover them. Practical
    rules: do not run `cms:load` or `cms:production-load` (or edit menus, site
    settings or case studies) right before showing the site to someone, and
    expect the first visitor to each page after a deploy or edit to pay the cold
    render. A "pages are slow" check must first confirm `CF-Cache-Status: HIT`
    on the page (poll it a few times, no cache-busting) before blaming code.
22. **There is no cache warm-up, and a GitHub Action cannot be one (tried and removed 2026-10-03).**
    A scheduled workflow that GETs every page every 5 minutes was built and
    merged (PR 78) to hide the cold first view after a deploy or an admin write
    (Gotcha 21). It never worked: Cloudflare Bot Fight Mode (zone setting
    `fight_mode: true`) answers GitHub's runners with a 403 "Just a moment..."
    managed challenge (header `cf-mitigated: challenge`) for every URL, so it could
    not even read the sitemap, and on the Free plan Bot Fight Mode cannot be
    exempted with a WAF skip rule. Nathan chose to remove it rather than turn bot
    protection off or add a second Worker. The same wall would stop `uptime.yml`
    if its `SITE_URL` variable were ever set (it asserts 200 and would get 403).
    If a warm-up is wanted later, the untested options are a small separate
    Worker with a cron trigger (requests from inside Cloudflare, not data-center
    traffic) or turning Bot Fight Mode off (a security decision for Nathan).
    Until then the rule in Gotcha 21 stands: do not edit or load content right
    before showing the site, and expect the first visit per page after a deploy
    to be cold.
23. **Mobile speed: how to measure it, what moved it, what did not (2026-10-03).**
    Measure with the Lighthouse CLI, not the DevTools tool (that one has no
    performance category): `npx lighthouse <url> --only-categories=performance
--form-factor=mobile --output=json --output-path=x.json --chrome-flags="--headless=new --no-sandbox"`
    (Slow 4G, 4x CPU: what PageSpeed Insights runs). It prints an EPERM temp
    cleanup error on Windows after writing the report (Gotcha 9); the JSON is
    fine. **One run proves nothing: the same page scores 88 to 98 run to run.**
    Take 3 to 6 and compare medians. Live homepage: before 84/86/90 (median 86,
    LCP 4.1s), after the phone-backdrop quality change 93/91/85/86/92/92 (median
    91.5, LCP 3.4s, page weight 720 to 584 KB). Still above Google's 2.5s "good"
    LCP, so do not sell it as top-tier on slow phones. What caused it: the LCP
    element is the first slide of the phone backdrop in the mobile hero
    (`HeroShowcase.astro`, `variant="phone"`), a tall capture; `PHONE_QUALITY`
    serves it at q=55 (117 KB to 65 KB, visually identical behind the faded
    copy). **Dead ends, so nobody retries them:** (a) the `/_image` resizer
    ignores `fit`, so `h=1700&fit=cover` scales the whole page down to 231x1700
    instead of cropping the top; (b) a small preview image swapped for the full
    one later would make the swap a new, later LCP candidate; (c) `ncs-ci` is a
    poor lab for this (median 95, no bot-detection script, fewer studies) and a
    branch of the production Worker gets no preview URL here, so confirm on
    production after merge; (d) the server is not the cause on mobile (TTFB 30 to
    40ms). Not yet tried: fewer React islands loaded on every page, the unused
    JavaScript (about 170ms), a lighter mobile hero design (Nathan's call).

24. **The `www` to apex redirect rule must leave `/_emdash/` AND `/_astro/`
    alone, or the admin breaks.** The zone Redirect Rule (Cloudflare dashboard,
    Rules, not in the repo) sends `www` to the apex with a 301 except for paths
    under `/_emdash/`, because the admin passkey is bound to `www`. The admin
    page itself is on `www`, but a plugin's admin script is an Astro island served
    from `/_astro/`, and a browser will not follow a cross-origin redirect for a
    module script. With only `/_emdash/` exempt the admin sat on "Loading
    EmDash..." with `Failed to fetch dynamically imported module .../PluginRegistry.*.js`
    in the console (2026-10-03, the day the studio-help plugin shipped). Fixed
    through the API (expression below); both prefixes are now exempt. If the rule
    is ever recreated or edited, keep both. Check: `curl -s -o /dev/null -w "%{http_code}"
https://www.nixoncreativestudio.com/_astro/<any chunk>.js` must be 200, while
    `https://www.nixoncreativestudio.com/about/` must still 301 to the apex.
    `(http.host eq "www.nixoncreativestudio.com" and not starts_with(http.request.uri.path, "/_emdash/") and not starts_with(http.request.uri.path, "/_astro/"))`

25. **Committed parity baselines and Markdown docs feed Tailwind's class scan.**
    Tailwind 4's automatic source detection skips only gitignored paths.
    `scripts/.parity/*.html` is committed HTML, and Markdown is scanned too, so
    every utility class named in an old baseline, `CLAUDE.md` or `docs/` kept
    its rule alive in the shipped stylesheet, and a rendered-HTML parity compare
    could pass because the baselines themselves fed the build. Found on FBCM
    2026-09-20; ported here 2026-10-03 (vault gotcha
    `committed-parity-baselines-feed-tailwind`). Fix in `src/styles/globals.css`,
    right after the Tailwind import: `@source not` for `../../scripts/.parity`,
    `../../docs`, `../../CLAUDE.md`, `../../README.md`, `../../PRODUCT.md`.
    Measured here: the main stylesheet dropped from 134,724 to 132,872 bytes
    (19 utility rules such as `.text-white`, `.bg-slate-900`, `.text-gray-600`,
    plus the unused color variables they pulled into `@layer theme`), and none of
    those classes appear in the rendered HTML of any public page. After a
    baseline recapture, rebuild and check the byte count does not move (it did
    not). Keep utility class names out of prose the scanner can see, or leave
    `docs/` excluded.

26. **In CSS, read the raw token (`var(--link)`), never the Tailwind alias
    (`var(--color-link)`).** `@theme inline` maps `--color-link: var(--link)`
    at `:root`, where the var() is resolved once and inherited as a value. A
    ground that re-scopes `--link` (`.on-ink`, `.ground-paper-contours`)
    changes what the `text-link` UTILITY reads (it inlines `var(--link)`),
    but not what `var(--color-link)` in a stylesheet reads. Found 2026-10-04:
    the whole ink footer rendered its headings and links in the paper-ground
    colours. All of `src/` was switched to the raw names in the same commit.

27. **Vite inlines assets under 4 KB into the CSS as base64.** The ground tiles
    (`src/assets/grounds/`, 0.5 to 3 KB) landed inside the render-blocking
    stylesheet, so the "attach after load" deferral did nothing for them and
    the CSS grew by about 7 KB. `astro.config.mjs` now sets
    `vite.build.assetsInlineLimit` to a function that returns `false` for that
    folder (2026-10-04). Check `dist/client/_astro/` for the files after a
    build if you add an asset that must stay a separate request.
