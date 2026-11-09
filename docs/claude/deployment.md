# Deployment, environment variables, Coming Soon gate, security headers

Moved out of CLAUDE.md. Read when changing deploys, env vars, the Coming Soon gate or security headers.

- Production: pushes to `main` trigger a Cloudflare Workers Builds deploy (Worker `nixoncreativestudio`) that serves `nixoncreativestudio.com`. The apex is canonical; `www` 301s to it.
- Previews: any other branch gets its own `*-nixoncreativestudio.nathanjnixon86.workers.dev` URL.
- Build command: `npm run build`. Output directory: `dist`.
- Unknown URLs: `wrangler.jsonc` sets `assets.not_found_handling: "404-page"`, so a path with no file gets `dist/client/404.html` (from `src/pages/404.astro`) with a 404 status. Without it Cloudflare answers with an empty body, which is what the live site did until 2026-10-18.
- `output: 'static'` in `astro.config.mjs` prerenders every page to HTML at build time. The `@astrojs/cloudflare` adapter is installed but inert for static pages. To opt a single page into server rendering, add `export const prerender = false` in that page's frontmatter.
- The adapter is configured with `imageService: 'compile'` so any Astro-processed image (today the study `cover`, read through `getImage` for the share card and structured data) is optimized at build time with sharp. Do not remove this on a static build: the adapter's default runtime image service points the HTML at a `/_image?...` endpoint that needs the Cloudflare Images binding, which once left every case-study cover stuck on its blur-up placeholder in production. Build-time images need no binding. The pictures on the pages themselves (footage, stills, study images) are plain files in `public/assets/`, so they never touch the image service.

## Environment variables

Set in the Cloudflare dashboard → **Settings → Variables and Secrets** (the Build section, not the Runtime section, because pages are prerendered):

- `PUBLIC_CF_ANALYTICS_TOKEN`: Cloudflare Web Analytics token from dash.cloudflare.com → Analytics & Logs → Web Analytics. Without it the analytics beacon doesn't render.
- `PUBLIC_GA_ID`: the GA4 web data stream Measurement ID (`G-...`) for property 532519109. Without it no GA4 script renders. The property went dark in 2026-06 because the Astro rebuild shipped without the tag; restored 2026-09-04. The tag skips automated browsers (WebDriver, Lighthouse, PageSpeed, GTmetrix; starter PORTS card 96), so our own test sweeps never count as visitors. Site events (overhaul 4.1) come from `src/lib/track.ts` and only fire when that tag defined `gtag`; mark `generate_lead` as a key event in the GA4 admin (Admin > Events) so it counts as a conversion.
- `PUBLIC_COMING_SOON`: set to the literal string `true` to gate the entire site behind the coming-soon page (see below). Unset, or any other value, takes the site live.
- `PUBLIC_PREVIEW_TOKEN`: random secret string used by the gate's inline script to recognize your bypass. Required for the bypass to work; pick something long and unguessable. The token is inlined into shipped HTML at build time, so anyone viewing source can see it: a soft gate, not security.

All five are documented in `.env.example`; copy to `.env` and fill in real values for local dev.

## Coming Soon mode

Site-wide WIP gate controlled by `PUBLIC_COMING_SOON`, enforced client-side via a synchronous inline script in BaseLayout's `<head>`. When the env var is `true` at build time, every page ships with both the real content and a `ComingSoon` overlay; the gate script decides which the visitor sees by toggling `html.ncs-gated` before first paint based on a `localStorage["ncs-preview"]` value or a `?preview=<TOKEN>` URL param.

`/coming-soon/` itself is always live regardless of the gate: it's a standalone page with its own minimal HTML doc that doesn't go through BaseLayout, so it can be previewed without flipping anything.

The implementation history is worth knowing about: an earlier attempt put the gate in `functions/_middleware.js` (Cloudflare Pages Function), but the project deploys via the `@astrojs/cloudflare` adapter as a Worker with the assets binding, not as a plain Pages project, so `functions/` never fired. Client-side gating works regardless of the deploy mechanism.

**To enable the gate**: set `PUBLIC_COMING_SOON=true` and `PUBLIC_PREVIEW_TOKEN=<your-secret>` in the Cloudflare dashboard → Variables and Secrets. Trigger a redeploy. About a minute later every visitor to the site (except you, see below) sees the coming-soon view.

**To bypass on a device you own**: visit any URL with `?preview=<your-secret>` appended, e.g.

```
https://nixoncreativestudio.com/?preview=<your-secret>
```

The script saves the token to `localStorage["ncs-preview"]` and reloads the page without the query param. From then on, that browser bypasses the gate on every page.

**To revoke your own bypass**: clear localStorage for the site in your browser (or run `localStorage.removeItem('ncs-preview')` in DevTools).

**To rotate the token**: change `PUBLIC_PREVIEW_TOKEN` and redeploy. Any cached localStorage value stops matching; visit the bypass URL with the new token to re-enable.

