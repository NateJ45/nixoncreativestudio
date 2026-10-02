---
description: Run a clean production build and verify tests and linting pass
---

Use this any time you want to confirm the site compiles cleanly from scratch, or before pushing a change to production.

1. **Check for uncommitted work first.** Run `git status -sb`. If the tree is dirty and you're about to push, pause and confirm whether those changes should go out with this build.

2. **Run the full build chain:**

   ```sh
   npm run build
   ```

   A `prebuild` hook first stops any stale dev server holding `dist/` (`scripts/free-dist.mjs`). Then the build runs `npm run placeholders` (generates `src/lib/coverPlaceholders.json` from case study cover images), `npm run og:pages` (per-page Open Graph cards into `public/og/`), and `astro build` (compiles every page to static HTML in `dist/`). All three must succeed.

3. **Run tests:**

   ```sh
   npm run test:unit
   ```

   This runs the `src/lib/*.test.ts` unit suites with Node's built-in test runner. `npm test` runs the Playwright suites in `tests/` (smoke, axe in both themes, reflow); it builds and serves `dist/client` itself, so it takes longer.

4. **Run the linter:**

   ```sh
   npm run lint
   ```

   Covers `src/**/*.{ts,tsx,astro}` and `scripts/**/*.mjs`. Fix any errors before shipping. To auto-fix what ESLint can fix on its own: `npm run lint:fix`.

5. The quick gate is one command:
   ```sh
   npm run check
   ```
   `check` runs `astro check` plus lint. `npm run check:full` adds the unit tests and the build. If it exits clean, the site is ready to push.

---

**Common build failures and where to look:**

- **Placeholders step fails**: usually a malformed image in `src/assets/case-studies/` or a missing cover for a case study whose .mdx `cover` frontmatter points at a file that doesn't exist. Check the error path.
- **Astro build fails on a content collection entry**: a frontmatter field is missing or the wrong type. Check `src/content.config.ts` for the expected schema.
- **Type errors in strict mode**: `astro build` does not type-check; `npm run check` does. Any `any` or missing type annotation can surface there even if the dev server and the build were happy.

After a successful build, `dist/` holds the production output. Cloudflare Pages picks this up on the next push to `main` (build command: `npm run build`, output directory: `dist`).
