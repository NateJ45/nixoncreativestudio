// Site-owned contrast and token gate for the overhaul's type and surface layer
// (package 1.5, 2026-10-31).
//
// WHY A SECOND FILE
// src/lib/theme-tokens.test.ts is PORTABLE (canonical in the starter, checked
// by sync-check), so this site may not add pairs to it. Every NEW rendered
// pair goes here instead: the surface roles (--paper, --ink, --line-strong,
// --live), the .band-ink re-scope, and a few structural promises the design
// system makes (the display face, the wordmark face, no capitals on headings,
// forced-colors borders). theme-tokens.test.ts keeps checking the older
// shadcn pairs, so both files run under `npm run test:unit`.
//
// It reads src/styles/globals.css as text, brace-matching each top-level
// block, and measures with src/lib/contrast.ts (imported, never edited).
//
// DELIBERATE NON-ASSERTIONS
//   - --line and --frame-ring. Decorative hairlines and rings (SC 1.4.11
//     exempts decoration); a line that must be seen uses --line-strong,
//     which IS asserted at 3:1.
//   - --live as body text in dark mode is asserted; in light mode it is the
//     darkened amber #a85d00, asserted as text too, so "Live" can be a word
//     and not only a dot.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrastRatio, AA_BODY_TEXT, AA_NON_TEXT } from './contrast.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const css = readFileSync(resolve(ROOT, 'src/styles/globals.css'), 'utf8');

/** The body of the first top-level `<selector> {` block, brace-matched. */
function blockBody(selector: string): string {
  const open = css.indexOf(`\n${selector} {`);
  assert.ok(open !== -1, `globals.css has no top-level "${selector} {" block`);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) return css.slice(open, i);
  }
  throw new Error(`"${selector} {" block in globals.css is unbalanced`);
}