**To take the site live**: change `PUBLIC_COMING_SOON` to any other value (or delete it entirely) and redeploy. The gate script and overlay don't ship at all, and `<meta name="robots" content="noindex">` is also removed.

**Soft gate, not security**. The real page HTML ships in source regardless of bypass state. Anyone who curls the URL or views source sees the full content; the `PUBLIC_PREVIEW_TOKEN` is also visible in the inlined gate script. For real auth, layer Cloudflare Access on top.

**Local dev**: with `PUBLIC_COMING_SOON=true` in `.env`, the gate works locally too. Without bypass it shows ComingSoon; with `?preview=<token>` you bypass like in prod. Unset `PUBLIC_COMING_SOON` (or set to false) to skip the gate entirely during local work.

## Security headers

`public/_redirects` holds real 301s: retired URLs with no live equivalent (`/work/cincy-table` and `/work/second-presbyterian-chicago`, both forms, to `/work/`) and the short names the nav no longer uses (`/prices` to `/services/`, `/start` to `/contact/`). Astro `redirects` in `astro.config.mjs` only emit a meta-refresh page (`/now` to `/about/`, `/work/west-chester-preschool` to `/work/`), so use `_redirects` when Search Console needs a true 301.

`public/_headers` ships with the deploy. Site-wide headers Cloudflare applies to every route:

- `Strict-Transport-Security` (HSTS, one year, includeSubDomains)
- `X-Frame-Options: DENY` (clickjacking)
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Cross-Origin-Opener-Policy: same-origin`
- `Permissions-Policy`: camera, microphone, location, payment, motion sensors, USB and Topics are switched off, because the site uses none of them. If a feature ever needs one, take it off the list in the same change.
- `Content-Security-Policy-Report-Only`: below.

### Content-Security-Policy

It ships **report-only**: the browser logs what it would have blocked and blocks nothing. There is no reporting endpoint, so reports only appear in a browser's console (and as `securitypolicyviolation` events).

Inline scripts and `<style>` blocks are allowed by sha256 hash. `public/_headers` holds two markers, and `scripts/write-csp.mjs` (a build step) fills them from the built pages in `dist/client`. So a new inline script is picked up by itself, and the production build's hashes include the GA snippet, whose text depends on `PUBLIC_GA_ID`. Style attributes need `style-src-attr 'unsafe-inline'`, because a client's colors arrive as `style="--c: ..."`.

From other hosts, the policy allows what the site really loads:

| Host                                                                 | For                                                                                   | Directives                                      |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `static.cloudflareinsights.com`, `cloudflareinsights.com`            | The Web Analytics beacon, and what it sends                                           | `script-src`, `connect-src`                     |
| `*.googletagmanager.com`                                             | GA4 (`gtag.js`)                                                                       | `script-src`, `img-src`, `connect-src`          |
| `*.google-analytics.com`, `*.analytics.google.com`, `www.google.com` | GA4 hits (the live report on 2026-11-07 showed some go to `www.google.com/g/collect`) | `img-src` (not `www.google.com`), `connect-src` |

The contact form needs no outside host: it posts (fetch or native) to the site's own `/api/contact/`, and the native post's redirect back to `/contact/?sent=1#sent` is same-origin too, so `connect-src` and `form-action` stay at `'self'`.

**What still reports on the live site.** Cloudflare injects an inline script at the end of some responses on the proxied zone, seen on the first page of a visit with no Cloudflare cookie yet (it starts `(function(){function c(){var b=a.contentDocument` and loads `/cdn-cgi/challenge-platform/scripts/jsd/main.js`). That is JavaScript Detections, part of its bot tools. It carries the request's ray ID, so its text and hash change on every response and no hash can allow it. Cloudflare's documented answer is a per-request nonce, which a static site cannot make. A fixed nonce in `_headers` would be published to everyone, so it would allow an attacker's inline script too. See `docs/PENDING.md` for the decision this leaves.

**How to go from report-only to enforcing.** Never rename the header untested.

1. Run `tests/csp.spec.ts` (it serves every route with the built policy as an ENFORCED header and fails on any violation). It runs in `npm test`, so a green CI run covers this.
2. On the live site, open Home, /work/, /services/, /churches/, a case study, the lean sector pages and /contact/ in a real browser, not an automated one (GA4 does not run in automated browsers), with the console open. Scroll each, play a window, open the client sheet and send a test through the form. Every line starting `[Report Only]` needs an answer. The Cloudflare script above is the one known line until its decision is made.
3. Wait a week or two after any change to analytics or Cloudflare settings, then repeat step 2.
4. In `public/_headers`, rename `Content-Security-Policy-Report-Only` to `Content-Security-Policy`, on a branch, and check the branch's `*.workers.dev` preview the same way.
5. After the deploy, check again that the contact form sends, that GA4's Realtime report sees the visit and that Web Analytics still counts. To back out quickly, rename the header back or roll back in the Deployments tab.

### Cache headers

