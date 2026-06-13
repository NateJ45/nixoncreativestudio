// eslint.config.js — flat config (ESLint 9+)
// Minimal, low-noise ruleset: recommended bases only, with a few rules tuned
// so the existing codebase passes without mass-editing source files. Astro's
// processor creates virtual .ts paths from <script> blocks; the override
// blocks below keep those quiet too.

import tseslint from 'typescript-eslint';
import eslintPluginAstro from 'eslint-plugin-astro';

/** @type {import('eslint').Linter.Config[]} */
export default [
  // ── Global ignores ──────────────────────────────────────────────────────
  {
    ignores: [
      'dist/**',
      '.astro/**',
      '.wrangler/**',
      'node_modules/**',
      // Generated at build time by scripts/generate-placeholders.mjs.
      'src/lib/coverPlaceholders.json',
    ],
  },

  // ── TypeScript sources (ts/tsx and .mjs scripts) ────────────────────────
  // NOTE: the Astro processor creates virtual .ts paths like src/Foo.astro/*.ts.
  // These match src/**/*.ts, so the Astro override block below corrects rule
  // severity for those virtual paths.
  ...tseslint.configs.recommended.map((cfg) => ({
    ...cfg,
    files: ['src/**/*.{ts,tsx}', 'scripts/**/*.mjs'],
  })),

  // ── Rule overrides for TS/mjs (non-Astro virtual paths) ─────────────────
  {
    files: ['src/**/*.{ts,tsx}', 'scripts/**/*.mjs'],
    // Exclude Astro virtual paths — handled in the Astro override below.
    ignores: ['**/*.astro/**'],
    // Re-register the plugin so rule references resolve.
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      // 'any' shows up in a few intentionally-loose typed utilities.
      '@typescript-eslint/no-explicit-any': 'off',
      // Unused vars: relax to warn; leading-underscore vars are intentional skips.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Allow require() in .mjs scripts that call Node built-ins via CJS interop.
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // ── Astro sources ───────────────────────────────────────────────────────
  // eslint-plugin-astro ships its own parser; spread the full recommended
  // config array so the parser, processor, and rules all land correctly.
  ...eslintPluginAstro.configs.recommended,

  // Scope the Astro configs to .astro files only.
  {
    files: ['src/**/*.astro'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      // Astro imports are often template-only; the parser may not track usage
      // through the template — warn only.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // ── Astro virtual script paths (.astro/*.ts created by the processor) ────
  // These virtual files match src/**/*.ts but contain raw <script> content.
  {
    files: ['**/*.astro/**'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      // Astro <script> blocks use var for hoisting; cannot edit these files.
      'no-var': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
];