/** Hex custom properties declared in a block. */
function hexTokens(selector: string): Record<string, string> {
  const tokens: Record<string, string> = {};
  for (const m of blockBody(selector).matchAll(/--([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    tokens[m[1]] = m[2];
  }
  return tokens;
}

const LIGHT = hexTokens(':root');
const DARK = hexTokens('.dark');
const INK = hexTokens('.band-ink');

/** A token from the given blocks, first match wins; fails loudly if absent. */
function hex(name: string, ...blocks: Record<string, string>[]): string {
  for (const b of blocks) if (b[name]) return b[name];
  assert.fail(`no hex --${name} in the expected globals.css block`);
}

type Pair = [fg: string, bg: string, note: string];

function checkPairs(
  label: string,
  fgBlocks: Record<string, string>[],
  bgBlocks: Record<string, string>[],
  pairs: Pair[],
  min: number,
): void {
  for (const [fg, bg, note] of pairs) {
    test(`${label}: --${fg} on --${bg} clears ${min}:1 (${note})`, () => {
      const f = hex(fg, ...fgBlocks);
      const b = hex(bg, ...bgBlocks);
      const ratio = contrastRatio(f, b);
      assert.ok(
        ratio >= min,
        `${label} --${fg} (${f}) on --${bg} (${b}) is ${ratio}:1, needs ${min}:1`,
      );
    });
  }
}

// ---------------------------------------------------------------------------
// White and paper surfaces, per theme.
// ---------------------------------------------------------------------------

const SURFACE_TEXT: Pair[] = [
  ['foreground', 'paper', 'body copy on paper'],
  ['heading', 'paper', 'headings on paper'],
  ['muted-foreground', 'paper', 'meta and rail labels on paper'],
  ['link', 'paper', 'links on paper'],
  ['live', 'background', 'the "live" marker on white'],
  ['live', 'paper', 'the "live" marker on paper'],
];
const SURFACE_NON_TEXT: Pair[] = [
  ['line-strong', 'background', 'frame dots and control edges on white'],
  ['line-strong', 'paper', 'frame dots and control edges on paper'],
  ['ring', 'paper', 'focus ring on paper'],
  ['accent', 'paper', 'the CTA pill edge on paper'],
];

checkPairs('light', [LIGHT], [LIGHT], SURFACE_TEXT, AA_BODY_TEXT);
checkPairs('light', [LIGHT], [LIGHT], SURFACE_NON_TEXT, AA_NON_TEXT);
checkPairs('dark', [DARK, LIGHT], [DARK, LIGHT], SURFACE_TEXT, AA_BODY_TEXT);
checkPairs('dark', [DARK, LIGHT], [DARK, LIGHT], SURFACE_NON_TEXT, AA_NON_TEXT);

// ---------------------------------------------------------------------------
// .band-ink. Its text roles are re-scoped inside the band; its surface comes
// from --ink / --ink-raised in whichever theme is active, so every pair is
// checked against BOTH themes' ink.
// ---------------------------------------------------------------------------

const INK_TEXT: Pair[] = [
  ['heading', 'ink', 'headings on the ink band'],
  ['foreground', 'ink', 'body copy on the ink band'],
  ['link', 'ink', 'links on the ink band'],
  ['muted-foreground', 'ink', 'meta copy on the ink band'],
  ['heading', 'ink-raised', 'headings on a raised ink panel'],
  ['foreground', 'ink-raised', 'body copy on a raised ink panel'],
  ['link', 'ink-raised', 'links on a raised ink panel'],
  ['muted-foreground', 'ink-raised', 'meta copy on a raised ink panel'],
];
const INK_NON_TEXT: Pair[] = [
  ['ring', 'ink', 'focus ring on the ink band'],
  ['accent', 'ink', 'the CTA pill edge on the ink band'],
  ['line-strong', 'ink', 'a visible hairline on the ink band'],
];

for (const [mode, block] of [
  ['light', LIGHT],
  ['dark', DARK],
] as const) {
  checkPairs(`${mode} .band-ink`, [INK], [block, LIGHT], INK_TEXT, AA_BODY_TEXT);
  checkPairs(`${mode} .band-ink`, [INK], [block, LIGHT], INK_NON_TEXT, AA_NON_TEXT);
}

// ---------------------------------------------------------------------------
// The footer (overhaul package 2.1). The whole footer is a .band-ink block in
// BOTH themes: the closer H2 and its line, the column links, the muted
// sector labels, blurb and utility row, the Pause motion switch (link-coloured
// text on a --line-strong edge) and the amber booking dot. The text roles come
// from the .band-ink re-scope; --live is not re-scoped, so the dot is the
// active theme's amber on ink, held to 3:1 as a non-text mark.
// ---------------------------------------------------------------------------

const FOOTER_TEXT: Pair[] = [
  ['heading', 'ink', 'the closer H2 and the column headings'],
  ['foreground', 'ink', 'the closer line and the address'],
  ['link', 'ink', 'footer links, the closer email and the Pause motion label'],
  ['muted-foreground', 'ink', 'sector labels, the Currently blurb and the utility row'],
];
const FOOTER_NON_TEXT: Pair[] = [
  ['live', 'ink', 'the amber booking dot'],
  ['line-strong', 'ink', 'the Pause motion and booking chip edges'],
  ['ring', 'ink', 'focus rings in the footer'],
];

for (const [mode, block] of [
  ['light', LIGHT],
  ['dark', DARK],
] as const) {
  checkPairs(`${mode} footer`, [INK, block, LIGHT], [block, LIGHT], FOOTER_TEXT, AA_BODY_TEXT);
  checkPairs(`${mode} footer`, [INK, block, LIGHT], [block, LIGHT], FOOTER_NON_TEXT, AA_NON_TEXT);
}

// The mobile menu sheet sits on --paper (light paper, ink navy in dark), with
// the page's own text roles; its booking dot is --live on paper.
for (const [mode, blocks] of [
  ['light', [LIGHT]],
  ['dark', [DARK, LIGHT]],
] as const) {
  checkPairs(
    `${mode} mobile sheet`,
    [...blocks],
    [...blocks],
    [
      ['heading', 'paper', 'the big nav links'],
      ['link', 'paper', 'the email'],
      ['muted-foreground', 'paper', 'the booking line'],
    ],
    AA_BODY_TEXT,
  );
  checkPairs(
    `${mode} mobile sheet`,
    [...blocks],
    [...blocks],
    [
      ['live', 'paper', 'the amber booking dot'],
      ['line-strong', 'paper', 'the Pause motion edge'],
    ],
    AA_NON_TEXT,
  );
}

test('.band-ink: the button text clears AA on the re-scoped accent', () => {
  const ratio = contrastRatio(hex('accent-foreground', INK), hex('accent', INK));
  assert.ok(ratio >= AA_BODY_TEXT, `accent-foreground on accent inside .band-ink is ${ratio}:1`);
});

// ---------------------------------------------------------------------------
// Structural promises of the type layer.
// ---------------------------------------------------------------------------

const theme = blockBody('@theme');

test('the display face is Bricolage, with its metric fallback named second', () => {
  const m = theme.match(/--font-display:\s*([^;]+);/);
  assert.ok(m, '@theme has no --font-display');
  const stack = m[1].replace(/\s+/g, ' ').trim();
  assert.match(stack, /^'Bricolage Grotesque Variable', 'Bricolage Grotesque Variable Fallback'/);
  const fallbacks = readFileSync(resolve(ROOT, 'src/styles/font-fallbacks.css'), 'utf8');
  assert.match(fallbacks, /font-family: 'Bricolage Grotesque Variable Fallback'/);
  const config = JSON.parse(readFileSync(resolve(ROOT, 'brand/brand.config.json'), 'utf8'));
  assert.equal(
    config.fonts.display.familyValue.replace(/"/g, "'"),
    stack,
    'brand.config.json fonts.display.familyValue drifted from --font-display',
  );
});

test('Bebas Neue is the wordmark face only', () => {
  assert.match(theme, /--font-wordmark:\s*'Bebas Neue', 'Bebas Neue Fallback'/);
  const display = theme.match(/--font-display:\s*([^;]+);/)?.[1] ?? '';
  assert.doesNotMatch(display, /Bebas/);
});

test('headings carry no text-transform (sentence case as written)', () => {
  const base = css.slice(css.indexOf('@layer base'), css.indexOf('5. Site-wide utility classes'));
  for (const m of base.matchAll(/\n\s*(h[1-6][^{]*)\{([^}]*)\}/g)) {
    assert.doesNotMatch(m[2], /text-transform/, `${m[1].trim()} sets text-transform`);
  }
});

test('h1 and h2 sit at 300, h3 at 650, and <b> inside a heading goes to 800', () => {
  assert.match(theme, /--text-h1--font-weight:\s*300;/);
  assert.match(theme, /--text-h2--font-weight:\s*300;/);
  assert.match(theme, /--text-h3--font-weight:\s*650;/);
  assert.match(css, /:is\(h1, h2, h3, h4, h5, h6[^)]*\) :is\(b, strong\) \{\s*font-weight: 800;/);
});

test('forced-colors mode gives frames, hairlines and the ink band a real border', () => {
  const at = css.indexOf('@media (forced-colors: active)');
  assert.ok(at !== -1, 'globals.css has no forced-colors block');
  const block = css.slice(at, css.indexOf('\n}\n', at));
  for (const sel of ['.frame', '.band-ink', '.hairline']) {
    assert.ok(block.includes(sel), `forced-colors block does not cover ${sel}`);
  }
  assert.match(block, /CanvasText/);
});
