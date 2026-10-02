# EmDash CMS trial (branch `emdash-trial`)

Started 2026-10-02. Trying Cloudflare's EmDash 1.1.0 on this portfolio. Nothing
here touches the live site: it deploys as its own Worker.

## What exists

| Thing | Value |
| --- | --- |
| Trial site | https://ncs-emdash-trial.nathanjnixon86.workers.dev |
| Admin | `/_emdash/admin` (first visit runs the setup wizard) |
| Worker | `ncs-emdash-trial` (live Worker `nixoncreativestudio` is untouched) |
| D1 database | `ncs-emdash` (id in `wrangler.jsonc`), binding `DB` |
| R2 bucket | `ncs-emdash-media`, binding `MEDIA` |
| Secret | `EMDASH_ENCRYPTION_KEY` on the Worker; local copy in `.env` (gitignored) |
| Files added | `src/worker.ts`, `src/live.config.ts`, EmDash block in `astro.config.mjs`, `wrangler.jsonc` rewritten |

## How it coexists with the site

The site stays `output: 'static'`; EmDash built fine that way and every existing
page still prerenders. Case studies, journal and photos remain Astro content
collections in git. EmDash does NOT import them (docs: "EmDash does not copy
file-based entries into its database"), so the CMS is empty until collections
are created in the admin and pages are changed to call `getEmDashCollection()`.

## Gotchas found

1. **zustand vs EmDash shim.** EmDash aliases `use-sync-external-store/shim/with-selector.js`
   to a shim with named exports only. `zustand` (via `@react-three/fiber`, the
   WebGL hero) default-imports it, so the build failed with `MISSING_EXPORT`.
   A small Vite plugin in `astro.config.mjs` (`ncs-zustand-sync-store-shim`)
   rewrites zustand's import. Re-check after upgrading emdash or zustand.
2. **Sessions.** The live site had `session: false`; EmDash sign-in then fails with "needs an Astro session driver". Removed it; the adapter now uses KV binding `SESSION` (namespace `ncs-emdash-sessions`).
3. The Cloudflare API MCP connector in Claude Code has an invalid token; all
   provisioning was done with the wrangler OAuth login instead.

## Deploy / redeploy

```
npm run build && npx wrangler deploy
```

## Status (2026-10-02)

- Setup wizard done, admin passkey registered, CLI logged in
  (`npx emdash login --url <trial url>`, device-code flow approved in the browser).
- The empty-site template shipped `pages` and `posts` collections. One test post
  (`hello-emdash`) was created from the CLI; `src/pages/emdash-test.astro`
  renders it server-side via `getEmDashCollection('posts')`. Delete both when
  the trial ends. Pages that read EmDash need `export const prerender = false`
  (the rest of the site stays prerendered).

## Open

- Decide whether the journal (or case studies) should move into EmDash. They
  are still MDX in git; EmDash does not import them.
- Custom domain: set `EMDASH_SITE_URL` first, or passkeys break.
