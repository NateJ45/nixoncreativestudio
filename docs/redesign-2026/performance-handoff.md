# Performance hand-off for Nathan (2026-10-04)

The performance pass (branch `perf-pass`) did everything it could in code. Two things on production are not in the repo and can only change in the Cloudflare dashboard. Nothing here was changed by an agent: live dashboard and API writes are yours (CLAUDE.md never-break rule 18).

## What production loads that the repo does not control

A read-only fetch of `https://nixoncreativestudio.com/` on 2026-10-04 shows two Cloudflare scripts in the HTML:

| Script                                                                                                                                  | Where it comes from                                                                                                                                                                                                            | Can code remove it?                                                                                                                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `https://static.cloudflareinsights.com/beacon.min.js` (Web Analytics, about 7 KB)                                                       | **The repo.** `src/components/Analytics.astro` renders it because `PUBLIC_CF_ANALYTICS_TOKEN` is set in the Workers Builds environment.                                                                                        | Yes, and the pass already moved it: it now starts after the load event and an idle beat instead of as a deferred head script (`CloudflareBeacon.astro`). Measured locally with a dummy token, median of 5: home LCP 2015 to 1850 ms, /contact 1862 to 1558 ms. |
| `/cdn-cgi/challenge-platform/scripts/jsd/main.js`, inserted by an inline script that builds a hidden 1 px iframe at the end of `<body>` | **Cloudflare's edge**, rewriting the HTML as it passes through, because **Bot Fight Mode** is on for the zone (Gotcha 22). Bot Fight Mode always turns on JavaScript Detections; on the Free plan the two cannot be separated. | No. Nothing in `_headers`, `src/worker.ts` or BaseLayout adds it, and Bot Fight Mode cannot be skipped by rules.                                                                                                                                               |

The forensics pass (`C-performance-forensics.md`, production home, n=5) measured blocking the beacon and `jsd` together at **-467 ms LCP and +4 Lighthouse points**, and `jsd` alone is why production scores **82 on Best Practices** against 100 on the CI preview (it calls the deprecated `StorageType.persistent` API, which Lighthouse flags). The beacon half of that cost is fixed in code by this pass; the `jsd` half is the dashboard choice below.

## Your choices

### 1. Bot Fight Mode (this is the one that matters)

Dashboard: **nixoncreativestudio.com zone, Security, Settings, filter "Bot traffic", Bot fight mode.**

- **Turn it off** to remove `jsd/main.js` from every page. Expected: Best Practices back to 100 on production, and roughly the remaining part of the -467 ms the forensics pass measured (the beacon part is already gone). It also stops the 403 "Just a moment..." challenge that blocked GitHub's runners (Gotcha 22), so `uptime.yml` and any future warm-up job would work. What you give up: the free, uncustomisable bot challenge. The site has no login for the public, no checkout and no comment form; the contact form posts to Web3Forms with its own honeypot, and the admin is behind a passkey, so the exposure is small. This is a security trade-off and yours to make.
- **Keep it on** and accept the cost: Best Practices stays at 82 to 85 on production and the phone LCP carries the extra script. Nothing in code can change that.
- Not available on the Free plan: Super Bot Fight Mode (Pro and up) lets you turn JavaScript Detections off separately while keeping bot blocking.

### 2. Web Analytics automatic setup (check, probably nothing to do)

Dashboard: **Account home, Analytics & Logs, Web Analytics, nixoncreativestudio.com, Manage site.**

Production HTML today has exactly one beacon, the one the repo renders, so automatic injection looks off. Please confirm the site is set up for manual JS snippet installation, not automatic setup (the exact wording of the option changes between dashboard versions). If automatic injection were on as well, Cloudflare would add a second, early, head-injected beacon that undoes this pass's deferral. If you would rather not run Web Analytics at all, delete `PUBLIC_CF_ANALYTICS_TOKEN` from the Workers Builds variables and the beacon disappears on the next deploy (the Privacy page then over-describes; tell the next session to update it).

## How to check after you change something

1. After the next deploy, open the live home page, view source, and search for `challenge-platform` and `cloudflareinsights`. With Bot Fight Mode off, the first is gone; the second should appear only inside the small inline script near the top (`data-cf-beacon-config`).
2. Ask a session to run 5 Lighthouse mobile runs against production (BUILD-NOTES.md "Lighthouse") and compare the median with the forensics table: before, production home was 85 (LCP 3.96 s) with Best Practices 82.

## What an untested code-side option would be (not recommended)

Cloudflare documents that a `Cache-Control: no-transform` response header stops its proxy from rewriting a page (it is why automatic Web Analytics sometimes fails to inject). It might also stop the `jsd` injection, but it would also switch off every other edge rewrite and possibly compression, and it was not tested here because a test needs a production deploy. Do not try it without a measured preview.