`public/_headers` also sets caching by path:

- `/_astro/*`: one year, `immutable` (content-hashed build output).
- `/media/*`: one year, `immutable`. The interaction clips carry a content hash in the name (`npm run capture:clips`), so a re-recorded clip gets a new file.
- `/assets/*`: one month, revalidated after that. The footage, captures, study images and the font sit here under plain names, so they can change.

A changed file in `/assets/` can take up to a month to reach a returning visitor unless its name changes; rename it (or move it to `/media/` with a hash) when that matters.

## Cloudflare zone rules

Set in the dashboard (nixoncreativestudio.com, Rules, Redirect Rules), not in this repo. The API token cannot read them.

1. **Redirect www to apex**: `www` 301s to the apex. (It also carries an exclusion for `/_emdash/` and `/_astro/` from the EmDash period; EmDash was rolled back, so the exclusion does nothing now.)
2. **Slashless page paths 301 to trailing slash** (2026-10-26): on `nixoncreativestudio.com`, a GET or HEAD for a path with no trailing slash and no dot 301s to the same path plus `/`, keeping the query string. Without it, Workers static assets answer `/about` with a **307**, which Google treats as temporary, so the slashless URL can stay canonical in Search Console. It skips `/_emdash`, `/api/`, `/files/`, `/cdn-cgi/`, `/preview` and `/studio`, because those were Worker routes and a 301 would turn a POST into a GET. Nothing here is server-rendered today. **If you ever add an SSR route prefix, add it to the rule's exclusions.**

## Video and byte ranges

A static build deploys as assets only, and the adapter drops any Worker named in `wrangler.jsonc`. Static assets answer a Range request with a plain 200, and iPhones will not play a clip that way. So `scripts/add-video-worker.mjs`, the last step of `npm run build`, adds `src/worker.ts` to `dist/client/wrangler.json` with `run_worker_first` limited to `*.mp4` and `*.webm`. Everything else is still served as a plain asset. To check it live, request a clip with `Range: bytes=0-1` and expect a 206.

## Contact form (D1 + Cloudflare Email Sending)

The form posts to `/api/contact/`, handled by `src/contact-endpoint.ts` inside `src/worker.ts` (starter PORTS.md card 45). It is NOT an Astro route: an Astro server route would switch the static build to Astro's server layout and break `scripts/add-video-worker.mjs`, so the endpoint is one more `run_worker_first` path on the same small Worker. `src/lib/contact-submission.ts` and the migration are canonical starter copies; `src/lib/inquiry.ts` folds this form's extra fields into the message.

Order: **store, then notify**. Each inquiry is written to D1 `nixoncreativestudio-contact` first, then emailed through the `EMAIL` binding from `CONTACT_FROM` to `CONTACT_TO` (plain vars in `wrangler.jsonc`) with `Reply-To` set to the visitor. If that send fails, the Worker tries Web3Forms with the `WEB3FORMS_KEY` secret. A visitor gets success whenever the row was stored, even if no email went out, so **a 200 proves nothing; `notified = 1` does**. A `notified = 1` row whose `notify_error` starts `sent via web3forms; email failed:` was delivered by the fallback, and the rest of that text is why Email Sending refused it (also logged as a `[contact] email send failed` warning).

- **Read recent inquiries:** `npx wrangler d1 execute nixoncreativestudio-contact --remote --command "SELECT id, received_at, name, email, notified, notify_error FROM contact_submissions ORDER BY id DESC LIMIT 10"`. Any `notified = 0` row is an inquiry nobody was told about; read its `message` and reply by hand.
- **Sending domain:** `nixoncreativestudio.com` is onboarded for Email Sending (account > Email Service > Email Sending; `alerts.nixoncreativestudio.com` is onboarded separately for other alerts). Its bounce MX, SPF and DKIM sit on `cf-bounce` / `cf-bounce._domainkey`, so Google Workspace keeps the root MX. Onboarding offers a `_dmarc` `p=reject` record; the existing `p=quarantine` record with Cloudflare DMARC reports was kept instead, and there must only ever be one `_dmarc` record. The account is on Workers Paid, which Email Sending needs.
- **Fallback key:** `npx wrangler secret put WEB3FORMS_KEY` (the same Web3Forms access key the page used to carry as `PUBLIC_WEB3FORMS_KEY`, which nothing reads now).
- **Schema change:** edit `SUBMISSIONS_DDL` in the canonical lib in the starter first, `npm run contact:migration`, then `npx wrangler d1 migrations apply nixoncreativestudio-contact --remote`.
- **Local run:** `npm run build`, then `npx wrangler d1 execute nixoncreativestudio-contact --local -c dist/client/wrangler.json --file migrations/0001_contact_submissions.sql` (`migrations apply` looks for `migrations/` beside that config and finds none; local D1 lives under `dist/`, so a new build wipes it), then `npx wrangler dev -c dist/client/wrangler.json`. With no email transport the row lands with `notified = 0`, which is the expected local result.
