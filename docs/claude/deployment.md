# Deployment, environment variables, Coming Soon mode, security headers

Moved out of CLAUDE.md. Read when changing how the site deploys, adding or rotating an environment variable, using the coming-soon gate, or touching response headers.

## Deployment

- Production: pushes to `main` trigger a Cloudflare build and deploy that serves `nixoncreativestudio.com`.
- Previews: any other branch gets its own `*-nixoncreativestudio.nathanjnixon86.workers.dev` URL.
- Build command: `npm run build`. Output directory: `dist`.
- `output: 'server'` in `astro.config.mjs`: every page renders on the Worker per request and is cached by the route cache (the Workers Cache needs `cache.enabled`, which the adapter writes into the generated `dist/server/wrangler.json` because the cache provider is set; wrangler 4.69 or newer). Do not add `export const prerender = true` to a page without reading Gotcha 15: a prerendered page would show a stale copy of anything the CMS owns.
- The adapter is configured with `imageService: { build: 'compile', runtime: 'cloudflare-binding' }`: with nothing prerendered, `<Image />` resizes at request time through the Images binding (`/_image`, cached 30 days by `src/worker.ts`). Do not remove the binding: the adapter's default runtime image service points the HTML at a `/_image?...` endpoint that needs the Cloudflare Images binding, which left every case-study cover stuck on its blur-up placeholder in production. Build-time images need no binding.

### Environment variables

Set in the Cloudflare dashboard → **Settings → Variables and Secrets** (the Build section, not the Runtime section: `PUBLIC_*` values are inlined into the bundle at build time, even though pages render per request):

- `PUBLIC_WEB3FORMS_KEY` — contact form access key from [web3forms.com](https://web3forms.com/). Without it the contact form falls back to a no-op action: under `astro dev` it shows a developer note naming this variable; in any built copy (a branch or CI preview) it tells the visitor the form does not send there and gives the email address. Production must have it set in the BUILD variables, or the live form silently sends nothing.
- `PUBLIC_CF_ANALYTICS_TOKEN` — Cloudflare Web Analytics token from dash.cloudflare.com → Analytics & Logs → Web Analytics. Without it the analytics beacon doesn't render.
- `PUBLIC_GA_ID` — the GA4 web data stream Measurement ID (`G-...`) for property 532519109. Without it no GA4 script renders. The property went dark in 2026-06 because the Astro rebuild shipped without the tag; restored 2026-09-04. It was dark again by 2026-10-04: the component was in the repo but this variable was missing from the Workers Builds trigger, so no tag rendered. Set that day to `G-G7CBEEC293` through the Cloudflare API (`PATCH /builds/triggers/{trigger}/environment_variables`, which merges and leaves the other variables alone). To check it is alive, look for the Measurement ID in the live home page HTML; an absent ID means the build variable is gone.
- `PUBLIC_COMING_SOON` — set to the literal string `true` to gate the entire site behind the coming-soon page (see below). Unset, or any other value, takes the site live.
- `PUBLIC_PREVIEW_TOKEN` — random secret string used by the gate's inline script to recognize your bypass. Required for the bypass to work; pick something long and unguessable. The token is inlined into shipped HTML at build time, so anyone viewing source can see it — soft gate, not security.

All four are documented in `.env.example`; copy to `.env` and fill in real values for local dev.

### Coming Soon mode

Site-wide WIP gate controlled by `PUBLIC_COMING_SOON`, enforced client-side via a synchronous inline script in BaseLayout's `<head>`. When the env var is `true` at build time, every page ships with both the real content and a `ComingSoon` overlay; the gate script decides which the visitor sees by toggling `html.ncs-gated` before first paint based on a `localStorage["ncs-preview"]` value or a `?preview=<TOKEN>` URL param.

`/coming-soon/` itself is always live regardless of the gate — it's a standalone page with its own minimal HTML doc that doesn't go through BaseLayout, so it can be previewed without flipping anything.

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

### Security headers

`public/_headers` ships with the deploy. Five site-wide headers Cloudflare applies to every route:

- `Strict-Transport-Security` (HSTS, one year, includeSubDomains)
- `X-Frame-Options: DENY` (clickjacking)
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Cross-Origin-Opener-Policy: same-origin`

Content-Security-Policy is intentionally not included; doing it right requires testing because of the external Cloudflare beacon and the Web3Forms POST endpoint.
