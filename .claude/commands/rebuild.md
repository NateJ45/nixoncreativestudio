---
description: Run a clean production build and verify tests and linting pass
---

Use this any time you want to confirm the site compiles cleanly from scratch, or before pushing a change to production.

1. **Check for uncommitted work first.** Run `git status -sb`. If the tree is dirty and you're about to push, pause and confirm whether those changes should go out with this build.

2. **Run the full build chain:**
   ```sh
   npm run build
   ```
   This runs two steps in sequence: `npm run placeholders` (generates `src/lib/coverPlaceholders.json` from case study cover images), then `astro build` (compiles every page to static HTML in `dist/`). Both must succeed.

3. **Run tests:**
   ```sh
   npm test
   ```
   Tests live in `src/lib/*.test.ts` and run directly with Node's built-in test runner. No test framework to install.

4. **Run the linter:**
   ```sh
   npm run lint
   ```
   Covers `src/**/*.{ts,tsx,astro}` and `scripts/**/*.mjs`. Fix any errors before shipping. To auto-fix what ESLint can fix on its own: `npm run lint:fix`.

5. Or run all three in one command:
   ```sh
   npm run check
   ```
   `check` chains lint, build, and test. If it exits clean, the site is ready to push.

---

**Common build failures and where to look:**

- **Placeholders step fails**: usually a malformed image in `src/assets/case-studies/` or a missing cover for a case study whose .mdx `cover` frontmatter points at a file that doesn't exist. Check the error path.
- **Astro build fails on a content collection entry**: a frontmatter field is missing or the wrong type. Check `src/content.config.ts` for the expected schema.
- **Type errors in strict mode**: `npm run build` runs the Astro type checker as part of the build. Any `any` or missing type annotation can surface here even if the dev server was happy.

After a successful build, `dist/` holds the production output. Cloudflare Pages picks this up on the next push to `main` (build command: `npm run build`, output directory: `dist`).
