# PENDING.md

The open-patch and waiting-on-a-human queue for this repo. Created 2026-08-27
during the PORTS.md sync session (Card 15).

This is a **registry, not a changelog**. It is authoritative about what is
currently open, and it gets edited in the same commit as the thing it tracks.
When an item is done, delete the row. Do not append a "resolved" note and leave
it here; that turns the file into narrative and the next session stops trusting
it.

Read this file early in any session on this repo.

---

## Waiting on a human

### 1. Set the `SITE_URL` repo variable

**Blocks:** `.github/workflows/uptime.yml` (installed 2026-08-27, schedule ON).

Until the variable exists the workflow logs a warning and exits 0 on every
hourly run, so it is harmless but it is also not checking anything. Verified
unset 2026-08-27 (`gh variable list` returned nothing; `gh secret list` too).

```
gh variable set SITE_URL --body https://www.nixoncreativestudio.com
```

Use the **www** form with **no trailing slash**. The apex 301s to www, and the
workflow follows redirects, so the apex form also works; www just saves a hop
on every route.

Nothing else in this repo reads `SITE_URL`. The canonical site origin for the
build lives in `astro.config.mjs` (`site: 'https://nixoncreativestudio.com'`)
and is unrelated.

### 2. Decide what to do about the `--link` comment in `globals.css`

**File:** `src/styles/globals.css`, the `--link` declaration in `:root`
(and the matching paragraph under "Brand colors" in `CLAUDE.md`).

The comment reads `/* AA on #FFFFFF, #F4F7FA, and #0A1628 */`. Measured
2026-08-27:

| pair | ratio | AA body text (4.5:1) |
|---|---|---|
| `#2A6FB0` on `#FFFFFF` | 5.25:1 | pass |
| `#2A6FB0` on `#F4F7FA` | 4.88:1 | pass |
| `#2A6FB0` on `#0A1628` | **3.45:1** | **fail** |

The third claim is wrong. It is **not** a live accessibility defect: the pair
is not rendered anywhere. In light mode the Footer is a light `.band-themed`
surface, and the navy Footer is a dark-mode-only state where the link colour
switches to `--secondary` (`#7AC8F0`, 9.8:1 on navy). So this is a documentation
error, not a bug.

It is left for a human because `globals.css` is a "foundation, edit with care"
file per `CLAUDE.md`, and because there are two defensible fixes:

- **a)** Correct the comment to say AA on the two paper surfaces only. Zero
  risk, and the token keeps its current value.
- **b)** Darken `--link` until it genuinely clears 4.5:1 on navy too, making the
  comment true and giving a future navy-in-light-mode surface a safe link
  colour. This changes rendered colour on every page and needs an eye on it.

Option (a) is the recommendation. Whichever is chosen, add the navy pair to
`src/lib/theme-tokens.test.ts` afterwards so the claim is machine-checked from
then on.

---

## Open technical exposure (no human decision needed, just not done yet)

### 3. `react` / `react-dom` are on carets

PORTS.md Card 13. Both resolve to 19.2.6 today, but `package.json` declares
`^19.2.6` for each. The moment an install drags one of them forward
independently, the build dies inside workerd behind a wall of Miniflare stack
frames, with the real message (`Incompatible React versions`) buried **above**
the `MiniflareCoreError`. presacademy lost a session to exactly this on
2026-08-25.

The fix is to pin both **exact**, no caret. Not done here because it is a
lockfile-affecting change and this sync session deliberately made none. Do it
in its own commit, ideally alongside the next dependency bump.

### 4. `wrangler` is on a caret, and the generated config still carries
`legacy_env`

PORTS.md Card 14. `wrangler` is declared `^4.94.0` and resolves to 4.94.0.
`dist/server/wrangler.json`, which `@astrojs/cloudflare` 13.5.4 generates on
every build, contains `"legacy_env": true` (verified 2026-08-27). wrangler
4.126+ rejects that field outright.

This is latent rather than live: `npm run deploy` runs a plain `wrangler deploy`
against the **root** `wrangler.jsonc`, which has no `legacy_env`, so the
generated file's copy is not read on the current deploy path. It becomes live
the day either the caret resolves past 4.126 **and** something starts pointing
wrangler at the generated config. Pin `wrangler` to `~4.94.0` if that day is
ever in doubt.

### 5. `scripts/with-workerd.mjs` is installed but not wired

PORTS.md Card 1. Deliberate. The wrapper exists to work around a workerd crash
that only happens on Astro 7 / `@astrojs/cloudflare` 14, where the prerender is
routed through `@cloudflare/vite-plugin`. This repo is Astro 6.3.7 / adapter
13.5.4, the crash does not occur, and the wrapper would be a no-op.

Wire it as part of the Astro 7 upgrade, not before:

```json
"build": "node scripts/with-workerd.mjs npm run placeholders && ..."
```

(the exact shape needs thought, because `build` here is a three-command chain).

---

## Deliberate absences (do not "fix" these)

These are recorded so a future session stops re-deriving them.

- **No Sanity, and therefore no Sanity cards.** This is a static marketing site
  with content in Astro content collections and MDX. PORTS.md Cards 4
  (sanity-lib), 5 (stale-types CI guard), 6 (nightly Sanity backup), 10
  (embedded-studio live preview) and 11 (preview click interceptor) have nothing
  to attach to here. There is no dataset to back up and no generated types file
  to go stale.
- **No page-builder.** Card 12 is a method for converting bespoke pages into
  CMS-driven sections. There is no CMS.
- **No Playwright / axe / reflow suite.** Card 8 is genuinely missing and is the
  largest real gap in this repo's gate chain. See `docs/TESTING.md` for what
  covers the ground today and what does not.
